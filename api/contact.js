import { getContent } from './_lib/store.js';
import { allow, clientIp, turnstileOn, verifyTurnstile } from './_lib/security.js';
import { reportError } from './_lib/monitor.js';

/* Contact form: emails the message to your contact address using the same
   Resend setup as the ticket emails (RESEND_API_KEY + RESEND_FROM_EMAIL). */

const esc = (v) =>
  String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  /* hidden "website" field: real people leave it empty, bots fill it */
  if (body.website) return res.status(200).json({ ok: true });

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const subject = String(body.subject || '').trim();
  const message = String(body.message || '').trim();

  if (name.length < 2 || name.length > 80) return res.status(400).json({ message: 'Please enter your name.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) return res.status(400).json({ message: 'Please enter a valid email address.' });
  if (subject.length < 2 || subject.length > 120) return res.status(400).json({ message: 'Please add a subject.' });
  if (message.length < 10 || message.length > 4000) return res.status(400).json({ message: 'Please write a message of at least 10 characters.' });

  /* Limits are stored in Supabase, so they hold across all servers: 5 per person per 15 minutes... */
  const ip = clientIp(req);
  if (!(await allow('contact', ip, 5, 15 * 60 * 1000))) {
    return res.status(429).json({ message: 'Too many messages. Please try again in a little while.' });
  }

  /* ...and, if Cloudflare Turnstile is switched on (TURNSTILE_SECRET_KEY), a human check. */
  if (turnstileOn() && !(await verifyTurnstile(body.turnstile, ip))) {
    return res.status(400).json({ message: 'Please complete the check above the button and try again.' });
  }

  /* ...and never more than 60 in an hour overall, so nobody can flood your inbox. */
  if (!(await allow('contact', 'all', 60, 60 * 60 * 1000))) {
    return res.status(429).json({ message: 'We are getting a lot of messages right now. Please try again later or email us directly.' });
  }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return res.status(503).json({ message: 'Our contact form is not set up yet. Please email us directly.' });
  }

  const content = await getContent();
  const to = (content.links && content.links.email) || process.env.CONTACT_TO_EMAIL;
  if (!to) return res.status(503).json({ message: 'Our contact form is not set up yet. Please email us directly.' });

  try {
    const r = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [to],
        reply_to: email,
        subject: '[Game Tribe website] ' + subject,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.5">
<h2 style="margin:0 0 12px">New message from the Game Tribe website</h2>
<p><b>Name:</b> ${esc(name)}<br><b>Email:</b> ${esc(email)}<br><b>Subject:</b> ${esc(subject)}</p>
<p style="white-space:pre-wrap;border-left:4px solid #FBB614;padding-left:12px">${esc(message)}</p>
<p style="color:#777;font-size:12px">Reply to this email to answer ${esc(name)} directly.</p></div>`,
        text: `New message from the Game Tribe website\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`
      })
    });
    if (!r.ok) {
      console.error('CONTACT RESEND ERROR:', r.status, await r.text());
      return res.status(502).json({ message: 'We couldn’t send your message right now. Please email us directly.' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('CONTACT ERROR:', e);
    await reportError('contact', e, req);
    return res.status(502).json({ message: 'We couldn’t send your message right now. Please email us directly.' });
  }
}
