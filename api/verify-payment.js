vconst TICKETS = {
  early_single: {
    label: 'Early Bird — Single',
    amount: 5000
  },
  early_group: {
    label: 'Early Bird — Group of 4',
    amount: 18000
  },
  wave_single: {
    label: 'First Wave — Single',
    amount: 7000
  },
  wave_group: {
    label: 'First Wave — Group of 4',
    amount: 26000
  }
};

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

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',

    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json',

      // Prevent duplicate emails if Paystack retries the webhook
      'Idempotency-Key': 'gametribe-ticket-' + reference
    },

    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [email],

      subject: 'Your Game Tribe Ticket — ' + ticketNumber,

      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1C1410">

          <div style="
            background:#E8342A;
            color:#FFF6E5;
            padding:24px;
            border-radius:16px 16px 0 0;
          ">
            <h1 style="margin:0">GAME TRIBE</h1>

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

            <p>Hi ${escapeHtml(name)},</p>

            <p>
              Your payment has been successfully verified.
              Please keep this email and show it at the event entrance.
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
    console.error('RESEND ERROR:', responseText);

    throw new Error(
      'Resend failed: ' +
      response.status +
      ' ' +
      responseText
    );
  }

  console.log('Ticket email sent:', {
    email,
    reference,
    ticketNumber
  });

  return ticketNumber;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      message: 'Method not allowed.'
    });
  }

  if (!process.env.PAYSTACK_SECRET_KEY) {
    return res.status(500).json({
      message: 'PAYSTACK_SECRET_KEY is not configured.'
    });
  }

  try {
    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : (req.body || {});

    const reference = String(body.reference || '');
    const buyer = body.buyer || {};

    if (!reference) {
      return res.status(400).json({
        message: 'Payment reference is required.'
      });
    }

    /*
     * Verify the transaction directly with Paystack.
     */
    const paystackResponse = await fetch(
      'https://api.paystack.co/transaction/verify/' +
      encodeURIComponent(reference),
      {
        headers: {
          Authorization:
            'Bearer ' + process.env.PAYSTACK_SECRET_KEY
        }
      }
    );

    const paystack = await paystackResponse.json();
    const transaction = paystack.data;

    if (
      !paystackResponse.ok ||
      !paystack.status ||
      !transaction ||
      transaction.status !== 'success'
    ) {
      return res.status(400).json({
        message: 'Paystack has not confirmed this payment.'
      });
    }

    /*
     * Get ticket type from Paystack metadata.
     * Do NOT trust the browser for the ticket type.
     */
    const ticketType =
      transaction.metadata &&
      transaction.metadata.ticket_type;

    const ticket = TICKETS[ticketType];

    if (!ticket) {
      return res.status(400).json({
        message: 'Invalid ticket type in Paystack transaction.'
      });
    }

    /*
     * Validate currency and amount.
     */
    if (
      transaction.currency !== 'NGN' ||
      transaction.amount !== ticket.amount * 100
    ) {
      return res.status(400).json({
        message: 'Payment amount does not match this ticket.'
      });
    }

    /*
     * Get the customer email from Paystack.
     */
    const transactionEmail =
      transaction.customer &&
      transaction.customer.email;

    if (!transactionEmail) {
      return res.status(400).json({
        message: 'No customer email was found on the Paystack transaction.'
      });
    }

    /*
     * The browser may still send the buyer name.
     * Paystack remains the source of truth for email.
     */
    const email = transactionEmail;

    const name =
      buyer.name ||
      (transaction.metadata &&
        transaction.metadata.customer_name) ||
      (transaction.customer &&
        transaction.customer.first_name) ||
      'Game Tribe Guest';

    /*
     * Send ticket email.
     */
    const ticketNumber = await sendTicketEmail({
      email,
      name,
      ticket,
      reference: transaction.reference
    });

    return res.status(200).json({
      verified: true,
      ticketNumber,
      reference: transaction.reference,
      ticket: ticket.label
    });

  } catch (error) {

    console.error('VERIFY PAYMENT ERROR:', error);

    return res.status(500).json({
      message: 'Payment verification failed.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined
    });
  }
}
