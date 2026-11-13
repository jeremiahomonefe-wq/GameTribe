/*
 * Error monitoring and health checks.
 *  - reportError(): saves the problem in the error log and emails the owner
 *    (at  most one email per area every 30 minutes, and 6 an hour overall).
 *  - runHealthChecks(): checks that the things checkout depends on are working.
 * Monitoring must never break the site, so everything here swallows its own errors.
 */
import crypto from 'crypto';
import { sb, supabaseConfigured } from './supabase.js';
import { clientIp, alertOnce, allow, countEvents, addEvent } from './security.js';
import { getAvailability } from './store.js';

const enc = encodeURIComponent;

export async function reportError(area, error, req) {
  try {
    const message = String((error && error.message) || error || 'Unknown error').slice(0, 300);
    console.error('ERROR-REPORT', area, message);
    if (supabaseConfigured()) {
      try {
        await sb('/rest/v1/error_log', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: {
            area,
            message,
            detail: String((error && error.stack) || '').split('\n').slice(0, 4).join(' | ').slice(0, 500),
            ip: req ? clientIp(req) : ''
          }
        });
      } catch (e) { /* the email below still goes out */ }
    }
    if (await allow('alert-total', 'all', 6, 60 * 60 * 1000)) {
      await alertOnce(
        'error:' + area,
        'Problem on the website: ' + area,
        'Something went wrong in "' + area + '":\n\n' + message +
        '\n\nOpen your dashboard, Security page, "Site health" to see more. You get at most one email per 30 minutes for each area.',
        30 * 60 * 1000
      );
    }
  } catch (e) { /* never throw from monitoring */ }
}

export async function listErrors(limit = 30) {
  try {
    return (await sb('/rest/v1/error_log?select=id,created_at,area,message,ip&order=id.desc&limit=' + limit)) || [];
  } catch (e) {
    return [];
  }
}

/* A problem reported by a visitor's browser. Many at once means something is really broken. */
export async function reportBrowserError({ area, message, source, line, page }, req) {
  const ip = clientIp(req);
  if (!(await allow('client-error', ip, 10, 10 * 60 * 1000))) return;
  if (!(await allow('client-error-all', 'all', 200, 60 * 60 * 1000))) return;
  const text = String(message || '').slice(0, 300);
  if (supabaseConfigured()) {
    try {
      await sb('/rest/v1/error_log', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: {
          area: area === 'checkout' ? 'checkout-client' : 'browser',
          message: text,
          detail: [page, source, line].filter(Boolean).join(' · ').slice(0, 300),
          ip
        }
      });
    } catch (e) { /* ignore */ }
  }
  if (area === 'checkout') {
    /* A payment problem the buyer saw: tell the owner straight away. */
    await alertOnce('checkout-client', 'A buyer hit a checkout problem',
      'A visitor saw an error during checkout:\n\n' + text + '\n\nIf they say they paid, use Sales > "Check against Paystack" to find and recover the payment.', 15 * 60 * 1000);
    return;
  }
  await addEvent('browser-error', 'all');
  if ((await countEvents('browser-error', 'all', 10 * 60 * 1000)) >= 8) {
    await alertOnce('browser-spike', 'Visitors are hitting page errors',
      'Several visitors\' browsers reported script errors in the last 10 minutes. Latest: ' + text + '\nPage: ' + (page || ''), 60 * 60 * 1000);
  }
}

/* ---------- health ---------- */
const REQUIRED_ENV = ['ADMIN_PASSWORD', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'PAYSTACK_SECRET_KEY', 'RESEND_API_KEY', 'RESEND_FROM_EMAIL'];

async function timed(name, critical, fn) {
  const t0 = Date.now();
  try {
    const out = await fn();
    return { name, critical, ok: out.ok, detail: out.detail || '', ms: Date.now() - t0 };
  } catch (e) {
    return { name, critical, ok: false, detail: (e && e.name === 'TimeoutError') ? 'Did not answer within 6 seconds.' : String((e && e.message) || e).slice(0, 160), ms: Date.now() - t0 };
  }
}
const signal = () => (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? { signal: AbortSignal.timeout(6000) } : {});

export async function runHealthChecks() {
  const checks = await Promise.all([
    timed('Settings', true, async () => {
      const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
      return { ok: missing.length === 0, detail: missing.length ? 'Missing in Vercel: ' + missing.join(', ') : 'All required settings are present.' };
    }),
    timed('Database (Supabase)', true, async () => {
      if (!supabaseConfigured()) return { ok: false, detail: 'Supabase is not configured.' };
      await sb('/rest/v1/site_content?select=key&limit=1');
      return { ok: true, detail: 'Answering normally.' };
    }),
    timed('File storage (Supabase)', false, async () => {
      if (!supabaseConfigured()) return { ok: false, detail: 'Supabase is not configured.' };
      const r = await fetch(process.env.SUPABASE_URL.replace(/\/+$/, '') + '/storage/v1/bucket/site-media', {
        headers: { Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY, apikey: process.env.SUPABASE_SERVICE_ROLE_KEY }, ...signal()
      });
      return { ok: r.ok, detail: r.ok ? 'Answering normally.' : 'The site-media bucket answered with ' + r.status + '.' };
    }),
    timed('Payments (Paystack)', true, async () => {
      const r = await fetch('https://api.paystack.co/transaction?perPage=1', { headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY }, ...signal() });
      if (r.status === 401) return { ok: false, detail: 'Paystack rejected the secret key.' };
      return { ok: r.ok, detail: r.ok ? 'Answering normally.' : 'Paystack answered with ' + r.status + '.' };
    }),
    timed('Ticket emails (Resend)', true, async () => {
      const r = await fetch('https://api.resend.com/domains', { headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY }, ...signal() });
      if (r.ok) return { ok: true, detail: 'Answering normally.' };
      let restricted = false;
      try { restricted = /restricted/i.test(JSON.stringify(await r.json())); } catch (e) { /* ignore */ }
      /* A key that may only send emails is refused this question, but it proves Resend is up. */
      if (r.status === 401 && restricted) return { ok: true, detail: 'Answering normally (sending-only key).' };
      return { ok: false, detail: r.status === 401 || r.status === 403 ? 'Resend rejected the API key.' : 'Resend answered with ' + r.status + '.' };
    }),
    timed('Recent errors', false, async () => {
      if (!supabaseConfigured()) return { ok: true, detail: '' };
      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const rows = await sb('/rest/v1/error_log?select=id&created_at=gte.' + enc(since) + '&limit=200');
      const n = (rows || []).length;
      return { ok: n < 10, detail: n + ' problem' + (n === 1 ? '' : 's') + ' logged in the last 15 minutes.' };
    })
  ]);
  return { ok: checks.every((c) => c.ok || !c.critical), at: new Date().toISOString(), checks };
}

export function tokenMatches(given) {
  const want = process.env.HEALTH_TOKEN;
  if (!want || !given) return false;
  const a = crypto.createHash('sha256').update(String(given)).digest();
  const b = crypto.createHash('sha256').update(String(want)).digest();
  return crypto.timingSafeEqual(a, b);
}

/* After a sale is saved: if more people are now covered than the capacity you set, tell the owner. */
export async function checkOvercapacity() {
  try {
    if (!supabaseConfigured()) return;
    const a = await getAvailability();
    if (!a.over) return;
    await alertOnce('overcapacity', 'You have sold more than your capacity',
      'More people are now covered by paid tickets than the capacity you set' + (a.capacityTotal ? ' (' + a.capacityTotal + ')' : '') +
      '. This can happen when several people pay at the same moment. Everyone who paid still has a valid ticket. Increase the capacity in Tickets & prices, or contact the extra buyers.', 6 * 3600 * 1000);
  } catch (e) { /* ignore */ }
}
