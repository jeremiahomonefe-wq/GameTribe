/*
 * Public: a buyer's own ticket page data + QR image.
 *   GET /api/ticket?t=<token>           -> JSON about the ticket
 *   GET /api/ticket?t=<token>&qr=1      -> the QR code as a PNG
 * The token is only ever sent to the buyer's email, and it is signed, so it
 * cannot  be guessed or edited.
 */
import { supabaseConfigured } from './_lib/supabase.js';
import { getSale } from './_lib/checkin.js';
import { allow, clientIp, turnstileOn, verifyTurnstile } from './_lib/security.js';
import { referenceFromToken, ticketToken, ticketQrPng } from './_lib/qr.js';
import { ticketNumberFor, sendTicketsEmail, itemFromSale, siteOrigin } from './_lib/tickets.js';
import { getAvailability, getContent, getCouponByCode, listSales, markQrSent } from './_lib/store.js';
import { normEmail, validEmail } from './_lib/team.js';
import { reportError } from './_lib/monitor.js';

/* "Ada Obi" -> "Ada O." : enough for the buyer to recognise their ticket */
function shortName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Guest';
  return parts.length === 1 ? parts[0] : parts[0] + ' ' + parts[parts.length - 1][0] + '.';
}

const FIND_TICKET_RESPONSE = {
  ok: true,
  message: 'If we found tickets for that email or phone number, we have just sent them to the email address used when buying. Please check your inbox and your spam folder. It can take a minute or two.'
};

const last10 = (value) => String(value || '').replace(/\D/g, '').slice(-10);

async function findTicket(req, res) {
  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  const contact = String(body.contact || '').trim().slice(0, 200);
  const ip = clientIp(req);
  const isEmail = contact.includes('@');
  const email = isEmail ? normEmail(contact) : '';
  const phone = isEmail ? '' : last10(contact);
  if (isEmail ? !validEmail(email) : phone.length < 10) return res.status(400).json({ message: 'Enter the email address, or the phone number, you used when paying.' });
  if (!(await allow('find-ip', ip, 6, 60 * 60 * 1000))) return res.status(429).json({ message: 'Too many tries. Please wait a while, or contact us and we will help.' });
  if (turnstileOn() && !(await verifyTurnstile(body.turnstile, ip))) return res.status(400).json({ message: 'Please complete the check above the button and try again.' });
  if (!(await allow('find-all', 'all', 120, 60 * 60 * 1000))) return res.status(429).json({ message: 'We are getting a lot of requests right now. Please try again later.' });
  const target = isEmail ? 'e:' + email : 'p:' + phone;
  if (!(await allow('find-target', target, 3, 60 * 60 * 1000))) return res.status(200).json(FIND_TICKET_RESPONSE);
  if (!supabaseConfigured()) return res.status(200).json(FIND_TICKET_RESPONSE);
  try {
    const mine = (await listSales()).filter((sale) => sale.email && (isEmail ? normEmail(sale.email) === email : last10(sale.phone) === phone));
    const byAddress = new Map();
    for (const sale of mine.slice(0, 20)) {
      const to = normEmail(sale.email);
      byAddress.set(to, [...(byAddress.get(to) || []), sale]);
    }
    const origin = siteOrigin(req);
    for (const [to, sales] of byAddress) {
      await sendTicketsEmail({ to, name: sales[0].name || 'there', items: sales.slice(0, 10).map(itemFromSale), origin });
      await markQrSent(sales.slice(0, 10).map((sale) => sale.reference));
    }
  } catch (error) {
    await reportError('find-ticket', error, req);
  }
  return res.status(200).json(FIND_TICKET_RESPONSE);
}

async function ticketAvailability(req, res) {
  try {
    const availability = await getAvailability();
    res.setHeader('Cache-Control', 'public, s-maxage=8, stale-while-revalidate=30');
    return res.status(200).json({ tickets: availability.tickets, showLeftBelow: availability.showLeftBelow });
  } catch {
    return res.status(200).json({ tickets: {}, showLeftBelow: 0 });
  }
}

async function validateCoupon(req, res) {
  try {
    if (!(await allow('coupon_validate', clientIp(req), 25, 10 * 60 * 1000))) return res.status(429).json({ message: 'Too many attempts. Please wait a moment.' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const code = String(body.code || '').trim().toUpperCase();
    const ticketType = String(body.ticketType || '');
    const quantity = Number(body.quantity);
    if (!/^[A-Z0-9_-]{2,32}$/.test(code)) return res.status(400).json({ message: 'Enter a valid coupon code.' });
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 200) return res.status(400).json({ message: 'Invalid quantity.' });
    const content = await getContent();
    const ticket = (content.tickets || []).find((item) => item && item.id === ticketType && item.active && Number(item.price) > 0);
    if (!ticket) return res.status(400).json({ message: 'Ticket type unavailable.' });
    const coupon = await getCouponByCode(code);
    if (!coupon || !coupon.active) return res.status(404).json({ message: 'Coupon code is invalid or inactive.' });
    if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) return res.status(400).json({ message: 'Coupon has expired.' });
    const allowedTypes = Array.isArray(coupon.ticket_types) ? coupon.ticket_types : [];
    if (allowedTypes.length && !allowedTypes.includes(ticketType)) return res.status(400).json({ message: 'Coupon does not apply to the selected ticket.' });
    const finalPrice = Number(coupon.final_price);
    if (!Number.isInteger(finalPrice) || finalPrice < 0 || finalPrice > Number(ticket.price)) return res.status(400).json({ message: 'Coupon price must be from ₦0 up to the ticket price.' });
    return res.status(200).json({ valid: true, code, name: coupon.name || code, originalUnitPrice: Number(ticket.price), finalUnitPrice: finalPrice, quantity, originalTotal: Number(ticket.price) * quantity, finalTotal: finalPrice * quantity, savings: (Number(ticket.price) - finalPrice) * quantity });
  } catch (error) {
    console.error('COUPON VALIDATION ERROR:', error);
    return res.status(500).json({ message: 'Could not validate coupon right now.' });
  }
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    res.setHeader('Cache-Control', 'no-store');
    return req.query && (req.query.action === 'coupon' || req.query.availability) ? validateCoupon(req, res) : findTicket(req, res);
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ message: 'Method not allowed.' });
  }
  if (req.query && req.query.availability) return ticketAvailability(req, res);
  if (!(await allow('ticket-page', clientIp(req), 120, 10 * 60 * 1000))) {
    return res.status(429).json({ message: 'Too many requests. Please try again in a few minutes.' });
  }
  const reference = referenceFromToken(req.query && req.query.t);
  if (!reference) return res.status(404).json({ message: 'This ticket link is not valid.' });
  if (!supabaseConfigured()) return res.status(503).json({ message: 'Tickets are not available right now.' });

  let sale = null;
  try { sale = await getSale(reference); } catch (e) { return res.status(503).json({ message: 'Tickets are not available right now. Please try again shortly.' }); }
  if (!sale) return res.status(404).json({ message: 'We could not find this ticket.' });

  if (req.query.qr) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    return res.status(200).send(ticketQrPng(reference, 10));
  }
  const token = ticketToken(reference);
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json({
    name: shortName(sale.name),
    ticket: sale.ticket_label || sale.ticket_type || 'Game Tribe ticket',
    quantity: Number(sale.quantity) || 1,
    people: Number(sale.admits_total) || 1,
    admitted: Number(sale.admitted_count) || 0,
    ticketNumber: ticketNumberFor(sale.reference),
    complimentary: sale.source === 'complimentary' || Number(sale.amount) === 0,
    qr: '/api/ticket?qr=1&t=' + encodeURIComponent(token)
  });
}
