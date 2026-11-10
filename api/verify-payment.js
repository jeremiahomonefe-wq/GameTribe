import { getTicketMap, recordSale } from './_lib/store.js';
import { checkPurchase, saleFields, sendTicketEmail, ticketNumberFor } from './_lib/tickets.js';

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
    const name =
      buyer.name ||
      (transaction.metadata && transaction.metadata.customer_name) ||
      (transaction.customer && transaction.customer.first_name) ||
      'Game Tribe Guest';

    /* Record the sale BEFORE the email, so a failed email never hides a sale. */
    await recordSale({
      reference: transaction.reference,
      ticket_number: ticketNumberFor(transaction.reference),
      name,
      email,
      phone: buyer.phone || (transaction.customer && transaction.customer.phone),
      ...saleFields(purchase),
      paid_at: transaction.paid_at,
      source: 'browser',
      email_sent: false
    });

    const ticketNumber = await sendTicketEmail({
      email,
      name,
      ticket: purchase.ticket,
      reference: transaction.reference,
      quantity: purchase.quantity,
      admitsTotal: purchase.admitsTotal
    });
    await recordSale({ reference: transaction.reference, email_sent: true });

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
    return res.status(500).json({
      message: 'Payment verification failed.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
