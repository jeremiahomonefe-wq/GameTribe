import { sb } from './supabase.js';
import { escapeHtml } from './tickets.js';
import { ticketQrPng } from './qr.js';

export async function sendMerchOrderEmail(order, { force = false } = {}) {
  if (!order || (!force && order.email_sent) || !order.email) return false;
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) throw new Error('RESEND_API_KEY and RESEND_FROM_EMAIL are required to send merch confirmations.');
  const items = Array.isArray(order.items) ? order.items : [];
  const amount = '₦' + Number(order.amount || 0).toLocaleString('en-NG');
  const rows = items.map((item) => '<li>' + escapeHtml((item.quantity || 1) + ' × ' + (item.name || 'Merch item') + (item.colour ? ' · ' + item.colour : '') + (item.size ? ' · ' + item.size : '') + (item.batch_id ? ' · Batch ' + item.batch_id : '')) + '</li>').join('');
  const pickup = order.pickup_code || order.reference;
  const attachments = [];
  try {
    attachments.push({ filename: 'gametribe-merch-pickup-qr.png', content: ticketQrPng(order.reference).toString('base64'), content_type: 'image/png', content_id: 'merch-pickup-qr' });
  } catch (error) { console.error('MERCH QR ERROR:', error.message); }
  const response = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': 'gametribe-merch-' + order.reference },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [order.email],
      subject: 'Your Game Tribe merch pickup is confirmed',
      attachments: attachments.length ? attachments : undefined,
      html: '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1C1410"><div style="background:#E8342A;color:#FFF6E5;padding:24px;border-radius:16px 16px 0 0"><h1 style="margin:0">GAME TRIBE</h1><p style="margin:8px 0 0">Merch pickup confirmed</p></div><div style="border:2px solid #1C1410;border-top:0;padding:24px;border-radius:0 0 16px 16px"><p>Hi ' + escapeHtml(order.name || 'there') + ',</p><p>Your payment has been confirmed. We will have your order ready for pickup at Game Tribe Fest.</p><ul>' + rows + '</ul><p><strong>Total paid:</strong> ' + amount + '<br><strong>Pickup code:</strong> ' + escapeHtml(pickup) + '<br><strong>Order reference:</strong> ' + escapeHtml(order.reference) + '</p>' + (attachments.length ? '<p style="text-align:center"><img src="cid:merch-pickup-qr" width="180" height="180" alt="Pickup QR code"></p>' : '') + '<p>Show this email or its QR code when collecting your items.</p></div></div>',
      text: 'Game Tribe merch pickup confirmed\n\nHi ' + (order.name || 'there') + ',\n\nYour payment has been confirmed. Your order will be ready for pickup at Game Tribe Fest.\n\nItems:\n' + items.map((item) => (item.quantity || 1) + ' × ' + (item.name || 'Merch item') + (item.colour ? ' · ' + item.colour : '') + (item.size ? ' · ' + item.size : '') + (item.batch_id ? ' · Batch ' + item.batch_id : '')).join('\n') + '\n\nTotal paid: ' + amount + '\nPickup code: ' + pickup + '\nOrder reference: ' + order.reference + '\n\nShow this email or its QR code when collecting.'
    })
  });
  if (!response.ok) throw new Error('Merch confirmation email could not be sent.');
  await sb('/rest/v1/merch_orders?reference=eq.' + encodeURIComponent(order.reference), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { email_sent: true } });
  return true;
}
