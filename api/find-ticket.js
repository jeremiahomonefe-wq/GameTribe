/*
 * Public "Find my ticket": a buyer types the email or phone number they paid
 * with. If we have tickets for it, we email them to the address ON FILE.
 * The answer on screen is always the same, so nobody can use this page to find
 * out whose email or phone has tickets, and nothing is ever sent to an
 * address th e visitor typed unless it is already the one on file.
 */
import { listSales } from './_lib/store.js';
import { supabaseConfigured } from './_lib/supabase.js';
import { allow, clientIp, turnstileOn, verifyTurnstile } from './_lib/security.js';
import { sendTicketsEmail, itemFromSale, siteOrigin } from './_lib/tickets.js';
import { normEmail, validEmail } from './_lib/team.js';
import { reportError } from './_lib/monitor.js';

const SAME_ANSWER = {
  ok: true,
  message: 'If we found tickets for that email or phone number, we have just sent them to the email address used when buying. Please check your inbox and your spam folder. It can take a minute or two.'
};

const last10 = (v) => String(v || '').replace(/\D/g, '').slice(-10);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed.' });
  }
  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch (e) { return {}; } })() : (req.body || {});
  const contact = String(body.contact || '').trim().slice(0, 200);
  const ip = clientIp(req);

  const isEmail = contact.includes('@');
  const email = isEmail ? normEmail(contact) : '';
  const phone = isEmail ? '' : last10(contact);
  if (isEmail ? !validEmail(email) : phone.length < 10) {
    return res.status(400).json({ message: 'Enter the email address, or the phone number, you used when paying.' });
  }
  if (!(await allow('find-ip', ip, 6, 60 * 60 * 1000))) {
    return res.status(429).json({ message: 'Too many tries. Please wait a while, or contact us and we will help.' });
  }
  if (turnstileOn() && !(await verifyTurnstile(body.turnstile, ip))) {
    return res.status(400).json({ message: 'Please complete the check above the button and try again.' });
  }
  if (!(await allow('find-all', 'all', 120, 60 * 60 * 1000))) {
    return res.status(429).json({ message: 'We are getting a lot of requests right now. Please try again later.' });
  }
  /* The same email/phone can only trigger 3 emails an hour, so nobody can use this to spam a buyer. */
  const target = isEmail ? 'e:' + email : 'p:' + phone;
  if (!(await allow('find-target', target, 3, 60 * 60 * 1000))) return res.status(200).json(SAME_ANSWER);

  if (!supabaseConfigured()) return res.status(200).json(SAME_ANSWER);
  try {
    const mine = (await listSales()).filter((s) => s.email && (isEmail ? normEmail(s.email) === email : last10(s.phone) === phone));
    const byAddress = new Map();
    for (const sale of mine.slice(0, 20)) {
      const key = normEmail(sale.email);
      byAddress.set(key, [...(byAddress.get(key) || []), sale]);
    }
    const origin = siteOrigin(req);
    for (const [to, sales] of byAddress) {
      await sendTicketsEmail({
        to,
        name: sales[0].name || 'there',
        items: sales.slice(0, 10).map(itemFromSale),
        origin
      });
    }
  } catch (e) {
    await reportError('find-ticket', e, req);
  }
  return res.status(200).json(SAME_ANSWER);
}
