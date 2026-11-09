import { DEFAULT_CONTENT } from './defaults.js';
import { sb, supabaseConfigured, supabaseUrl } from './supabase.js';

export const MEDIA_BUCKET = 'site-media';

/* Deep-merge saved content over defaults. Arrays from saved content replace
   the default arrays completely (so deleting a sponsor really deletes it). */
function merge(base, saved) {
  if (Array.isArray(base)) return Array.isArray(saved) ? saved : base;
  if (base && typeof base === 'object') {
    const out = { ...base };
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      for (const key of Object.keys(saved)) {
        out[key] = key in base ? merge(base[key], saved[key]) : saved[key];
      }
    }
    return out;
  }
  return saved === undefined || saved === null ? base : saved;
}

/* The first version of the Memories page used "events"; it now uses one gallery per "year". */
function migrateMemories(saved) {
  const mem = saved && saved.pages && saved.pages.memories;
  if (mem && Array.isArray(mem.events) && !Array.isArray(mem.years)) {
    const years = mem.events.map((e, i) => {
      const found = String((e && e.date) || '') + ' ' + String((e && e.title) || '');
      const m = found.match(/(?:19|20)\d\d/);
      return {
        id: (e && e.id) || 'y' + i,
        year: m ? m[0] : '',
        title: (e && e.title) || '',
        description: (e && e.description) || '',
        photos: (e && e.photos) || [],
        videos: (e && e.videos) || []
      };
    });
    const { events: _e, ...rest } = mem;
    return { ...saved, pages: { ...saved.pages, memories: { ...rest, years } } };
  }
  return saved;
}

/* Older saved content had two lists (sponsors, vendors). Convert them to the
   new category list without losing anything the admin already edited. */
function migrate(saved) {
  saved = migrateMemories(saved);
  const sp = saved && saved.sponsors;
  if (sp && !Array.isArray(sp.groups) && (Array.isArray(sp.sponsors) || Array.isArray(sp.vendors))) {
    const groups = DEFAULT_CONTENT.sponsors.groups.map((g) => {
      if (g.id === 'sponsors' && Array.isArray(sp.sponsors)) return { ...g, items: sp.sponsors };
      if (g.id === 'vendors' && Array.isArray(sp.vendors)) return { ...g, items: sp.vendors };
      return g;
    });
    const { sponsors: _s, vendors: _v, ...rest } = sp;
    return { ...saved, sponsors: { ...rest, groups } };
  }
  return saved;
}

export async function getContent() {
  if (!supabaseConfigured()) return DEFAULT_CONTENT;
  try {
    const rows = await sb('/rest/v1/site_content?key=eq.main&select=value');
    const saved = migrate(rows && rows[0] && rows[0].value);
    return saved ? merge(DEFAULT_CONTENT, saved) : DEFAULT_CONTENT;
  } catch (error) {
    console.error('getContent failed, using defaults:', error.message);
    return DEFAULT_CONTENT;
  }
}

export async function saveContent(content) {
  await sb('/rest/v1/site_content?on_conflict=key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: { key: 'main', value: content, updated_at: new Date().toISOString() }
  });
}

/* { ticket_id: { label, amount } } — includes inactive tickets so a payment
   that was already started can still be verified. */
export async function getTicketMap() {
  const content = await getContent();
  const map = {};
  for (const t of content.tickets || []) {
    if (t && t.id) map[t.id] = { label: t.label, amount: Number(t.price) };
  }
  return map;
}

/* Record a paid ticket. Safe to call more than once for the same reference
   (webhook + browser verification both call it). Never throws. */
export async function recordSale(row) {
  if (!supabaseConfigured()) {
    throw new Error('Supabase is not configured. Sale was not recorded.');
  }

  const clean = {};

  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined && value !== null && value !== '') {
      clean[key] = value;
    }
  }

  if (!clean.reference) {
    throw new Error('Cannot record a sale without a payment reference.');
  }

  const result = await sb(
    '/rest/v1/ticket_sales?on_conflict=reference',
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation'
      },
      body: clean
    }
  );

  if (!result || !result.length) {
    throw new Error('Supabase did not confirm the ticket sale.');
  }

  return result[0];
}

/* Create a one-time upload URL so the browser can send the file straight to
   Supabase Storage (works for large videos too). */
export async function createSignedUpload(path) {
  const data = await sb(
    '/storage/v1/object/upload/sign/' + MEDIA_BUCKET + '/' + path,
    { method: 'POST', body: {} }
  );
  let url = data && data.url;
  if (!url) throw new Error('Supabase did not return an upload URL.');
  if (!/^https?:/i.test(url)) {
    url = supabaseUrl() + '/storage/v1' + (url.startsWith('/') ? '' : '/') + url;
  }
  return {
    uploadUrl: url,
    path,
    publicUrl: supabaseUrl() + '/storage/v1/object/public/' + MEDIA_BUCKET + '/' + path
  };
}
