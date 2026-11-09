import crypto from 'crypto';
import {
  adminConfigured, isAdmin, passwordMatches, sessionCookie, clearCookie
} from './_lib/auth.js';
import { supabaseConfigured, supabaseUrl, sb } from './_lib/supabase.js';
import {
  getContent, saveContent, listSales, createSignedUpload, MEDIA_BUCKET
} from './_lib/store.js';

/* Very small in-memory brake on password guessing (per server instance). */
const attempts = new Map();
function tooManyAttempts(ip) {
  const now = Date.now();
  const entry = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  attempts.set(ip, entry);
  return entry.length >= 8;
}

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
      const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
      if (tooManyAttempts(ip)) {
        return res.status(429).json({ message: 'Too many attempts. Try again in 15 minutes.' });
      }
      const { password } = await readBody(req);
      if (!passwordMatches(password)) {
        attempts.get(ip).push(Date.now());
        await new Promise((r) => setTimeout(r, 700));
        return res.status(401).json({ message: 'Wrong password.' });
      }
      res.setHeader('Set-Cookie', sessionCookie());
      return res.status(200).json({ ok: true });
    }

    if (action === 'logout') {
      res.setHeader('Set-Cookie', clearCookie());
      return res.status(200).json({ ok: true });
    }

    /* ---- everything below needs a valid session ---- */
    if (!isAdmin(req)) return res.status(401).json({ message: 'Please log in.' });

    if (action === 'me') {
      return res.status(200).json({ ok: true, supabase: supabaseConfigured() });
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
      return res.status(200).json({ ok: true, savedAt: new Date().toISOString() });
    }

    if (action === 'sign-upload' && req.method === 'POST') {
      if (!supabaseConfigured()) {
        return res.status(503).json({ message: 'Supabase is not connected yet (see README step 2).' });
      }
      const { filename, contentType, folder } = await readBody(req);
      const ext = ALLOWED_UPLOADS[contentType];
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
      if (!supabaseConfigured()) return res.status(200).json({ sales: [], configured: false });
      const sales = await listSales();
      return res.status(200).json({ sales, configured: true });
    }

    return res.status(404).json({ message: 'Unknown action.' });
  } catch (error) {
    console.error('ADMIN ERROR:', action, error);
    return res.status(500).json({ message: error.message || 'Something went wrong.' });
  }
}
