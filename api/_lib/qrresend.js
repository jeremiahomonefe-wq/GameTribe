/*
 * "Send QR tickets" to people who already bought: one email per person with all
 * of their tickets, each with the SAME reference / ticket number as before plus
 * a QR code and a link to the ticket page.
 */
import { listSales } from './store.js';
import { getSale } from './checkin.js';
import { markQrSent } from './store.js';
import { sendTicketsEmail, itemFromSale } from './tickets.js';
import { normEmail, validEmail } from './team.js';

export const QR_CHUNK = 5;                 /* emails per request (each one is sent separately, with its own image) */
export const QR_SUBJECT = 'Your Game Tribe ticket now has a QR code';
export const MODES = {
  pending: 'People who have not been sent a QR ticket yet',
  all: 'Everyone with a ticket (even if already sent)'
};

/* -> [{ email, name, refs: [reference, ...] }] one per person; mode 'pending' only includes tickets not yet sent */
export async function qrRecipients(mode) {
  const byEmail = new Map();
  const sales = await listSales();
  /* If the "qr_sent_at" column does not exist yet we cannot remember who was emailed, so refuse (never risk sending twice). */
  if (sales.length && !sales.some((s) => 'qr_sent_at' in s)) {
    const e = new Error('The qr_sent_at column is missing.');
    e.code = 'MISSING_QR_COLUMN';
    throw e;
  }
  for (const s of sales) {
    const email = normEmail(s.email);
    if (!validEmail(email)) continue;
    if (mode === 'pending' && s.qr_sent_at) continue;
    const rec = byEmail.get(email) || { email, name: s.name || '', refs: [] };
    rec.refs.push(s.reference);
    byEmail.set(email, rec);
  }
  return [...byEmail.values()].map((r) => ({ ...r, refs: r.refs.slice(0, 10) }));
}

const introFor = (n) => 'We have upgraded entry for Game Tribe Fest 2026. ' + (n > 1 ? 'Your tickets and their reference numbers are exactly as before.' : 'Your ticket and its reference number are exactly as before.') +
  ' ' + (n > 1 ? 'Each ticket now has' : 'It now has') + ' a QR code, so you can be checked in at the gate in seconds.';

/* Emails one person. Throws if nothing could be sent. */
export async function sendQrTickets(rec, { origin, key }) {
  const sales = [];
  for (const ref of rec.refs) {
    const s = await getSale(ref);
    if (s) sales.push(s);
  }
  if (!sales.length) throw new Error('their tickets no longer exist');
  await sendTicketsEmail({
    to: rec.email,
    name: rec.name || sales[0].name || 'there',
    items: sales.map(itemFromSale),
    origin,
    subject: QR_SUBJECT,
    intro: introFor(sales.length),
    idempotencyKey: key
  });
  await markQrSent(sales.map((s) => s.reference));
}

/* Resend's "you have used today's allowance" answer. Anything else is just a failure for that person. */
export const isQuotaError = (e) => Boolean(e && e.status === 429 && /quota|daily|monthly/i.test(String(e.body || e.message)));
export const isRateLimit = (e) => Boolean(e && e.status === 429 && !isQuotaError(e));
