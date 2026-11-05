import crypto from 'crypto';

import { getTicketMap, recordSale } from './_lib/store.js';

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
  reference
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  if (!process.env.RESEND_FROM_EMAIL) {
    throw new Error('RESEND_FROM_EMAIL is not configured.');
  }

  const ticketNumber = 'GT-' + reference;

  const response = await fetch(
    'https://api.resend.com/emails',
    {
      method: 'POST',

      headers: {
        Authorization:
          'Bearer ' + process.env.RESEND_API_KEY,

        'Content-Type': 'application/json',

        /*
         * Paystack can retry webhooks.
         * This prevents the same reference from
         * generating multiple Resend sends.
         */
        'Idempotency-Key':
          'gametribe-ticket-' + reference
      },

      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,

        to: [email],

        subject:
          'Your Game Tribe Ticket — ' +
          ticketNumber,

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

              <h1 style="margin:0">
                GAME TRIBE
              </h1>

              <p style="margin:8px 0 0">
                Your reservation is confirmed
              </p>

            </div>

            <div style="
              border:2px solid #1C1410;
              border-top:0;
              padding:24px;
              border-radius:0 0 16px 16px;
            ">

              <p>
                Hi ${escapeHtml(name)},
              </p>

              <p>
                Your payment has been successfully
                verified.
              </p>

              <p>
                Please keep this email and show it
                at the event entrance.
              </p>

              <p>
                <strong>Ticket:</strong>
                ${escapeHtml(ticket.label)}
                <br>

                <strong>Ticket Number:</strong>
                ${escapeHtml(ticketNumber)}
                <br>

                <strong>Paystack Reference:</strong>
                ${escapeHtml(reference)}
              </p>

              <p>
                We can't wait to see you at
                Game Tribe Fest 2026.
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
    }
  );

  const responseText = await response.text();

  if (!response.ok) {
    console.error(
      'RESEND WEBHOOK ERROR:',
      responseText
    );

    throw new Error(
      'Resend failed: ' +
      response.status +
      ' ' +
      responseText
    );
  }

  console.log(
    'GAME TRIBE TICKET EMAIL SENT',
    {
      email,
      reference,
      ticketNumber
    }
  );

  return ticketNumber;
}


/*
 * Vercel needs the raw request body
 * so we can verify Paystack's signature.
 */
export const config = {
  api: {
    bodyParser: false
  }
};


function getRawBody(req) {
  return new Promise((resolve, reject) => {

    const chunks = [];

    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    req.on('error', reject);
  });
}


export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({
      message: 'Method not allowed.'
    });
  }

  if (!process.env.PAYSTACK_SECRET_KEY) {
    console.error(
      'PAYSTACK_SECRET_KEY is missing.'
    );

    return res.status(500).json({
      message: 'Webhook is not configured.'
    });
  }

  try {

    /*
     * Read raw request body.
     */
    const rawBody = await getRawBody(req);

    /*
     * Get Paystack signature.
     */
    const signature =
      req.headers['x-paystack-signature'];

    if (!signature) {
      console.error(
        'Missing Paystack signature.'
      );

      return res.status(401).json({
        message: 'Missing signature.'
      });
    }

    /*
     * Generate our own HMAC SHA512 signature.
     */
    const hash = crypto
      .createHmac(
        'sha512',
        process.env.PAYSTACK_SECRET_KEY
      )
      .update(rawBody)
      .digest('hex');

    /*
     * Compare signatures safely.
     */
    const signatureBuffer =
      Buffer.from(signature);

    const hashBuffer =
      Buffer.from(hash);

    if (
      signatureBuffer.length !==
      hashBuffer.length ||
      !crypto.timingSafeEqual(
        signatureBuffer,
        hashBuffer
      )
    ) {
      console.error(
        'Invalid Paystack signature.'
      );

      return res.status(401).json({
        message: 'Invalid signature.'
      });
    }

    /*
     * Parse Paystack event.
     */
    const event =
      JSON.parse(rawBody.toString('utf8'));

    console.log(
      'PAYSTACK WEBHOOK EVENT:',
      event.event
    );

    /*
     * We only care about successful charges.
     */
    if (event.event !== 'charge.success') {

      return res.status(200).json({
        received: true,
        ignored: true
      });
    }

    const transaction = event.data;

    /*
     * Basic transaction validation.
     */
    if (
      !transaction ||
      transaction.status !== 'success'
    ) {
      return res.status(200).json({
        received: true,
        ignored: true
      });
    }

    /*
     * Get ticket type from Paystack metadata.
     */
    const ticketType =
      transaction.metadata &&
      transaction.metadata.ticket_type;

    /* Prices now come from the admin dashboard (Supabase), with built-in fallback. */
    const TICKETS = await getTicketMap();
    const ticket = TICKETS[ticketType];

    if (!ticket) {

      console.error(
        'Unknown Game Tribe ticket type:',
        ticketType,
        transaction.reference
      );

      /*
       * Return 200 because Paystack successfully
       * delivered the webhook, but we cannot issue
       * a ticket for an unknown ticket type.
       */
      return res.status(200).json({
        received: true,
        processed: false,
        reason: 'Unknown ticket type.'
      });
    }

    /*
     * Make sure the payment is actually NGN.
     */
    if (transaction.currency !== 'NGN') {

      console.error(
        'Wrong currency:',
        transaction.currency,
        transaction.reference
      );

      return res.status(200).json({
        received: true,
        processed: false,
        reason: 'Invalid currency.'
      });
    }

    /*
     * Make sure the amount matches the ticket.
     */
    if (
      transaction.amount !==
      ticket.amount * 100
    ) {

      console.error(
        'Wrong amount:',
        transaction.amount,
        'Expected:',
        ticket.amount * 100,
        transaction.reference
      );

      return res.status(200).json({
        received: true,
        processed: false,
        reason: 'Invalid ticket amount.'
      });
    }

    /*
     * Get customer details directly
     * from Paystack.
     */
    const email =
      transaction.customer &&
      transaction.customer.email;

    const name =
      (transaction.metadata &&
        transaction.metadata.customer_name) ||

      (transaction.customer &&
        transaction.customer.first_name) ||

      'Game Tribe Guest';

    if (!email) {

      console.error(
        'No customer email:',
        transaction.reference
      );

      return res.status(200).json({
        received: true,
        processed: false,
        reason: 'No customer email.'
      });
    }

    /*
     * Send the actual ticket email.
     *
     * If Resend fails, return 500.
     * Paystack will retry the webhook.
     */

    /* Record the paid ticket for the admin dashboard (before the email, so a failed email never hides a sale). */
    await recordSale({
      reference: transaction.reference,
      ticket_number: 'GT-' + transaction.reference,
      name,
      email,
      phone: transaction.customer && transaction.customer.phone,
      ticket_type: ticketType,
      ticket_label: ticket.label,
      amount: ticket.amount,
      paid_at: transaction.paid_at,
      source: 'webhook',
      email_sent: false
    });
    const ticketNumber =
      await sendTicketEmail({
        email,
        name,
        ticket,
        reference: transaction.reference
      });
    await recordSale({ reference: transaction.reference, email_sent: true });

    console.log(
      'GAME TRIBE PAYMENT PROCESSED:',
      {
        reference: transaction.reference,
        email,
        ticket: ticket.label,
        ticketNumber
      }
    );

    return res.status(200).json({
      received: true,
      processed: true,
      ticketNumber,
      reference: transaction.reference
    });

  } catch (error) {

    console.error(
      'PAYSTACK WEBHOOK ERROR:',
      error
    );

    /*
     * IMPORTANT:
     * Returning 500 tells Paystack the webhook
     * failed, so Paystack can retry it.
     */
    return res.status(500).json({
      message: 'Webhook processing failed.'
    });
  }
}
