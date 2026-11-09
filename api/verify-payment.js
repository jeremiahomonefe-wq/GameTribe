
import { processSuccessfulPayment } from './_lib/process-payment.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      message: 'Method not allowed.'
    });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!secret) {
    return res.status(500).json({
      message: 'PAYSTACK_SECRET_KEY is not configured.'
    });
  }

  try {
    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : (req.body || {});

    const reference = String(body.reference || '').trim();

    if (!reference) {
      return res.status(400).json({
        message: 'Payment reference is required.'
      });
    }

    const response = await fetch(
      'https://api.paystack.co/transaction/verify/' +
      encodeURIComponent(reference),
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + secret
        }
      }
    );

    const result = await response.json();

    if (
      !response.ok ||
      !result.status ||
      !result.data ||
      result.data.status !== 'success'
    ) {
      return res.status(400).json({
        message: 'Paystack has not confirmed this payment.'
      });
    }

    if (result.data.reference !== reference) {
      return res.status(400).json({
        message: 'Payment reference mismatch.'
      });
    }

    const processed = await processSuccessfulPayment(
      result.data,
      'browser'
    );

    return res.status(200).json({
      verified: true,
      ...processed
    });

  } catch (error) {
    console.error('VERIFY PAYMENT ERROR:', {
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      message: 'Payment verification or recording failed.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined
    });
  }
}
