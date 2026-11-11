/*
 * Security helpers shared by the API:
 *  - persistent rate limiting (stored in Supabase, so it works across all
 *    server instances; falls back to server memory if the table is missing)
 *  - audit log of important actions
 *  - "sign out everywhere" (session epoch) and the 2-step login secret
 *  - alert emails to the owner
 */
import { sb, supabaseConfigured } from './supabase.js';
import { getContent } from './store.js';

const enc = encodeURIComponent;
export const WINDOW = 15 * 60 * 1000;

const memory = new Map();
export const _resetMemory = () => memory.clear();

export function clientIp(req) {
  return String((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0].trim() || 'unknown';
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Wait longer after each wrong password from the same address (0.5s, 1s, 2s, 4s, then 6s). */
export function failDelayMs(fails) {
  if (process.env.LOGIN_DELAY_MS !== undefined) return Number(process.env.LOGIN_DELAY_MS) || 0;
  return Math.min(6000, 500 * 2 ** Math.min(Number(fails) || 0, 4));
}

function memCount(kind, key, windowMs) {
  const k = kind + '|' + key;
  const now = Date.now();
  const list = (memory.get(k) || []).filter((t) => now - t < windowMs);
  memory.set(k, list);
  return list.length;
}

export async function countEvents(kind, key, windowMs = WINDOW) {
  if (supabaseConfigured()) {
    try {
      const since = new Date(Date.now() - windowMs).toISOString();
      const rows = await sb(
        '/rest/v1/rate_events?select=id&kind=eq.' + enc(kind) + '&key=eq.' + enc(key) +
        '&created_at=gte.' + enc(since) + '&limit=1000'
      );
      return (rows || []).length;
    } catch (e) {
      /* table not created yet, or Supabase unreachable: use this server's memory */
    }
  }
  return memCount(kind, key, windowMs);
}

export async function addEvent(kind, key) {
  const k = kind + '|' + key;
  memory.set(k, [...(memory.get(k) || []), Date.now()]);
  if (!supabaseConfigured()) return;
  try {
    await sb('/rest/v1/rate_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { kind, key } });
    if (Math.random() < 0.02) {
      /* tidy up old rows now and then */
      await sb('/rest/v1/rate_events?created_at=lt.' + enc(new Date(Date.now() - 7 * 86400000).toISOString()), { method: 'DELETE' });
    }
  } catch (e) { /* memory copy still counts */ }
}

/* Count one request against a budget. Returns false when the budget is used up. */
export async function allow(kind, key, max, windowMs = WINDOW) {
  if ((await countEvents(kind, key, windowMs)) >= max) return false;
  await addEvent(kind, key);
  return true;
}

/* ---------- audit log ---------- */
export async function audit(req, actor, role, action, detail = '') {
  if (!supabaseConfigured()) return;
  try {
    await sb('/rest/v1/audit_log', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: {
        actor: String(actor || '').slice(0, 120),
        role: String(role || '').slice(0, 20),
        action,
        detail: String(detail || '').slice(0, 300),
        ip: req ? clientIp(req) : ''
      }
    });
  } catch (e) {
    console.error('audit log write failed:', e.message);
  }
}

export async function listAudit(limit = 100) {
  return (await sb('/rest/v1/audit_log?select=id,created_at,actor,role,action,detail,ip&order=id.desc&limit=' + limit)) || [];
}

/* ---------- admin security state (sign-out-everywhere + 2-step secret) ---------- */
const DEFAULTS = { session_epoch: 0, totp_enabled: false, totp_secret: null, totp_last_step: 0 };

export async function getSecurity() {
  if (!supabaseConfigured()) return { ...DEFAULTS };
  try {
    const rows = await sb('/rest/v1/admin_security?select=*&id=eq.1&limit=1');
    return { ...DEFAULTS, ...((rows && rows[0]) || {}) };
  } catch (e) {
    return { ...DEFAULTS, unavailable: true };
  }
}

export async function patchSecurity(fields) {
  const body = { ...fields, updated_at: new Date().toISOString() };
  const rows = await sb('/rest/v1/admin_security?id=eq.1', { method: 'PATCH', headers: { Prefer: 'return=representation' }, body });
  if (rows && rows.length) return rows[0];
  const made = await sb('/rest/v1/admin_security?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: { id: 1, ...body }
  });
  return made && made[0];
}

/* Every session created before "now" stops working. Returns the new epoch. */
export async function bumpEpoch() {
  const ep = Date.now();
  await patchSecurity({ session_epoch: ep });
  return ep;
}

/* ---------- alert email to the owner ---------- */
export async function alertOwner(subject, text) {
  try {
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return;
    const to = process.env.ALERT_EMAIL || process.env.CONTACT_TO_EMAIL || ((await getContent()).links || {}).email;
    if (!to) return;
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [to],
        subject: '[Game Tribe security] ' + subject,
        text: text + '\n\nSent automatically by your Game Tribe website.'
      })
    });
  } catch (e) {
    console.error('alert email failed:', e.message);
  }
}

export async function alertOnce(key, subject, text, everyMs = 3600 * 1000) {
  if ((await countEvents('alert', key, everyMs)) >= 1) return;
  await addEvent('alert', key);
  await alertOwner(subject, text);
}
