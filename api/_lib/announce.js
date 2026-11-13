/*
 * Announcements: emails to everyone who holds a ticket (or is on the waitlist).
 * The list of recipients is frozen when the announcement is created and sent in
 * small chunks, so it works within serverless time limits and carries on if the
 * browser tab is closed. Recipients always come from the database, never from the browser.
 */
import { sb } from './supabase.js';
import { listSales } from './store.js';
import { escapeHtml } from './tickets.js';
import { normEmail, validEmail } from './team.js';

export const AUDIENCES = {
  tickets_all: 'Everyone with a ticket',
  tickets_not_in: 'Ticket holders who have not fully checked in yet',
  waitlist: 'The waitlist (people who have not been told yet)'
};
export const CHUNK = 40;
export const MAX_RECIPIENTS = 2000;

const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || 'there';

/* -> [{email, name, phone }] with duplicates removed (one person with 3 tickets gets one email) */
export async function recipientsFor(audience) {
  const out = new Map();
  if (audience === 'waitlist') {
    const rows = (await sb('/rest/v1/waitlist?select=email,name,phone&notified_at=is.null&order=id.asc&limit=5000')) || [];
    for (const r of rows) {
      const email = normEmail(r.email);
      if (validEmail(email) && !out.has(email)) out.set(email, { email, name: r.name || '', phone: r.phone || '' });
    }
    return [...out.values()];
  }
  const sales = await listSales();
  for (const s of sales) {
    const email = normEmail(s.email);
    if (!validEmail(email)) continue;
    const notIn = (Number(s.admitted_count) || 0) < (Number(s.admits_total) || 1);
    if (audience === 'tickets_not_in' && !notIn) continue;
    if (!out.has(email)) out.set(email, { email, name: s.name || '', phone: s.phone || '' });
  }
  return [...out.values()];
}

const linkify = (escaped) => escaped.replace(/(https?:\/\/[^\s<]+)/g, (m) => {
  const trail = (m.match(/[.,;:!?)]+$/) || [''])[0];
  const url = trail ? m.slice(0, -trail.length) : m;
  return '<a href="' + url + '" style="color:#E8342A;font-weight:bold">' + url + '</a>' + trail;
});

export function renderAnnouncement({ subject, body, name, audience }) {
  const who = firstName(name);
  const plain = String(body).replace(/\{name\}/gi, who);
  const html = linkify(escapeHtml(plain)).replace(/\r?\n/g, '<br>');
  const why = audience === 'waitlist' ? 'You are receiving this because you joined the Game Tribe Fest 2026 waitlist.' : 'You are receiving this because you hold a ticket for Game Tribe Fest 2026.';
  return {
    subject: String(subject).replace(/\{name\}/gi, who),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1C1410">
        <div style="background:#E8342A;color:#FFF6E5;padding:22px 24px;border-radius:16px 16px 0 0;"><h1 style="margin:0;font-size:22px">GAME TRIBE</h1></div>
        <div style="border:2px solid #1C1410;border-top:0;padding:24px;border-radius:0 0 16px 16px;line-height:1.55">
          <p style="margin-top:0">Hi ${escapeHtml(who)},</p>
          <p>${html}</p>
          <p style="font-size:12px;opacity:.7;margin-bottom:0">${escapeHtml(why)}</p>
        </div>
      </div>`,
    text: 'Hi ' + who + ',\n\n' + plain + '\n\n' + why
  };
}

function withReplyTo(msg) {
  const reply = process.env.CONTACT_TO_EMAIL;
  return reply ? { ...msg, reply_to: reply } : msg;
}

async function sendOne(msg) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(msg)
  });
  if (!r.ok) throw new Error('Resend ' + r.status + ': ' + (await r.text()).slice(0, 120));
}

/* Sends a chunk; returns { sent, failed, errors[] }. If the batch is refused, falls back to one by one so one bad address cannot block the rest. */
export async function sendChunk({ recipients, subject, body, audience, idempotencyKey }) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) throw new Error('RESEND_API_KEY and RESEND_FROM_EMAIL must be set to send email.');
  const messages = recipients.map((r) => {
    const m = renderAnnouncement({ subject, body, name: r.name, audience });
    return withReplyTo({ from: process.env.RESEND_FROM_EMAIL, to: [r.email], subject: m.subject, html: m.html, text: m.text });
  });
  try {
    const r = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
      body: JSON.stringify(messages)
    });
    if (r.ok) return { sent: messages.length, failed: 0, errors: [] };
  } catch (e) { /* fall through to one by one */ }
  const result = { sent: 0, failed: 0, errors: [] };
  for (let i = 0; i < messages.length; i++) {
    try { await sendOne(messages[i]); result.sent++; } catch (e) { result.failed++; result.errors.push(recipients[i].email + ': ' + e.message); }
  }
  return result;
}

export async function sendTest({ to, subject, body, audience }) {
  const m = renderAnnouncement({ subject: '[TEST] ' + subject, body, name: 'Test', audience });
  await sendOne(withReplyTo({ from: process.env.RESEND_FROM_EMAIL, to: [to], subject: m.subject, html: m.html, text: m.text }));
}
