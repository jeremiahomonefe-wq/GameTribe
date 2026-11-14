import { getTicketMap, recordSale } from './_lib/store.js';
import { checkPurchase, saleFields, sendTicketEmail, ticketNumberFor, cleanName, cleanPhone, siteOrigin } from './_lib/tickets.js';
import { alreadyEmailed } from './_lib/checkin.js';
import { allow, clientIp } from './_lib/security.js';
import { reportError, checkOvercapacity } from './_lib/monitor.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed.' });
  }

  if (!process.env.PAYSTACK_SECRET_KEY) {
    return res.status(500).json({ message: 'PAYSTACK_SECRET_KEY is not configured.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const reference = String(body.reference || '');
    const buyer = body.buyer || {};

    if (!reference) {
      return res.status(400).json({ message: 'Payment reference is required.' });
    }
    if (!/^[\w.\-=]{3,100}$/.test(reference)) {
      return res.status(400).json({ message: 'Invalid payment reference.' });
    }
    /* A real buyer calls this once per payment; stop anyone hammering it. */
    if (!(await allow('verify', clientIp(req), 30, 10 * 60 * 1000))) {
      return res.status(429).json({ message: 'Too many requests. Please wait a few minutes and try again.' });
    }

    /* Verify the transaction directly with Paystack. */
    const paystackResponse = await fetch(
      'https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference),
      { headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY } }
    );
    const paystack = await paystackResponse.json();
    const transaction = paystack.data;

    if (!paystackResponse.ok || !paystack.status || !transaction || transaction.status !== 'success') {
      return res.status(400).json({ message: 'Paystack has not confirmed this payment.' });
    }

    /* Ticket type and quantity come from Paystack metadata (never trust the
       browser), and the amount paid must equal price x quantity. */
    const TICKETS = await getTicketMap();
    const purchase = checkPurchase(transaction, TICKETS);
    if (!purchase.ok) {
      return res.status(purchase.status).json({ message: purchase.message });
    }

    const transactionEmail = transaction.customer && transaction.customer.email;
    if (!transactionEmail) {
      return res.status(400).json({ message: 'No customer email was found on the Paystack transaction.' });
    }

    /* Paystack is the source of truth for email; the browser may send the name. */
    const email = transactionEmail;
    const name = cleanName(
      buyer.name ||
      (transaction.metadata && transaction.metadata.customer_name) ||
      (transaction.customer && transaction.customer.first_name)
    );
    const phone = cleanPhone(buyer.phone || (transaction.customer && transaction.customer.phone));

    /* The webhook may have got here first and already emailed the ticket: do not send it again. */
    if (await alreadyEmailed(transaction.reference)) {
      return res.status(200).json({
        verified: true,
        ticketNumber: ticketNumberFor(transaction.reference),
        reference: transaction.reference,
        ticket: purchase.ticket.label,
        quantity: purchase.quantity,
        admitsTotal: purchase.admitsTotal
      });
    }

    /* Record the sale  BEFORE the email, so a failed email never hides a sale. */
    await recordSale({
      reference: transaction.reference,
      ticket_number: ticketNumberFor(transaction.reference),
      name,
      email,
      phone,
      ...saleFields(purchase),
      paid_at: transaction.paid_at,
      source: 'browser',
      email_sent: false
    });
    await checkOvercapacity();

    const ticketNumber = await sendTicketEmail({
      email,
      name,
      ticket: purchase.ticket,
      reference: transaction.reference,
      quantity: purchase.quantity,
      admitsTotal: purchase.admitsTotal,
      origin: siteOrigin(req)
    });
    await recordSale({ reference: transaction.reference, email_sent: true, qr_sent_at: new Date().toISOString() });

    return res.status(200).json({
      verified: true,
      ticketNumber,
      reference: transaction.reference,
      ticket: purchase.ticket.label,
      quantity: purchase.quantity,
      admitsTotal: purchase.admitsTotal
    });
  } catch (error) {
    console.error('VERIFY PAYMENT ERROR:', error);
    await reportError('verify-payment', error, req);
    return res.status(500).json({
      message: 'Payment verification failed.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
