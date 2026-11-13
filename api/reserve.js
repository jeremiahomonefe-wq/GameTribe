/*
 * Called just before a buyer opens Paystack. It does two things:
 *  - refuses if the tickets are sold out (or fewer are left than they want), and
 *  - holds the tickets for 15 minutes so two people cannot pay for the last one.
 * It returns the payment reference to use. If anything goes wrong on OUR side the
 * website carries on without a hold, so a fault here never stops a sale.
 */
import crypto from 'crypto';
import { getContent, getAvailability, createReservation, releaseReservation, ticketAdmits } from './_lib/store.js';
import { supabaseConfigured } from './_lib/supabase.js';
import { allow, clientIp } from './_lib/security.js';
import { reportError } from './_lib/monitor.js';

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
    if (!supabaseConfigured()) return res.status(200).json({ reference: newRef(), hold: false });

    /* A buyer who goes back and tries again gives up their earlier hold. */
    if (typeof body.release === 'string' && /^[\w.\-=]{3,100}$/.test(body.release)) {
      try { await releaseReservation(body.release); } catch (e) { /* it expires on its own */ }
    }

    const first = await getAvailability();
    const a = first.tickets[ticket.id];
    if (a && a.left !== null && a.left < qty) {
      return res.status(409).json({ soldOut: a.left <= 0, left: a.left, message: soldMessage(a.left) });
    }
    if (!first.limited[ticket.id]) return res.status(200).json({ reference: newRef(), hold: false });

    const reference = newRef();
    const hold = await createReservation({ reference, ticket_type: ticket.id, quantity: qty, people: qty * ticketAdmits(ticket) });
    /* Two people can reach this point together: only holds made before mine count against me. */
    const second = await getAvailability({ beforeId: hold.id });
    const b = second.tickets[ticket.id];
    if (b && b.left !== null && b.left < qty) {
      await releaseReservation(reference);
      return res.status(409).json({ soldOut: b.left <= 0, left: b.left, message: soldMessage(b.left) });
    }
    return res.status(200).json({ reference, hold: true, expiresAt: hold.expires_at });
  } catch (error) {
    await reportError('reserve', error, req);
    return res.status(500).json({ message: 'Could not hold your tickets.' });
  }
}
