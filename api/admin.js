import crypto from 'crypto';
import {
  adminConfigured, getSession, passwordMatches, sessionCookie, clearCookie
} from './_lib/auth.js';
import * as team from './_lib/team.js';
import * as gate from './_lib/checkin.js';
import * as paystack from './_lib/paystack.js';
import * as sec from './_lib/security.js';
import * as totp from './_lib/totp.js';
import {
  checkPurchase, saleFields, sendTicketEmail, ticketNumberFor, cleanName, cleanPhone, HARD_MAX_QUANTITY
} from './_lib/tickets.js';
import { supabaseConfigured, supabaseUrl, sb } from './_lib/supabase.js';
import {
  getContent, saveContent, listSales, getTicketMap, recordSale, createSignedUpload, MEDIA_BUCKET
} from './_lib/store.js';

/*
 * Who may do what. The main admin (owner) can do everything. Team members are
 * limited to the actions listed here; anything else gets a 403 even if someone
 * tries to call the API directly.
 */
const PERMS = {
  owner: null, /* null = everything */
  tickets: new Set(['me', 'sales', 'checkin', 'checkin-log']),
  sales: new Set(['me', 'sales', 'checkin-log'])
};
function allowed(role, action) {
  const p = PERMS[role];
  return p === null || Boolean(p && p.has(action));
}

function siteOrigin(req) {
  if (process.env.SITE_URL) return String(process.env.SITE_URL).replace(/\/+$/, '');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return proto + '://' + host;
}

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');

/* The buyer's name as Paystack knows it. */
function buyerName(tx) {
  const c = tx.customer || {};
  return cleanName(
    tx.metadata.customer_name ||
    [c.first_name, c.last_name].filter(Boolean).join(' ').trim() ||
    (c.email ? String(c.email).split('@')[0] : '')
  );
}

/* Plain-English reason a paid transaction was not accepted automatically. */
function explainRejection(tx, tickets, purchase) {
  const type = tx.metadata.ticket_type;
  if (!type) return 'This payment has no ticket type attached, so it did not come through the website ticket form (for example a Paystack payment link, a transfer, or another product).';
  const ticket = tickets[type];
  if (!ticket) return 'Ticket type "' + type + '" does not exist on the site any more (it may have been renamed or deleted).';
  if (purchase.reason === 'Invalid quantity.') return 'The quantity attached to this payment is not valid.';
  if (purchase.reason === 'Invalid currency.') return 'Paid in ' + tx.currency + ', not Naira.';
  const q = Number(tx.metadata.quantity) || 1;
  return 'Paid ' + naira(tx.amount / 100) + ', but ' + q + ' × ' + ticket.label + ' should be ' + naira(ticket.amount * q) +
    '. The ticket price may have changed after they started paying, or extra fees were added.';
}

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return ''; }
}

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_UPLOADS = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  'application/pdf': 'pdf'
};

function safeName(name) {
  return String(name || 'file')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'file';
}

function validateContent(content) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return 'Content must be an object.';
  }
  if (JSON.stringify(content).length > 1500000) return 'Content is too large.';

  if (content.tickets !== undefined) {
    if (!Array.isArray(content.tickets) || content.tickets.length > 30) {
      return 'Tickets must be a list of at most 30 items.';
    }
    const seen = new Set();
    for (const t of content.tickets) {
      if (!t || !/^[a-z0-9_]{2,40}$/.test(t.id || '')) return 'Every ticket needs a valid id.';
      if (seen.has(t.id)) return 'Duplicate ticket id: ' + t.id;
      seen.add(t.id);
      if (typeof t.label !== 'string' || !t.label.trim()) return 'Every ticket needs a name.';
      if (!Number.isInteger(t.price) || t.price < 100 || t.price > 10000000) {
        return 'Ticket price for "' + t.label + '" must be a whole number of naira (100 or more).';
      }
      if (t.admits !== undefined && (!Number.isInteger(t.admits) || t.admits < 1 || t.admits > 20)) {
        return 'People admitted per ticket for "' + t.label + '" must be a whole number from 1 to 20.';
      }
    }
  }
  if (content.ticketing !== undefined) {
    const q = content.ticketing && content.ticketing.maxQuantity;
    if (q !== undefined && q !== null && (!Number.isInteger(q) || q < 1 || q > 200)) {
      return 'Max tickets per order must be a whole number from 1 to 200.';
    }
  }
  const groups = content.sponsors && content.sponsors.groups;
  if (groups !== undefined) {
    if (!Array.isArray(groups) || groups.length > 20) return 'Categories must be a list of at most 20.';
    for (const g of groups) {
      if (!g || typeof g.title !== 'string' || !g.title.trim()) return 'Every category needs a name.';
      if (!Array.isArray(g.items) || g.items.length > 200) return 'Each category can hold at most 200 logos.';
    }
  }
  const pg = content.pages;
  if (pg !== undefined) {
    if (!pg || typeof pg !== 'object' || Array.isArray(pg)) return 'Pages content is invalid.';
    const arr = (v, max, label) => (v === undefined || (Array.isArray(v) && v.length <= max)) ? '' : label + ' must be a list of at most ' + max + ' items.';
    const checks = [
      arr(pg.faq && pg.faq.categories, 30, 'FAQ categories'),
      arr(pg.memories && pg.memories.years, 60, 'Memories years'),
      arr(pg.partner && pg.partner.packages, 8, 'Partner packages'),
      arr(pg.about && pg.about.pillars, 12, 'About pillars'),
      arr(pg.contact && pg.contact.cards, 12, 'Contact cards'),
      arr(pg.play && pg.play.steps, 8, 'Play steps'),
      arr(pg.play && pg.play.modes, 8, 'Play game modes')
    ];
    for (const c of checks) if (c) return c;
    for (const cat of (pg.faq && pg.faq.categories) || []) {
      if (!Array.isArray(cat.items) || cat.items.length > 100) return 'Each FAQ category can hold at most 100 questions.';
    }
    for (const y of (pg.memories && pg.memories.years) || []) {
      if (!Array.isArray(y.photos) || y.photos.length > 1500) return 'Each year can hold at most 1500 photos.';
      if (!Array.isArray(y.videos) || y.videos.length > 300) return 'Each year can hold at most 300 videos.';
    }
  }
  if (content.event && content.event.date && isNaN(new Date(content.event.date).getTime())) {
    return 'The event date is not a valid date.';
  }
  return '';
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const action = String((req.query && req.query.action) || '');

  try {
    if (!adminConfigured()) {
      return res.status(503).json({
        message: 'Admin is not set up yet. Add ADMIN_PASSWORD (8+ characters) in your Vercel environment variables.'
      });
    }

    /* ---- login / logout / session ---- */
    if (action === 'login' && req.method === 'POST') {
      const ip = sec.clientIp(req);
      if ((await sec.countEvents('login_fail', ip)) >= 10) {
        await sec.audit(req, '', '', 'login_blocked', 'too many failed attempts from this address');
        return res.status(429).json({ message: 'Too many attempts. Try again in 15 minutes.' });
      }
      const body = await readBody(req);
      const email = team.normEmail(body.email);

      /* One wrong attempt: remember it (stored in Supabase, so it counts across all servers), slow the reply down, and answer. */
      const fail = async (message, why, extra = {}) => {
        const fails = await sec.countEvents('login_fail', ip);
        await sec.addEvent('login_fail', ip);
        if (email) await sec.addEvent('login_fail_email', email);
        await sec.audit(req, email || 'Main admin', '', 'login_failed', why);
        await sec.sleep(sec.failDelayMs(fails));
        return res.status(401).json({ message, ...extra });
      };

      if (!email) {
        /* Main admin: password (and an authenticator code if 2-step login is on). */
        if (!passwordMatches(body.password)) {
          await sec.addEvent('owner_fail', 'all');
          if ((await sec.countEvents('owner_fail', 'all')) >= 10) {
            await sec.alertOnce('bruteforce', 'Repeated failed admin sign-ins',
              'There have been 10 or more failed sign-in attempts on your Game Tribe admin in the last 15 minutes. Latest one came from address ' + ip +
              '. If this was not you, change ADMIN_PASSWORD in Vercel (that also signs everyone out) and turn on 2-step login on the Security page.');
          }
          return fail('Wrong password.', 'wrong password');
        }
        const state = await sec.getSecurity();
        const needCode = Boolean(state.totp_enabled && state.totp_secret) && process.env.ADMIN_2FA_OFF !== 'true';
        if (needCode) {
          if (!body.code) return res.status(200).json({ needCode: true });
          if ((await sec.countEvents('totp_fail', 'owner')) >= 20) {
            return res.status(429).json({ message: 'Too many wrong codes. Try again in 15 minutes.', needCode: true });
          }
          const step = totp.verifyTotp(state.totp_secret, body.code, { lastStep: Number(state.totp_last_step) || 0 });
          if (!step) {
            await sec.addEvent('totp_fail', 'owner');
            return fail('That code is not right. Use the newest code from your authenticator app.', 'wrong 2-step code', { needCode: true });
          }
          await sec.patchSecurity({ totp_last_step: step });
        }
        res.setHeader('Set-Cookie', sessionCookie({ ep: Number(state.session_epoch) || 0 }));
        await sec.audit(req, 'Main admin', 'owner', 'login_ok', needCode ? 'with authenticator code' : '');
        return res.status(200).json({ ok: true, role: 'owner' });
      }

      /* Team member: email + password. */
      if (!supabaseConfigured()) {
        return res.status(503).json({ message: 'Supabase is not connected yet, so team logins are unavailable.' });
      }
      if ((await sec.countEvents('login_fail_email', email)) >= 8) {
        await sec.audit(req, email, '', 'login_blocked', 'too many failed attempts for this account');
        return res.status(429).json({ message: 'Too many attempts for this account. Try again in 15 minutes.' });
      }
      const member = await team.findByEmail(email);
      const active = Boolean(member && member.status === 'active');
      const good = await team.checkPassword(body.password, active ? member.password_hash : null);
      if (!active || !good) return fail('Wrong email or password.', 'wrong email or password');
      try { await team.touchLogin(member.id); } catch (e) { /* not important */ }
      const state = await sec.getSecurity();
      res.setHeader('Set-Cookie', sessionCookie({
        role: member.role, uid: member.id, name: member.name || member.email, email: member.email, ep: Number(state.session_epoch) || 0
      }));
      await sec.audit(req, member.email, member.role, 'login_ok');
      return res.status(200).json({ ok: true, role: member.role });
    }

    if (action === 'logout') {
      res.setHeader('Set-Cookie', clearCookie());
      return res.status(200).json({ ok: true });
    }

    /* ---- invite links (no login yet: the secret token is the proof) ---- */
    if (action === 'invite-info' && req.method === 'GET') {
      if (!supabaseConfigured()) return res.status(503).json({ message: 'Supabase is not connected yet.' });
      const ip = sec.clientIp(req);
      if ((await sec.countEvents('invite_fail', ip)) >= 10) return res.status(429).json({ message: 'Too many attempts. Try again in 15 minutes.' });
      const member = await team.findByInvite(req.query && req.query.token);
      if (!member) {
        await sec.addEvent('invite_fail', ip);
        return res.status(404).json({ message: 'This invite link is invalid or has expired. Ask the main admin to send a new one.' });
      }
      return res.status(200).json({
        email: member.email, name: member.name || '', role: member.role,
        roleLabel: team.ROLES[member.role].label, reset: member.status === 'active'
      });
    }

    if (action === 'invite-accept' && req.method === 'POST') {
      const ip = sec.clientIp(req);
      if ((await sec.countEvents('invite_fail', ip)) >= 10) return res.status(429).json({ message: 'Too many attempts. Try again in 15 minutes.' });
      if (!supabaseConfigured()) return res.status(503).json({ message: 'Supabase is not connected yet.' });
      const { token, password } = await readBody(req);
      if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
        return res.status(400).json({ message: 'Choose a password with at least 8 characters.' });
      }
      const member = await team.findByInvite(token);
      if (!member) {
        await sec.addEvent('invite_fail', ip);
        await sec.audit(req, '', '', 'invite_failed', 'invalid or expired invite link used');
        return res.status(404).json({ message: 'This invite link is invalid or has expired. Ask the main admin to send a new one.' });
      }
      await team.activate(member.id, await team.hashPassword(password));
      const state = await sec.getSecurity();
      res.setHeader('Set-Cookie', sessionCookie({
        role: member.role, uid: member.id, name: member.name || member.email, email: member.email, ep: Number(state.session_epoch) || 0
      }));
      await sec.audit(req, member.email, member.role, member.status === 'active' ? 'password_reset' : 'invite_accepted');
      return res.status(200).json({ ok: true, role: member.role });
    }

    /* ---- everything below needs a valid session ---- */
    const session = getSession(req);
    if (!session) return res.status(401).json({ message: 'Please log in.' });

    /* "Sign out everywhere" ends every session created before the last time it was used. */
    const secState = await sec.getSecurity();
    if ((Number(session.ep) || 0) < Number(secState.session_epoch || 0)) {
      res.setHeader('Set-Cookie', clearCookie());
      return res.status(401).json({ message: 'You were signed out. Please log in again.' });
    }

    let role = session.role;
    let who = { name: 'Main admin', email: '' };
    if (role !== 'owner') {
      /* Team member: confirm they still exist, and use their CURRENT role,
         so removing someone or changing their role takes effect immediately. */
      if (!supabaseConfigured()) return res.status(503).json({ message: 'Supabase is not connected.' });
      const member = await team.getById(session.uid);
      if (!member || member.status !== 'active') {
        res.setHeader('Set-Cookie', clearCookie());
        return res.status(401).json({ message: 'Your access has been removed. Please contact the main admin.' });
      }
      role = member.role;
      who = { name: member.name || member.email, email: member.email };
    }
    if (!allowed(role, action)) {
      return res.status(403).json({ message: 'Your role does not have permission to do that.' });
    }

    if (action === 'me') {
      return res.status(200).json({ ok: true, role, name: who.name, email: who.email, supabase: supabaseConfigured() });
    }

    if (action === 'diagnose') {
      const checks = [];
      const add = (name, ok, detail) => checks.push({ name, ok, detail });
      const url = supabaseUrl();
      add('SUPABASE_URL is set', Boolean(url), url ? url : 'Missing. Add it in Vercel and redeploy.');
      if (url) {
        const host = url.replace(/^https?:\/\//, '');
        const wrong = /(^|\.)supabase\.com$/.test(host) || /^db\./.test(host) || /\.vercel\.app$/.test(host);
        add('SUPABASE_URL points at your Supabase project', !wrong,
          'Using ' + url + '. It should look like https://abcdefghijklmnop.supabase.co (Project Settings → API → Project URL), not the dashboard page, a db. address or your own website.');
      }
      add('SUPABASE_SERVICE_ROLE_KEY is set', Boolean((process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()), 'Needed to save content.');
      add('SUPABASE_ANON_KEY is set', Boolean((process.env.SUPABASE_ANON_KEY || '').trim()), 'Needed for photo and video uploads.');
      if (supabaseConfigured()) {
        const tests = [
          ['Table site_content is reachable', '/rest/v1/site_content?select=key&limit=1', 'Run supabase/setup.sql in the SQL Editor.'],
          ['Table ticket_sales is reachable', '/rest/v1/ticket_sales?select=reference&limit=1', 'Run supabase/setup.sql in the SQL Editor.'],
          ['Table ticket_sales has the quantity and check-in columns', '/rest/v1/ticket_sales?select=quantity,admits_total,admitted_count,checked_in_at&limit=1', 'Run supabase/upgrade.sql in the SQL Editor (new sales are still saved without it, but quantities are not).'],
          ['Table checkin_log is reachable', '/rest/v1/checkin_log?select=id&limit=1', 'Run supabase/upgrade.sql in the SQL Editor.'],
          ['Table team_members is reachable', '/rest/v1/team_members?select=id&limit=1', 'Run supabase/upgrade.sql in the SQL Editor.'],
          ['Table rate_events is reachable (login protection)', '/rest/v1/rate_events?select=id&limit=1', 'Run supabase/upgrade.sql in the SQL Editor.'],
          ['Table audit_log is reachable (activity log)', '/rest/v1/audit_log?select=id&limit=1', 'Run supabase/upgrade.sql in the SQL Editor.'],
          ['Table admin_security is reachable (2-step login, sign-out-everywhere)', '/rest/v1/admin_security?select=id&limit=1', 'Run supabase/upgrade.sql in the SQL Editor.'],
          ['Storage bucket "' + MEDIA_BUCKET + '" exists and is public', '/storage/v1/bucket/' + MEDIA_BUCKET, 'Run supabase/setup.sql, or create a public bucket with this name.']
        ];
        for (const [name, path, hint] of tests) {
          try {
            const data = await sb(path);
            if (path.indexOf('/storage/v1/bucket/') === 0) {
              if (data && data.public === true) add(name, true, 'OK');
              else add(name, false, 'The bucket exists but is PRIVATE, so uploaded photos cannot show on the website. In Supabase open Storage, choose site-media, Edit bucket, and turn on Public bucket (or run: update storage.buckets set public = true where id = \'site-media\';).');
            } else add(name, true, 'OK');
          } catch (e) { add(name, false, e.message + ' — ' + hint); }
        }
      }
      /* Has anything been published, and when? */
      if (supabaseConfigured()) {
        try {
          const rows = await sb('/rest/v1/site_content?key=eq.main&select=updated_at');
          if (rows && rows[0]) add('Published content found in the database', true, 'Last published: ' + rows[0].updated_at);
          else add('Published content found in the database', false, 'Nothing has been published yet. Make a change and click Publish changes.');
        } catch (e) { /* already reported above */ }
      }

      /* Is the LIVE homepage the new version that reads from the dashboard? */
      try {
        const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
        const local = /^(localhost|127\.|\[::1\])/.test(host);
        const proto = String(req.headers['x-forwarded-proto'] || (local ? 'http' : 'https')).split(',')[0].trim();
        const page = await fetch(proto + '://' + host + '/', { headers: { 'Cache-Control': 'no-cache' } });
        const html = await page.text();
        const isNew = html.indexOf('/api/content') > -1 && html.indexOf('id="logoGroups"') > -1;
        add('Your live homepage is the new version', isNew,
          isNew ? 'OK (' + host + ')'
                : 'The homepage at ' + host + ' does NOT load content from the dashboard, so it is still the old index.html (or a different site is being served). Replace index.html with the one from the zip, redeploy, then hard-refresh.');
        if (isNew) {
          const api = await fetch(proto + '://' + host + '/api/content');
          const okJson = api.ok && /json/.test(api.headers.get('content-type') || '');
          add('Your homepage can reach /api/content', okJson, okJson ? 'OK' : 'Got HTTP ' + api.status + ' from /api/content on ' + host + '.');
        }
      } catch (e) {
        add('Your live homepage is the new version', false, 'Could not open the homepage to check it: ' + e.message);
      }

      return res.status(200).json({ checks, allOk: checks.every((c) => c.ok) });
    }

    if (action === 'content' && req.method === 'GET') {
      return res.status(200).json(await getContent());
    }

    if (action === 'save' && req.method === 'POST') {
      if (!supabaseConfigured()) {
        return res.status(503).json({ message: 'Supabase is not connected yet (see README step 2).' });
      }
      const { content } = await readBody(req);
      const problem = validateContent(content);
      if (problem) return res.status(400).json({ message: problem });
      await saveContent(content);
      await sec.audit(req, who.name, role, 'content_published');
      return res.status(200).json({ ok: true, savedAt: new Date().toISOString() });
    }

    if (action === 'sign-upload' && req.method === 'POST') {
      if (!supabaseConfigured()) {
        return res.status(503).json({ message: 'Supabase is not connected yet (see README step 2).' });
      }
      const { filename, contentType, folder, size } = await readBody(req);
      const ext = ALLOWED_UPLOADS[contentType];
      if (size !== undefined && (!Number.isFinite(Number(size)) || Number(size) < 0 || Number(size) > MAX_UPLOAD_BYTES)) {
        return res.status(400).json({ message: 'That file is too large. The limit is 50 MB per file.' });
      }
      if (!ext) {
        return res.status(400).json({ message: 'That file type is not allowed. Use JPG, PNG, WEBP, GIF, MP4, WEBM, MOV or PDF.' });
      }
      const dir = ['images', 'videos', 'logos', 'files'].includes(folder) ? folder : 'images';
      const path = dir + '/' + Date.now().toString(36) + '-' +
        crypto.randomBytes(3).toString('hex') + '-' + safeName(filename) + '.' + ext;
      const signed = await createSignedUpload(path);
      return res.status(200).json({ ...signed, anonKey: process.env.SUPABASE_ANON_KEY || '' });
    }

    if (action === 'sales' && req.method === 'GET') {
      if (!supabaseConfigured()) return res.status(200).json({ sales: [], configured: false, role });
      const sales = await listSales();
      /* role is included so an open dashboard notices a role change without a reload */
      return res.status(200).json({ sales, configured: true, role });
    }

    /* ---- security page (main admin only) ---- */
    if (action === 'security-status' && req.method === 'GET') {
      const state = await sec.getSecurity();
      return res.status(200).json({
        tablesReady: supabaseConfigured() && !state.unavailable,
        totpEnabled: Boolean(state.totp_enabled && state.totp_secret),
        totpPending: Boolean(state.totp_secret && !state.totp_enabled),
        twoFactorOverride: process.env.ADMIN_2FA_OFF === 'true',
        captcha: Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.TURNSTILE_SITE_KEY),
        alerts: Boolean(process.env.RESEND_API_KEY && (process.env.ALERT_EMAIL || process.env.CONTACT_TO_EMAIL))
      });
    }

    if (action === 'audit-list' && req.method === 'GET') {
      if (!supabaseConfigured()) return res.status(200).json({ log: [], configured: false });
      try {
        return res.status(200).json({ log: await sec.listAudit(100), configured: true });
      } catch (e) {
        return res.status(200).json({ log: [], configured: true, missingTable: true });
      }
    }

    if (action === 'sessions-revoke' && req.method === 'POST') {
      const ep = await sec.bumpEpoch();
      res.setHeader('Set-Cookie', sessionCookie({ ep }));
      await sec.audit(req, who.name, role, 'sessions_revoked', 'everyone else was signed out');
      return res.status(200).json({ ok: true });
    }

    if (action.indexOf('totp-') === 0) {
      if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });
      if (!supabaseConfigured()) return res.status(503).json({ message: 'Supabase is not connected yet.' });
      const body = await readBody(req);
      const state = await sec.getSecurity();
      if (state.unavailable) return res.status(503).json({ message: 'Run supabase/upgrade.sql in the Supabase SQL Editor first (it creates the security tables).' });

      if (action === 'totp-setup') {
        if (state.totp_enabled) return res.status(409).json({ message: '2-step login is already on. Turn it off first if you want to set it up again.' });
        const secret = totp.newSecret();
        await sec.patchSecurity({ totp_secret: secret, totp_enabled: false, totp_last_step: 0 });
        return res.status(200).json({
          secret: totp.groupSecret(secret),
          uri: totp.otpauthUri({ secret, account: 'Main admin', issuer: 'Game Tribe Admin' })
        });
      }

      if (action === 'totp-enable') {
        if (!state.totp_secret || state.totp_enabled) return res.status(400).json({ message: 'Start the setup first.' });
        const step = totp.verifyTotp(state.totp_secret, body.code, {});
        if (!step) return res.status(400).json({ message: 'That code is not right. Check the newest code in your app and try again.' });
        const ep = Date.now();
        await sec.patchSecurity({ totp_enabled: true, totp_last_step: step, session_epoch: ep });
        res.setHeader('Set-Cookie', sessionCookie({ ep }));
        await sec.audit(req, who.name, role, '2step_enabled', 'all other sessions were signed out');
        return res.status(200).json({ ok: true });
      }

      if (action === 'totp-disable') {
        if (!state.totp_enabled) return res.status(400).json({ message: '2-step login is not on.' });
        /* Turning it off needs the password AND a current code, so a stolen session alone cannot do it. */
        const step = passwordMatches(body.password) ? totp.verifyTotp(state.totp_secret, body.code, { lastStep: Number(state.totp_last_step) || 0 }) : 0;
        if (!step) {
          await sec.addEvent('login_fail', sec.clientIp(req));
          await sec.audit(req, who.name, role, '2step_disable_failed', 'wrong password or code');
          return res.status(401).json({ message: 'The password or code was not right.' });
        }
        const ep = Date.now();
        await sec.patchSecurity({ totp_enabled: false, totp_secret: null, totp_last_step: 0, session_epoch: ep });
        res.setHeader('Set-Cookie', sessionCookie({ ep }));
        await sec.audit(req, who.name, role, '2step_disabled', 'all other sessions were signed out');
        await sec.alertOwner('2-step login was turned off', '2-step login for the Game Tribe admin was just turned off. If this was not you, change ADMIN_PASSWORD in Vercel immediately.');
        return res.status(200).json({ ok: true });
      }
    }

    /* ---- compare Paystack with the saved sales (main admin only) ---- */
    if (action === 'reconcile' && req.method === 'GET') {
      if (!process.env.PAYSTACK_SECRET_KEY) return res.status(503).json({ message: 'PAYSTACK_SECRET_KEY is not set on the server.' });
      if (!supabaseConfigured()) return res.status(503).json({ message: 'Supabase is not connected yet.' });
      const days = Math.min(60, Math.max(1, parseInt(req.query && req.query.days, 10) || 7));
      let found;
      try {
        found = await paystack.listSuccessful({
          from: new Date(Date.now() - days * 86400 * 1000).toISOString(),
          to: new Date(Date.now() + 3600 * 1000).toISOString()
        });
      } catch (e) {
        return res.status(502).json({ message: 'Could not read from Paystack. ' + e.message });
      }
      const saved = new Set((await listSales()).map((r) => r.reference));
      const tickets = await getTicketMap();
      const missing = [];
      for (const tx of found.transactions) {
        if (saved.has(tx.reference)) continue;
        const c = tx.customer || {};
        const item = {
          reference: tx.reference,
          paidAt: tx.paid_at || tx.created_at || '',
          amount: Number(tx.amount) / 100,
          currency: tx.currency,
          channel: tx.channel || '',
          name: buyerName(tx),
          email: c.email || '',
          phone: c.phone || '',
          ticketType: tx.metadata.ticket_type || '',
          quantity: Number(tx.metadata.quantity) || 1
        };
        const purchase = checkPurchase(tx, tickets);
        if (purchase.ok && item.email) {
          missing.push({ ...item, state: 'ready', ticketLabel: purchase.ticket.label, quantity: purchase.quantity, admitsTotal: purchase.admitsTotal });
        } else {
          missing.push({
            ...item,
            state: 'review',
            reason: purchase.ok ? 'Paystack has no email address for this buyer, so no ticket email can be sent.' : explainRejection(tx, tickets, purchase)
          });
        }
      }
      return res.status(200).json({
        days,
        checked: found.transactions.length,
        saved: found.transactions.length - missing.length,
        truncated: found.truncated,
        missing,
        tickets: Object.keys(tickets).map((id) => ({ id, label: tickets[id].label, price: tickets[id].amount, admits: tickets[id].admits }))
      });
    }

    if (action === 'reconcile-import') {
      if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });
      if (!supabaseConfigured()) return res.status(503).json({ message: 'Supabase is not connected yet.' });
      const body = await readBody(req);
      const reference = body.reference;
      if (typeof reference !== 'string' || !/^[\w.\-=]{3,100}$/.test(reference)) {
        return res.status(400).json({ message: 'Invalid payment reference.' });
      }
      /* Never trust the browser: ask Paystack again, and only act on a successful payment. */
      let tx;
      try { tx = await paystack.verifyTransaction(reference); } catch (e) {
        return res.status(502).json({ message: 'Could not confirm this payment with Paystack. ' + e.message });
      }
      if (!tx || tx.status !== 'success') return res.status(400).json({ message: 'Paystack does not show this payment as successful.' });
      if (tx.currency !== 'NGN') return res.status(400).json({ message: 'This payment was not made in Naira.' });
      if (await gate.getSale(tx.reference)) return res.status(409).json({ message: 'This payment is already saved.', already: true });

      const tickets = await getTicketMap();
      let purchase;
      if (body.ticketType) {
        /* Manual choice by the main admin (for payments that did not match automatically). */
        const ticket = tickets[body.ticketType];
        const qty = body.quantity === undefined ? 1 : Number(body.quantity);
        if (!ticket) return res.status(400).json({ message: 'Choose a ticket type.' });
        if (!Number.isInteger(qty) || qty < 1 || qty > HARD_MAX_QUANTITY) return res.status(400).json({ message: 'Choose a quantity from 1 to ' + HARD_MAX_QUANTITY + '.' });
        const per = ticket.admits || 1;
        purchase = { ok: true, ticketType: body.ticketType, ticket, quantity: qty, totalNaira: Number(tx.amount) / 100, admitsPerUnit: per, admitsTotal: per * qty };
      } else {
        purchase = checkPurchase(tx, tickets);
        if (!purchase.ok) return res.status(400).json({ message: purchase.message + ' Choose the ticket type to import it by hand.' });
      }
      const c = tx.customer || {};
      const name = buyerName(tx);
      await recordSale({
        reference: tx.reference,
        ticket_number: ticketNumberFor(tx.reference),
        name,
        email: c.email,
        phone: cleanPhone(c.phone),
        ...saleFields(purchase),
        paid_at: tx.paid_at,
        source: 'recovered',
        email_sent: false
      }, { strict: true });

      let emailSent = false;
      let emailError = '';
      if (body.sendEmail !== false && c.email) {
        try {
          await sendTicketEmail({ email: c.email, name, ticket: purchase.ticket, reference: tx.reference, quantity: purchase.quantity, admitsTotal: purchase.admitsTotal });
          await recordSale({ reference: tx.reference, email_sent: true });
          emailSent = true;
        } catch (e) {
          emailError = e.message;
          console.error('RECOVERY EMAIL ERROR:', e.message);
        }
      }
      await sec.audit(req, who.name, role, 'payment_imported', tx.reference + ' · ' + name + ' · ' + purchase.quantity + ' × ' + purchase.ticket.label);
      return res.status(200).json({ ok: true, emailSent, emailError, name, ticket: purchase.ticket.label, quantity: purchase.quantity });
    }

    /* ---- gate check-in ---- */
    if (action === 'checkin' || action === 'checkin-undo') {
      if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });
      const { reference, count } = await readBody(req);
      const n = Number(count);
      if (typeof reference !== 'string' || !reference || reference.length > 100 || !Number.isInteger(n) || n < 1 || n > 1000) {
        return res.status(400).json({ message: 'Choose how many people to ' + (action === 'checkin' ? 'admit' : 'remove') + '.' });
      }
      const result = action === 'checkin'
        ? await gate.admit(reference, n, who.name, role)
        : await gate.undo(reference, n, who.name, role);
      if (result.ok) {
        if (action === 'checkin-undo') await sec.audit(req, who.name, role, 'checkin_undone', reference + ' · removed ' + n);
        return res.status(200).json({ ok: true, sale: result.sale });
      }

      const sale = result.sale;
      if (result.error === 'not_found') return res.status(404).json({ message: 'That ticket was not found.' });
      if (result.error === 'too_many') {
        const total = Number(sale.admits_total) || 1;
        const done = Number(sale.admitted_count) || 0;
        const last = sale.checked_in_at ? ' Last let in ' + fmtTime(sale.checked_in_at) + (sale.checked_in_by ? ' by ' + sale.checked_in_by : '') + '.' : '';
        return res.status(409).json({
          message: done >= total
            ? 'ALREADY USED. All ' + total + ' ' + (total === 1 ? 'person has' : 'people have') + ' already been let in.' + last
            : 'Only ' + (total - done) + ' of ' + total + ' can still be let in (' + done + ' already in).' + last,
          sale
        });
      }
      if (result.error === 'nothing_to_undo') {
        return res.status(409).json({ message: 'Only ' + (Number(sale.admitted_count) || 0) + ' have been let in, so that many cannot be removed.', sale });
      }
      return res.status(409).json({
        message: 'Another gate device updated this ticket at the same moment. Check the new count and try again.',
        sale
      });
    }

    if (action === 'checkin-log' && req.method === 'GET') {
      const reference = String((req.query && req.query.reference) || '');
      if (!reference || reference.length > 100) return res.status(400).json({ message: 'Reference required.' });
      return res.status(200).json({ log: await gate.getLog(reference) });
    }

    /* ---- team (main admin only) ---- */
    if (action.indexOf('team-') === 0) {
      if (!supabaseConfigured()) return res.status(503).json({ message: 'Supabase is not connected yet.' });

      if (action === 'team-list' && req.method === 'GET') {
        return res.status(200).json({ members: await team.listMembers(), roles: team.ROLES });
      }

      if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });
      const body = await readBody(req);

      const deliver = async (member, invite, reset) => {
        const link = siteOrigin(req) + '/admin?invite=' + invite.token;
        let emailSent = false;
        let emailError = '';
        try {
          await team.sendInviteEmail({ to: member.email, name: member.name, role: member.role, link, reset });
          emailSent = true;
        } catch (e) {
          emailError = e.message;
          console.error('INVITE EMAIL ERROR:', e.message);
        }
        return { link, emailSent, emailError };
      };

      if (action === 'team-invite') {
        const email = team.normEmail(body.email);
        const name = String(body.name || '').trim().slice(0, 80);
        if (!team.validEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
        if (!team.ROLES[body.role]) return res.status(400).json({ message: 'Choose a role.' });
        const invite = team.newInvite();
        let member = await team.findByEmail(email);
        if (member && member.status === 'active') {
          return res.status(409).json({ message: email + ' is already on the team.' });
        }
        if (member) {
          member = await team.setInvite(member.id, invite, { role: body.role, name: name || member.name });
        } else {
          member = await team.createMember({ email, name, role: body.role, invite });
        }
        const out = await deliver(member, invite, false);
        await sec.audit(req, who.name, role, 'team_invited', email + ' as ' + body.role);
        return res.status(200).json({ ok: true, ...out });
      }

      if (!team.isMemberId(body.id)) return res.status(400).json({ message: 'Unknown team member.' });
      const member = await team.getById(body.id);
      if (!member) return res.status(404).json({ message: 'That team member no longer exists.' });

      if (action === 'team-resend') {
        const invite = team.newInvite();
        const updated = await team.setInvite(member.id, invite);
        const out = await deliver(updated || member, invite, member.status === 'active');
        await sec.audit(req, who.name, role, member.status === 'active' ? 'team_reset_link' : 'team_invite_resent', member.email);
        return res.status(200).json({ ok: true, ...out });
      }
      if (action === 'team-role') {
        if (!team.ROLES[body.role]) return res.status(400).json({ message: 'Choose a role.' });
        await team.setRole(member.id, body.role);
        await sec.audit(req, who.name, role, 'team_role_changed', member.email + ': ' + member.role + ' → ' + body.role);
        return res.status(200).json({ ok: true });
      }
      if (action === 'team-remove') {
        await team.removeMember(member.id);
        await sec.audit(req, who.name, role, 'team_removed', member.email);
        return res.status(200).json({ ok: true });
      }
    }

    return res.status(404).json({ message: 'Unknown action.' });
  } catch (error) {
    console.error('ADMIN ERROR:', action, error);
    return res.status(500).json({ message: error.message || 'Something went wrong.' });
  }
}
