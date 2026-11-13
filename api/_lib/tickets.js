import { ticketQrPng, ticketToken } from './qr.js';

/*
 * Shared ticket logic used by BOTH api/verify-payment.js (browser) and
 * api/paystack-webhook.js (Paystack), so the two can never disagree.
 */

/* Safety ceiling when verifying an already-paid order. The "max tickets per
   order" you set in the dashboard is a checkout limit; a payment that has
   already gone through is always honoured up to this ceiling. */
export const HARD_MAX_QUANTITY = 500;

export function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));
}

/* Names and phone numbers come from the buyer's browser, so never trust their size or content. */
export function cleanName(value, fallback = 'Game Tribe Guest') {
  const s = String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return s || fallback;
}

export function cleanPhone(value) {
  return String(value == null ? '' : value)
    .replace(/[^\d+()\-\s.]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20);
}

/* References already start with "GT-", so don't add a second "GT-". */
export function ticketNumberFor(reference) {
  const ref = String(reference || '');
  return /^GT-/i.test(ref) ? ref : 'GT-' + ref;
}

/* Quantity comes from the Paystack metadata set at checkout.
   Missing = 1 (a checkout opened before this update). Invalid = 0. */
export function readQuantity(metadata) {
  const raw = metadata && metadata.quantity;
  if (raw === undefined || raw === null || raw === '') return 1;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= HARD_MAX_QUANTITY ? n : 0;
}

/*
 * Decide whether a Paystack transaction is a valid ticket purchase.
 * Returns { ok:false, status, message } or { ok:true, ... }.
 * The amount must equal unit price x quantity, so editing the quantity in
 * the browser without paying for it can never produce extra tickets.
 */
export function checkPurchase(transaction, ticketMap) {
  const metadata = (transaction && transaction.metadata) || {};
  const ticketType = metadata.ticket_type;
  const ticket = ticketMap[ticketType];

  if (!ticket) {
    return { ok: false, status: 400, message: 'Invalid ticket type in Paystack transaction.', reason: 'Unknown ticket type.' };
  }

  const quantity = readQuantity(metadata);
  if (!quantity) {
    return { ok: false, status: 400, message: 'Invalid ticket quantity in Paystack transaction.', reason: 'Invalid quantity.' };
  }

  if (transaction.currency !== 'NGN') {
    return { ok: false, status: 400, message: 'Payment amount does not match this ticket.', reason: 'Invalid currency.' };
  }

  const expected = ticket.amount * quantity * 100;
  if (transaction.amount !== expected) {
    return { ok: false, status: 400, message: 'Payment amount does not match this ticket.', reason: 'Invalid ticket amount.', expected };
  }

  const admitsPerUnit = ticket.admits || 1;
  return {
    ok: true,
    ticketType,
    ticket,
    quantity,
    totalNaira: ticket.amount * quantity,
    admitsPerUnit,
    admitsTotal: admitsPerUnit * quantity
  };
}

/* The columns recordSale() stores for a purchase. */
export function saleFields(purchase) {
  return {
    ticket_type: purchase.ticketType,
    ticket_label: purchase.ticket.label,
    amount: purchase.totalNaira,
    quantity: purchase.quantity,
    unit_price: purchase.ticket.amount,
    admits_per_unit: purchase.admitsPerUnit,
    admits_total: purchase.admitsTotal
  };
}

/* The public address of the site, for links inside emails (set SITE_URL in Vercel to be certain). */
export function siteOrigin(req) {
  if (process.env.SITE_URL) return String(process.env.SITE_URL).replace(/\/+$/, '');
  const h = (req && req.headers) || {};
  const host = String(h['x-forwarded-host'] || h.host || '').split(',')[0].trim();
  const proto = String(h['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return host ? proto + '://' + host : '';
}

export const ticketLink = (origin, reference) => origin + '/ticket?t=' + encodeURIComponent(ticketToken(reference));

const MAX_INLINE_QR = 5; /* more tickets than this in one email: the rest get a link only */

/*
 * One email carrying one or more tickets, each with its own QR code.
 * items: [{ ticket: { label }, reference, quantity, admitsTotal, complimentary }]
 */
export async function sendTicketsEmail({ to, name, items, origin = '', subject, idempotencyKey }) {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured.');
  if (!process.env.RESEND_FROM_EMAIL) throw new Error('RESEND_FROM_EMAIL is not configured.');

  const attachments = [];
  const blocks = [];
  const textBlocks = [];
  items.forEach((it, i) => {
    const number = ticketNumberFor(it.reference);
    const qty = Number(it.quantity) || 1;
    const admits = Number(it.admitsTotal) || 1;
    const order = qty > 1 ? qty + ' × ' + it.ticket.label : it.ticket.label;
    const link = origin ? ticketLink(origin, it.reference) : '';
    let qrNote = '';
    if (i < MAX_INLINE_QR) {
      try {
        attachments.push({
          filename: 'ticket-qr-' + (i + 1) + '.png',
          content: ticketQrPng(it.reference).toString('base64'),
          content_type: 'image/png',
          content_id: 'qr-' + (i + 1)
        });
        qrNote = '<div style="text-align:center;margin:12px 0 6px"><img src="cid:qr-' + (i + 1) + '" width="200" height="200" alt="Your ticket QR code" style="width:200px;height:200px"><br><span style="font-size:12px">Show this QR code at the entrance</span></div>';
      } catch (e) {
        console.error('QR generation failed (email sent without it):', e.message);
      }
    }
    blocks.push(`
      <div style="border:2px solid #1C1410;border-radius:14px;padding:14px 16px;margin:14px 0;">
        <strong>${escapeHtml(order)}</strong><br>
        ${admits > 1 ? 'People admitted: ' + escapeHtml(admits) + '<br>' : ''}
        Ticket Number: ${escapeHtml(number)}
        ${qrNote}
        ${link ? '<div style="text-align:center;font-size:13px"><a href="' + escapeHtml(link) + '">Open this ticket online</a></div>' : ''}
      </div>`);
    textBlocks.push(
      'Ticket: ' + order + '\n' + (admits > 1 ? 'People admitted: ' + admits + '\n' : '') +
      'Ticket Number: ' + number + (link ? '\nOpen your ticket (with QR code): ' + link : '')
    );
  });

  const first = items[0];
  const comp = Boolean(first && first.complimentary);
  const many = items.length > 1;
  const intro = comp
    ? 'You have been given a complimentary pass to Game Tribe Fest 2026.'
    : many
      ? 'Here are your Game Tribe tickets.'
      : 'Your payment has been successfully verified.';
  const advice = items.some((it) => (Number(it.admitsTotal) || 1) > 1)
    ? 'Show the QR code (or your ticket number) at the entrance. Where a ticket covers several people, the team ticks people off as they come in.'
    : 'Show the QR code (or your ticket number) at the event entrance.';
  const finalSubject = subject || (many
    ? 'Your Game Tribe tickets'
    : (comp ? 'Your Game Tribe pass — ' : 'Your Game Tribe Ticket — ') + ticketNumberFor(first.reference));

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {})
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [to],
      subject: finalSubject,
      attachments: attachments.length ? attachments : undefined,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1C1410">
          <div style="background:#E8342A;color:#FFF6E5;padding:24px;border-radius:16px 16px 0 0;">
            <h1 style="margin:0">GAME TRIBE</h1>
            <p style="margin:8px 0 0">${comp ? 'Your pass is ready' : 'Your reservation is confirmed'}</p>
          </div>
          <div style="border:2px solid #1C1410;border-top:0;padding:24px;border-radius:0 0 16px 16px;">
            <p>Hi ${escapeHtml(name)},</p>
            <p>${escapeHtml(intro)} ${escapeHtml(advice)}</p>
            ${blocks.join('')}
            <p>We can't wait to see you at Game Tribe Fest 2026.</p>
          </div>
        </div>
      `,
      text: `
Game Tribe ${comp ? 'Pass' : 'Ticket Confirmed'}

Hi ${name},

${intro} ${advice}

${textBlocks.join('\n\n')}

We can't wait to see you at Game Tribe Fest 2026.
      `
    })
  });

  const responseText = await response.text();
  if (!response.ok) {
    console.error('RESEND ERROR:', responseText);
    throw new Error('Resend failed: ' + response.status + ' ' + responseText);
  }
  console.log('Ticket email sent:', { to, tickets: items.length });
}

/* One ticket, as before. Returns the ticket number. */
export async function sendTicketEmail({ email, name, ticket, reference, quantity = 1, admitsTotal = 1, complimentary = false, origin = '' }) {
  await sendTicketsEmail({
    to: email,
    name,
    origin,
    items: [{ ticket, reference, quantity, admitsTotal, complimentary }],
    idempotencyKey: 'gametribe-ticket-' + reference
  });
  return ticketNumberFor(reference);
}

/* Tickets as saved in the sales table (used by "Find my ticket" and resends). */
export const itemFromSale = (sale) => ({
  ticket: { label: sale.ticket_label || sale.ticket_type || 'Game Tribe ticket' },
  reference: sale.reference,
  quantity: Number(sale.quantity) || 1,
  admitsTotal: Number(sale.admits_total) || 1,
  complimentary: sale.source === 'complimentary' || Number(sale.amount) === 0
});
