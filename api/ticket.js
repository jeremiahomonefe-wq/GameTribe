/*
 * Public: a buyer's own ticket page data + QR image.
 *   GET /api/ticket?t=<token>           -> JSON about the ticket
 *   GET /api/ticket?t=<token>&qr=1      -> the QR code as a PNG
 * The token is only ever sent to the buyer's email, and it is signed, so it
 * cannot  be guessed or edited.
 */
import { supabaseConfigured } from './_lib/supabase.js';
import { getSale } from './_lib/checkin.js';
import { allow, clientIp } from './_lib/security.js';
import { referenceFromToken, ticketToken, ticketQrPng } from './_lib/qr.js';
import { ticketNumberFor } from './_lib/tickets.js';

/* "Ada Obi" -> "Ada O." : enough for the buyer to recognise their ticket */
function shortName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Guest';
  return parts.length === 1 ? parts[0] : parts[0] + ' ' + parts[parts.length - 1][0] + '.';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method not allowed.' });
  }
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
