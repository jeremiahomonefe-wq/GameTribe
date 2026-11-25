/*
 * Public: a buyer's own ticket page data + QR image.
 *   GET /api/ticket?t=<token>           -> JSON about the ticket
 *   GET /api/ticket?t=<token>&qr=1      -> the QR code as a PNG
 * The token is only ever sent to the buyer's email, and it is signed, so it
 * cannot  be guessed or edited.
 */
import crypto from 'node:crypto';
import { sb, supabaseConfigured } from './_lib/supabase.js';
import { getSale } from './_lib/checkin.js';
import { allow, clientIp, turnstileOn, verifyTurnstile } from './_lib/security.js';
import { referenceFromToken, ticketToken, ticketQrPng } from './_lib/qr.js';
import { ticketNumberFor, sendTicketsEmail, itemFromSale, siteOrigin, resolveCoupon } from './_lib/tickets.js';
import { getAvailability, getContent, getCouponByCode, listSales, markQrSent, createSignedUpload } from './_lib/store.js';
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
    /* the very same rules that are applied when the buyer pays, so "applied" always means "will work" */
    let coupon;
    try {
      coupon = await resolveCoupon({ amount: Number(ticket.price) }, ticketType, code, '');
    } catch (error) {
      return res.status(400).json({ message: error.message || 'This promo code cannot be used.' });
    }
    const finalPrice = coupon.unitPrice;
    return res.status(200).json({ valid: true, code: coupon.code, name: coupon.name || code, originalUnitPrice: Number(ticket.price), finalUnitPrice: finalPrice, quantity, originalTotal: Number(ticket.price) * quantity, finalTotal: finalPrice * quantity, savings: (Number(ticket.price) - finalPrice) * quantity });
  } catch (error) {
    console.error('COUPON VALIDATION ERROR:', error);
    return res.status(500).json({ message: 'Could not validate coupon right now.' });
  }
}

/* A ticket holder asks permission to upload up to 3 photos at a time (6 in total).
   The ticket link itself is the proof of attendance. Photos wait for admin approval. */
const MAX_PHOTOS_PER_TICKET = 6;
async function photoSign(req, res) {
  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  const reference = referenceFromToken(body.t);
  if (!reference) return res.status(404).json({ message: 'This ticket link is not valid.' });
  if (!supabaseConfigured()) return res.status(503).json({ message: 'Photo sharing is not available right now.' });
  if (!(await allow('photo-sign', clientIp(req), 12, 60 * 60 * 1000))) return res.status(429).json({ message: 'Too many uploads. Please try again later.' });
  let sale = null;
  try { sale = await getSale(reference); } catch { return res.status(503).json({ message: 'Please try again shortly.' }); }
  if (!sale) return res.status(404).json({ message: 'We could not find this ticket.' });
  const count = Math.max(1, Math.min(3, Number(body.count) || 1));
  let existing;
  try { existing = (await sb('/rest/v1/photo_submissions?reference=eq.' + encodeURIComponent(reference) + '&status=neq.rejected&select=id&limit=20')) || []; }
  catch { return res.status(503).json({ message: 'Photo sharing is not switched on yet.' }); }
  if (existing.length + count > MAX_PHOTOS_PER_TICKET) return res.status(429).json({ message: 'You can share up to ' + MAX_PHOTOS_PER_TICKET + ' photos per ticket. You have ' + Math.max(0, MAX_PHOTOS_PER_TICKET - existing.length) + ' left.' });
  const clean = (v, n) => String(v || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, n);
  const name = clean(body.name, 60) || shortName(sale.name);
  const caption = clean(body.caption, 140);
  const items = [], rows = [];
  for (let i = 0; i < count; i++) {
    const id = crypto.randomUUID();
    const signed = await createSignedUpload('images/community-' + id.replace(/-/g, '') + '.webp');
    items.push({ id, path: signed.path, uploadUrl: signed.uploadUrl });
    rows.push({ id, path: signed.path, caption: caption || null, uploader_name: name, reference, status: 'pending' });
  }
  await sb('/rest/v1/photo_submissions', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: rows });
  return res.status(200).json({ items, anonKey: process.env.SUPABASE_ANON_KEY || '' });
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    res.setHeader('Cache-Control', 'no-store');
    if (req.query && req.query.photo) return photoSign(req, res);
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
