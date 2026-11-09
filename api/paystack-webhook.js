
import crypto from 'crypto';
import { processSuccessfulPayment } from './_lib/process-payment.js';

export const config = {
  api: {
    bodyParser: false
  }
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      message: 'Method not allowed.'
    });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!secret) {
    console.error('PAYSTACK_SECRET_KEY is missing.');

    return res.status(500).json({
      message: 'Webhook is not configured.'
    });
  }

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['x-paystack-signature'];

    if (!signature) {
      return res.status(401).json({
        message: 'Missing Paystack signature.'
      });
    }

    const expected = crypto
      .createHmac('sha512', secret)
      .update(rawBody)
      .digest();

    let supplied;

    try {
      supplied = Buffer.from(String(signature), 'hex');
    } catch {
      return res.status(401).json({
        message: 'Invalid signature.'
      });
    }

    if (
      supplied.length !== expected.length ||
      !crypto.timingSafeEqual(supplied, expected)
    ) {
      console.error('Invalid Paystack signature.');

      return res.status(401).json({
        message: 'Invalid signature.'
      });
    }

    const event = JSON.parse(rawBody.toString('utf8'));

    console.log('PAYSTACK EVENT:', event.event);

    if (event.event !== 'charge.success') {
      return res.status(200).json({
        received: true,
        ignored: true
      });
    }

    const result = await processSuccessfulPayment(
      event.data,
      'webhook'
    );

    console.log('PAYMENT PROCESSED:', result);

    return res.status(200).json({
      received: true,
      ...result
    });

  } catch (error) {
    console.error('PAYSTACK WEBHOOK PROCESSING FAILED:', {
      message: error.message,
      stack: error.stack
    });

    /*
     * Database or payment-processing failures return 500.
     * Paystack can retry these webhook deliveries.
     */
    return res.status(500).json({
      message: 'Payment processing failed.'
    });
  }
}
