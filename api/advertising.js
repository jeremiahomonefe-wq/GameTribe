import { sb, supabaseConfigured } from './_lib/supabase.js';
import { allow, clientIp, turnstileOn, verifyTurnstile } from './_lib/security.js';
import { getContent } from './_lib/store.js';

const emailOk = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || ''));
const clean = (value, max) => String(value || '').trim().slice(0, max);

const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function sendMail(message) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', { method: 'POST', signal: controller.signal, headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, ...message }) });
    return response.ok;
  } catch { return false; } finally { clearTimeout(timer); }
}

/* Tell the team about a new brief and send the advertiser a confirmation.
   Email problems never stop the brief from being saved. */
async function notifyLead({ brand, contactName, email, phone, packageInterest, brief }) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return;
  let content = {};
  try { content = await getContent({ cache: true }); } catch { /* use environment settings */ }
  const page = (content.pages && content.pages.advertise) || {};
  const team = page.enquiryEmail || (content.links && content.links.email) || process.env.CONTACT_TO_EMAIL || process.env.ALERT_EMAIL;
  const rows = [['Brand', brand], ['Contact', contactName], ['Email', email], ['Phone', phone || 'Not given'], ['Package', packageInterest || 'Not chosen']];
  const lines = rows.map((r) => r[0] + ': ' + r[1]).join('\n') + '\n\n' + brief;
  const jobs = [];
  if (team) {
    jobs.push(sendMail({ to: [team], reply_to: email, subject: 'New advertising enquiry: ' + brand, text: 'A new brief arrived from the Advertise page.\n\n' + lines + '\n\nOpen the admin dashboard to follow up.', html: '<div style="font-family:Arial,sans-serif;max-width:560px;color:#1C1410"><h2 style="margin:0 0 12px">New advertising enquiry</h2><table style="border-collapse:collapse;width:100%">' + rows.map((r) => '<tr><td style="padding:6px 10px 6px 0;font-weight:700;vertical-align:top">' + esc(r[0]) + '</td><td style="padding:6px 0">' + esc(r[1]) + '</td></tr>').join('') + '</table><p style="white-space:pre-wrap;background:#FFF6E5;padding:14px;border-radius:12px">' + esc(brief) + '</p><p style="color:#675f59;font-size:13px">Reply to this email to answer ' + esc(contactName) + ' directly.</p></div>' }));
  }
  const first = esc(String(contactName).split(' ')[0] || 'there');
  jobs.push(sendMail({ to: [email], ...(team ? { reply_to: team } : {}), subject: 'We received your brief, ' + brand, text: 'Hi ' + String(contactName).split(' ')[0] + ',\n\nThanks for your interest in advertising with Game Tribe. We received your brief' + (packageInterest ? ' for ' + packageInterest : '') + ' and the partnerships team will review it and get back to you.\n\nYour message:\n' + brief + '\n\nGame Tribe Fest', html: '<div style="font-family:Arial,sans-serif;max-width:560px;color:#1C1410"><div style="background:#E8342A;color:#FFF6E5;padding:20px;border-radius:16px 16px 0 0"><h1 style="margin:0">GAME TRIBE</h1></div><div style="border:2px solid #1C1410;border-top:0;padding:22px;border-radius:0 0 16px 16px"><p>Hi ' + first + ',</p><p>Thanks for your interest in advertising with Game Tribe. We received your brief' + (packageInterest ? ' for <b>' + esc(packageInterest) + '</b>' : '') + ' and the partnerships team will review it and get back to you.</p><p style="white-space:pre-wrap;background:#FFF6E5;padding:14px;border-radius:12px">' + esc(brief) + '</p></div></div>' }));
  await Promise.all(jobs);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });
  if (!supabaseConfigured()) return res.status(503).json({ message: 'Advertising enquiries are not connected yet.' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  if (body.website) return res.status(200).json({ ok: true });
  const brand = clean(body.brand, 120), contactName = clean(body.name, 80), email = clean(body.email, 120), phone = clean(body.phone, 40), packageInterest = clean(body.package, 80);
  /* Extra details are kept inside the brief so no database change is needed. */
  const extras = [['Website', clean(body.siteUrl, 200)], ['Instagram', clean(body.instagram, 100)], ['Facebook', clean(body.facebook, 200)]].filter((x) => x[1]).map((x) => x[0] + ': ' + x[1]);
  const message = clean(body.brief, 3500);
  const brief = (message + (extras.length ? '\n\n' + extras.join('\n') : '')).slice(0, 4000);
  if (brand.length < 2 || contactName.length < 2 || !emailOk(email) || message.length < 10) return res.status(400).json({ message: 'Please complete your brand, name, email and a short brief.' });
  const ip = clientIp(req);
  if (!(await allow('advertising-lead', ip, 5, 15 * 60 * 1000))) return res.status(429).json({ message: 'Too many requests. Please try again shortly.' });
  if (turnstileOn() && !(await verifyTurnstile(body.turnstile, ip))) return res.status(400).json({ message: 'Please complete the check and try again.' });
  await sb('/rest/v1/advertising_leads', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { brand, contact_name: contactName, email, phone, package_interest: packageInterest, brief } });
  await notifyLead({ brand, contactName, email, phone, packageInterest, brief });
  return res.status(200).json({ ok: true, message: 'Thanks — the Game Tribe partnerships team will be in touch.' });
}
