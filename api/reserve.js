/*
 * Called just before a buyer opens Paystack. It does two things:
 *  - refuses if the tickets are sold out (or fewer are left than they want), and
 *  - holds the tickets for 15 minutes so two people cannot pay for the last one.
 * It returns th e payment reference to use. If anything goes wrong on OUR side the
 * website carries on without a hold, so a fault here never stops a sale.
 */
import crypto from 'crypto';
import { getContent, getAvailability, createReservation, releaseReservation, ticketAdmits } from './_lib/store.js';
import { supabaseConfigured } from './_lib/supabase.js';
import { allow, clientIp } from './_lib/security.js';
import { reportError } from './_lib/monitor.js';
import { resolveCoupon, saleFields, sendTicketEmail, ticketNumberFor, cleanName, cleanPhone, siteOrigin } from './_lib/tickets.js';
import { recordSale } from './_lib/store.js';
import { normEmail, validEmail } from './_lib/team.js';

const newRef = () => 'GT-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
const soldMessage = (left) => (left <= 0 ? 'Sorry, this ticket has just sold out.' : 'Only ' + left + ' of these ' + (left === 1 ? 'ticket is' : 'tickets are') + ' left.');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed.' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (!(await allow('reserve', clientIp(req), 20, 10 * 60 * 1000))) {
      return res.status(429).json({ message: 'Too many attempts. Please wait a few minutes.' });
    }
    const content = await getContent();
    const ticket = (content.tickets || []).find((t) => t && t.id === body.ticketType && t.active && Number(t.price) > 0);
    if (!ticket) return res.status(400).json({ message: 'That ticket is not on sale right now.' });
    const maxQty = Math.min(200, Number(content.ticketing && content.ticketing.maxQuantity) || 50);
    const qty = Number(body.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > maxQty) return res.status(400).json({ message: 'Choose between 1 and ' + maxQty + ' tickets.' });
    const coupon = await resolveCoupon({ amount: Number(ticket.price) }, ticket.id, body.couponCode);
    const buyer = body.buyer || {};
    if (!supabaseConfigured()) return res.status(200).json({ reference: newRef(), hold: false, unitPrice: coupon.unitPrice, total: coupon.unitPrice * qty, coupon });

    /* A buyer who goes back and tries again gives up their earlier hold. */
    if (typeof body.release === 'string' && /^[\w.\-=]{3,100}$/.test(body.release)) {
      try { await releaseReservation(body.release); } catch (e) { /* it expires on its own */ }
    }

    const first = await getAvailability();
    const a = first.tickets[ticket.id];
    if (a && a.left !== null && a.left < qty) {
      return res.status(409).json({ soldOut: a.left <= 0, left: a.left, message: soldMessage(a.left) });
    }
    if (!first.limited[ticket.id] && coupon.unitPrice > 0) return res.status(200).json({ reference: newRef(), hold: false, unitPrice: coupon.unitPrice, total: coupon.unitPrice * qty, coupon });

    const reference = newRef();
    const hold = first.limited[ticket.id] ? await createReservation({ reference, ticket_type: ticket.id, quantity: qty, people: qty * ticketAdmits(ticket) }) : null;
    /* Two people can reach this point together: only holds made before mine count against me. */
    if (hold) {
      const second = await getAvailability({ beforeId: hold.id });
      const b = second.tickets[ticket.id];
      if (b && b.left !== null && b.left < qty) {
        await releaseReservation(reference);
        return res.status(409).json({ soldOut: b.left <= 0, left: b.left, message: soldMessage(b.left) });
      }
    }
    if (coupon.unitPrice === 0) {
      const email = normEmail(buyer.email);
      if (!validEmail(email) || !String(buyer.name || '').trim()) {
        if (hold) await releaseReservation(reference);
        return res.status(400).json({ message: 'Enter your full name and a valid email address to claim this complimentary ticket.' });
      }
      const purchase = { ticketType: ticket.id, ticket: { label: ticket.label, amount: Number(ticket.price), admits: ticketAdmits(ticket) }, quantity: qty, totalNaira: 0, admitsPerUnit: ticketAdmits(ticket), admitsTotal: qty * ticketAdmits(ticket), coupon };
      await recordSale({ reference, ticket_number: ticketNumberFor(reference), name: cleanName(buyer.name), email, phone: cleanPhone(buyer.phone), ...saleFields(purchase), paid_at: new Date().toISOString(), source: 'coupon', email_sent: false }, { strict: true });
      let emailSent = false;
      try { await sendTicketEmail({ email, name: cleanName(buyer.name), ticket: purchase.ticket, reference, quantity: qty, admitsTotal: purchase.admitsTotal, complimentary: true, origin: siteOrigin(req) }); await recordSale({ reference, email_sent: true }); emailSent = true; } catch (emailError) { console.error('FREE COUPON EMAIL ERROR:', emailError.message); }
      return res.status(200).json({ reference, free: true, emailSent, ticketNumber: ticketNumberFor(reference), ticket: ticket.label, quantity: qty, admitsTotal: purchase.admitsTotal, unitPrice: 0, total: 0, coupon });
    }
    return res.status(200).json({ reference, hold: Boolean(hold), expiresAt: hold && hold.expires_at, unitPrice: coupon.unitPrice, total: coupon.unitPrice * qty, coupon });
  } catch (error) {
    await reportError('reserve', error, req);
    return res.status(500).json({ message: 'Could not hold your tickets.' });
  }
}
