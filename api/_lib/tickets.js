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

export async function sendTicketEmail({ email, name, ticket, reference, quantity = 1, admitsTotal = 1 }) {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured.');
  if (!process.env.RESEND_FROM_EMAIL) throw new Error('RESEND_FROM_EMAIL is not configured.');

  const ticketNumber = ticketNumberFor(reference);
  const many = quantity > 1;
  const orderLine = many
    ? quantity + ' × ' + ticket.label
    : ticket.label;
  const admitsLine = admitsTotal > 1
    ? 'This order admits ' + admitsTotal + ' people. Show this email (or your reference) at the entrance and the team will tick people off as they come in.'
    : 'Please keep this email and show it at the event entrance.';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json',
      /* Paystack can retry webhooks; this stops duplicate emails. */
      'Idempotency-Key': 'gametribe-ticket-' + reference
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [email],
      subject: 'Your Game Tribe Ticket — ' + ticketNumber,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1C1410">
          <div style="background:#E8342A;color:#FFF6E5;padding:24px;border-radius:16px 16px 0 0;">
            <h1 style="margin:0">GAME TRIBE</h1>
            <p style="margin:8px 0 0">Your reservation is confirmed</p>
          </div>
          <div style="border:2px solid #1C1410;border-top:0;padding:24px;border-radius:0 0 16px 16px;">
            <p>Hi ${escapeHtml(name)},</p>
            <p>Your payment has been successfully verified. ${escapeHtml(admitsLine)}</p>
            <p>
              <strong>Ticket:</strong> ${escapeHtml(orderLine)}<br>
              ${admitsTotal > 1 ? '<strong>People admitted:</strong> ' + escapeHtml(admitsTotal) + '<br>' : ''}
              <strong>Ticket Number:</strong> ${escapeHtml(ticketNumber)}<br>
              <strong>Paystack Reference:</strong> ${escapeHtml(reference)}
            </p>
            <p>We can't wait to see you at Game Tribe Fest 2026.</p>
          </div>
        </div>
      `,
      text: `
Game Tribe Ticket Confirmed

Hi ${name},

Your payment has been successfully verified.

Ticket: ${orderLine}
${admitsTotal > 1 ? 'People admitted: ' + admitsTotal + '\n' : ''}Ticket Number: ${ticketNumber}
Paystack Reference: ${reference}

${admitsLine}

We can't wait to see you at Game Tribe Fest 2026.
      `
    })
  });

  const responseText = await response.text();
  if (!response.ok) {
    console.error('RESEND ERROR:', responseText);
    throw new Error('Resend failed: ' + response.status + ' ' + responseText);
  }
  console.log('Ticket email sent:', { email, reference, ticketNumber, quantity });
  return ticketNumber;
}
