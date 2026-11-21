import { sb, supabaseConfigured } from './_lib/supabase.js';
import { allow, clientIp, turnstileOn, verifyTurnstile } from './_lib/security.js';

const emailOk = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || ''));
const clean = (value, max) => String(value || '').trim().slice(0, max);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });
  if (!supabaseConfigured()) return res.status(503).json({ message: 'Advertising enquiries are not connected yet.' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  if (body.website) return res.status(200).json({ ok: true });
  const brand = clean(body.brand, 120), contactName = clean(body.name, 80), email = clean(body.email, 120), phone = clean(body.phone, 40), packageInterest = clean(body.package, 80), brief = clean(body.brief, 4000);
  if (brand.length < 2 || contactName.length < 2 || !emailOk(email) || brief.length < 10) return res.status(400).json({ message: 'Please complete your brand, name, email and a short brief.' });
  const ip = clientIp(req);
  if (!(await allow('advertising-lead', ip, 5, 15 * 60 * 1000))) return res.status(429).json({ message: 'Too many requests. Please try again shortly.' });
  if (turnstileOn() && !(await verifyTurnstile(body.turnstile, ip))) return res.status(400).json({ message: 'Please complete the check and try again.' });
  await sb('/rest/v1/advertising_leads', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { brand, contact_name: contactName, email, phone, package_interest: packageInterest, brief } });
  return res.status(200).json({ ok: true, message: 'Thanks — the Game Tribe partnerships team will be in touch.' });
}
