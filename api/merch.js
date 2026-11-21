import crypto from 'crypto';
import { sb, supabaseConfigured } from './_lib/supabase.js';
import { allow, clientIp } from './_lib/security.js';

const PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || 'pk_live_9fc882239cf6a6cd6832b2e100781f3ae93117b6';
const emailOk = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || ''));
const clean = (value, max) => String(value || '').trim().slice(0, max);
const reference = () => 'GTM-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(5).toString('hex').toUpperCase();

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}
async function orderFor(referenceValue) {
  const rows = await sb('/rest/v1/merch_orders?reference=eq.' + encodeURIComponent(referenceValue) + '&select=*&limit=1');
  return rows && rows[0];
}
async function confirm(referenceValue) {
  const order = await orderFor(referenceValue);
  if (!order) throw new Error('We could not find this order.');
  if (['paid', 'ready', 'collected'].includes(order.status)) return order;
  const response = await fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(referenceValue), { headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY } });
  const result = await response.json().catch(() => ({}));
  const tx = result.data;
  if (!response.ok || !result.status || !tx || tx.status !== 'success') throw new Error('Paystack has not confirmed this payment.');
  if (tx.currency !== 'NGN' || Number(tx.amount) !== Number(order.amount) * 100) throw new Error('The payment amount does not match this order.');
  const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata || '{}') : (tx.metadata || {});
  if (metadata.order_kind !== 'merch' || metadata.merch_reference !== referenceValue) throw new Error('This payment does not belong to this merch order.');
  const paid = await sb('/rest/v1/rpc/pay_merch_order', { method: 'POST', body: { p_reference: referenceValue } });
  return paid;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const action = String((req.query && req.query.action) || 'catalog');
  if (!supabaseConfigured()) return res.status(503).json({ message: 'The merch store is not connected yet.' });
  try {
    if (req.method === 'GET' && action === 'catalog') {
      const products = await sb('/rest/v1/merch_products?active=eq.true&select=id,name,description,category,price,stock,image&stock=gt.0&order=created_at.asc');
      return res.status(200).json({ products: products || [], paystackPublicKey: PUBLIC_KEY });
    }
    const body = await readBody(req);
    if (req.method === 'POST' && action === 'checkout') {
      const ip = clientIp(req);
      if (!(await allow('merch-checkout', ip, 8, 15 * 60 * 1000))) return res.status(429).json({ message: 'Please wait a few minutes before starting another checkout.' });
      const name = clean(body.name, 80), email = clean(body.email, 120), phone = clean(body.phone, 40);
      const items = Array.isArray(body.items) ? body.items.slice(0, 20).map((item) => ({ id: clean(item.id, 80), quantity: Number(item.quantity) })) : [];
      if (name.length < 2 || !emailOk(email) || phone.length < 7) return res.status(400).json({ message: 'Enter your name, a valid email address and phone number.' });
      const order = await sb('/rest/v1/rpc/reserve_merch_order', { method: 'POST', body: { p_reference: reference(), p_name: name, p_email: email, p_phone: phone, p_items: items } });
      return res.status(200).json({ ...order, paystackPublicKey: PUBLIC_KEY });
    }
    if (req.method === 'POST' && action === 'confirm') {
      if (!process.env.PAYSTACK_SECRET_KEY) return res.status(503).json({ message: 'Payment confirmation is not configured yet.' });
      const order = await confirm(clean(body.reference, 100));
      return res.status(200).json({ order });
    }
    if (req.method === 'POST' && action === 'cancel') {
      await sb('/rest/v1/rpc/cancel_merch_order', { method: 'POST', body: { p_reference: clean(body.reference, 100) } });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ message: 'Method not allowed.' });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Could not process the merch order.' });
  }
}
