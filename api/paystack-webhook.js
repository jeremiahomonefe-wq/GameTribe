import crypto from 'crypto';

import { getTicketMap, recordSale } from './_lib/store.js';
import { checkPurchase, saleFields, sendTicketEmail, ticketNumberFor, cleanName, cleanPhone, siteOrigin } from './_lib/tickets.js';
import { alreadyEmailed } from './_lib/checkin.js';
import { reportError, checkOvercapacity } from './_lib/monitor.js';

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
     * Ticket type and quantity come from Paystack metadata, and the amount
     * paid must equal unit price x quantity (checked in _lib/tickets.js).
     * Return 200 on rejection: Paystack delivered the webhook fine, we just
     * cannot issue tickets for it, and a retry would not change that.
     */
    const TICKETS = await getTicketMap();
    const purchase = checkPurchase(transaction, TICKETS);

    if (!purchase.ok) {
      console.error('Game Tribe webhook rejected:', purchase.reason, transaction.reference);
      return res.status(200).json({
        received: true,
        processed: false,
        reason: purchase.reason
      });
    }

    /*
     * Get customer details directly
     * from Paystack.
     */
    const email =
      transaction.customer &&
      transaction.customer.email;

    const name = cleanName(
      (transaction.metadata && transaction.metadata.customer_name) ||
      (transaction.customer && transaction.customer.first_name)
    );

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
    if (await alreadyEmailed(transaction.reference)) {
      return res.status(200).json({ received: true, processed: true, alreadyDone: true });
    }

    await recordSale({
      reference: transaction.reference,
      ticket_number: ticketNumberFor(transaction.reference),
      name,
      email,
      phone: cleanPhone(transaction.customer && transaction.customer.phone),
      ...saleFields(purchase),
      paid_at: transaction.paid_at,
      source: 'webhook',
      email_sent: false
    }, { strict: true }); /* if the database is down this throws -> 500 -> Paystack retries later */
    await checkOvercapacity();
    const ticketNumber =
      await sendTicketEmail({
        email,
        name,
        ticket: purchase.ticket,
        reference: transaction.reference,
        quantity: purchase.quantity,
        admitsTotal: purchase.admitsTotal,
        origin: siteOrigin(req)
      });
    await recordSale({ reference: transaction.reference, email_sent: true });

    console.log(
      'GAME TRIBE PAYMENT PROCESSED:',
      {
        reference: transaction.reference,
        email,
        ticket: purchase.ticket.label,
        quantity: purchase.quantity,
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
    await reportError('paystack-webhook', error, req);

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
