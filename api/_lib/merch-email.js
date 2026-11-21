import { sb } from './supabase.js';
import { escapeHtml } from './tickets.js';

export async function sendMerchOrderEmail(order) {
  if (!order || order.email_sent || !order.email) return false;
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) throw new Error('RESEND_API_KEY and RESEND_FROM_EMAIL are required to send merch confirmations.');
  const items = Array.isArray(order.items) ? order.items : [];
  const amount = '₦' + Number(order.amount || 0).toLocaleString('en-NG');
  const rows = items.map((item) => '<li>' + escapeHtml((item.quantity || 1) + ' × ' + (item.name || 'Merch item')) + '</li>').join('');
  const response = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': 'gametribe-merch-' + order.reference },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [order.email],
      subject: 'Your Game Tribe merch pickup is confirmed',
      html: '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1C1410"><div style="background:#E8342A;color:#FFF6E5;padding:24px;border-radius:16px 16px 0 0"><h1 style="margin:0">GAME TRIBE</h1><p style="margin:8px 0 0">Merch pickup confirmed</p></div><div style="border:2px solid #1C1410;border-top:0;padding:24px;border-radius:0 0 16px 16px"><p>Hi ' + escapeHtml(order.name || 'there') + ',</p><p>Your payment has been confirmed. We will have your order ready for pickup at Game Tribe Fest.</p><ul>' + rows + '</ul><p><strong>Total paid:</strong> ' + amount + '<br><strong>Pickup reference:</strong> ' + escapeHtml(order.reference) + '</p><p>Please bring this email or your Paystack reference when collecting your items.</p></div></div>',
      text: 'Game Tribe merch pickup confirmed\n\nHi ' + (order.name || 'there') + ',\n\nYour payment has been confirmed. Your order will be ready for pickup at Game Tribe Fest.\n\nItems:\n' + items.map((item) => (item.quantity || 1) + ' × ' + (item.name || 'Merch item')).join('\n') + '\n\nTotal paid: ' + amount + '\nPickup reference: ' + order.reference + '\n\nBring this email or your Paystack reference when collecting.'
    })
  });
  if (!response.ok) throw new Error('Merch confirmation email could not be sent.');
  await sb('/rest/v1/merch_orders?reference=eq.' + encodeURIComponent(order.reference), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { email_sent: true } });
  return true;
}
