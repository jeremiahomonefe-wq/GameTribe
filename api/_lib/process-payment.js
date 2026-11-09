
import {
  getTicketMapStrict,
  getSale,
  recordSale,
  updateSaleEmail
} from './store.js';

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[character]));
}

async function sendTicketEmail({
  email,
  name,
  ticket,
  reference,
  ticketNumber
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  if (!process.env.RESEND_FROM_EMAIL) {
    throw new Error('RESEND_FROM_EMAIL is not configured.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',

    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'gametribe-ticket-' + reference
    },

    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [email],

      subject: 'Your Game Tribe Ticket - ' + ticketNumber,

      html: `
        <div style="
          font-family:Arial,sans-serif;
          max-width:560px;
          margin:auto;
          color:#1C1410;
        ">
          <div style="
            background:#E8342A;
            color:#FFF6E5;
            padding:24px;
            border-radius:16px 16px 0 0;
          ">
            <h1 style="margin:0">GAME TRIBE</h1>
            <p>Your reservation is confirmed</p>
          </div>

          <div style="
            border:2px solid #1C1410;
            border-top:0;
            padding:24px;
            border-radius:0 0 16px 16px;
          ">
            <p>Hi ${escapeHtml(name)},</p>

            <p>
              Your payment has been successfully verified.
              Please keep this email and show it at the event entrance.
            </p>

            <p>
              <strong>Ticket:</strong> ${escapeHtml(ticket.label)}
              <br>
              <strong>Ticket Number:</strong>
              ${escapeHtml(ticketNumber)}
              <br>
              <strong>Paystack Reference:</strong>
              ${escapeHtml(reference)}
            </p>

            <p>
              We can't wait to see you at Game Tribe Fest 2026.
            </p>
          </div>
        </div>
      `,

      text: `
Game Tribe Ticket Confirmed

Hi ${name},

Your payment has been successfully verified.

Ticket: ${ticket.label}
Ticket Number: ${ticketNumber}
Paystack Reference: ${reference}

Please show this email at the event entrance.

We can't wait to see you at Game Tribe Fest 2026.
      `
    })
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      'Resend failed: ' + response.status + ' ' + responseText
    );
  }

  return responseText;
}

export async function processSuccessfulPayment(transaction, source) {
  if (!transaction || transaction.status !== 'success') {
    throw new Error('Transaction is not successful.');
  }

  const reference = String(transaction.reference || '');

  if (!reference) {
    throw new Error('Transaction has no Paystack reference.');
  }

  if (transaction.currency !== 'NGN') {
    throw new Error('Invalid payment currency: ' + transaction.currency);
  }

  const ticketType =
    transaction.metadata &&
    transaction.metadata.ticket_type;

  if (!ticketType) {
    throw new Error('Payment metadata has no ticket_type.');
  }

  const tickets = await getTicketMapStrict();
  const ticket = tickets[ticketType];

  if (!ticket) {
    throw new Error('Unknown ticket type: ' + ticketType);
  }

  if (Number(transaction.amount) !== ticket.amount * 100) {
    throw new Error(
      'Payment amount does not match ticket price. Reference: ' +
      reference
    );
  }

  const email =
    transaction.customer &&
    transaction.customer.email;

  if (!email) {
    throw new Error('Customer email is missing.');
  }

  const metadata = transaction.metadata || {};
  const customer = transaction.customer || {};

  const name =
    metadata.customer_name ||
    [customer.first_name, customer.last_name]
      .filter(Boolean)
      .join(' ') ||
    'Game Tribe Guest';

  const phone = customer.phone || '';

  const ticketNumber = 'GT-' + reference;

  /*
   * Check whether this payment has already been recorded.
   */
  let existingSale = await getSale(reference);

  /*
   * Record the payment before attempting email delivery.
   * Existing email status is not overwritten.
   */
  if (!existingSale) {
    await recordSale({
      reference,
      ticket_number: ticketNumber,
      name,
      email,
      phone,
      ticket_type: ticketType,
      ticket_label: ticket.label,
      amount: ticket.amount,
      paid_at: transaction.paid_at || new Date().toISOString(),
      source,
      email_sent: false,
      email_status: 'pending',
      email_attempts: 0
    });

    existingSale = await getSale(reference);

    if (!existingSale) {
      throw new Error('Payment was not confirmed in Supabase.');
    }
  }

  /*
   * Do not resend an email already marked as delivered.
   */
  if (
    existingSale.email_sent === true ||
    existingSale.email_status === 'sent'
  ) {
    return {
      processed: true,
      emailStatus: 'sent',
      alreadyProcessed: true,
      reference,
      ticketNumber
    };
  }

  const attempts = Number(existingSale.email_attempts || 0) + 1;

  await updateSaleEmail(reference, {
    email_status: 'pending',
    email_attempts: attempts,
    email_error: null
  });

  try {
    await sendTicketEmail({
      email: existingSale.email || email,
      name: existingSale.name || name,
      ticket,
      reference,
      ticketNumber: existingSale.ticket_number || ticketNumber
    });

    await updateSaleEmail(reference, {
      email_status: 'sent',
      email_sent: true,
      email_sent_at: new Date().toISOString(),
      email_error: null
    });

    console.log('GAME TRIBE EMAIL SENT:', {
      reference,
      email,
      ticketNumber
    });

    return {
      processed: true,
      emailStatus: 'sent',
      alreadyProcessed: false,
      reference,
      ticketNumber
    };

  } catch (error) {
    console.error('GAME TRIBE EMAIL FAILED:', {
      reference,
      email,
      error: error.message
    });

    await updateSaleEmail(reference, {
      email_status: 'failed',
      email_sent: false,
      email_error: error.message
    });

    /*
     * The payment remains recorded.
     * Email recovery is handled separately.
     */
    return {
      processed: true,
      emailStatus: 'failed',
      emailError: error.message,
      reference,
      ticketNumber
    };
  }
}
