
import { DEFAULT_CONTENT } from './defaults.js';
import { sb, supabaseConfigured, supabaseUrl } from './supabase.js';

export const MEDIA_BUCKET = 'site-media';

function merge(base, saved) {
  if (Array.isArray(base)) return Array.isArray(saved) ? saved : base;

  if (base && typeof base === 'object') {
    const out = { ...base };

    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      for (const key of Object.keys(saved)) {
        out[key] = key in base
          ? merge(base[key], saved[key])
          : saved[key];
      }
    }

    return out;
  }

  return saved === undefined || saved === null ? base : saved;
}

function migrateMemories(saved) {
  const mem = saved && saved.pages && saved.pages.memories;

  if (mem && Array.isArray(mem.events) && !Array.isArray(mem.years)) {
    const years = mem.events.map((e, i) => {
      const found = String((e && e.date) || '') + ' ' +
        String((e && e.title) || '');
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

    return {
      ...saved,
      pages: {
        ...saved.pages,
        memories: { ...rest, years }
      }
    };
  }

  return saved;
}

function migrate(saved) {
  saved = migrateMemories(saved);

  const sp = saved && saved.sponsors;

  if (
    sp &&
    !Array.isArray(sp.groups) &&
    (Array.isArray(sp.sponsors) || Array.isArray(sp.vendors))
  ) {
    const groups = DEFAULT_CONTENT.sponsors.groups.map((g) => {
      if (g.id === 'sponsors' && Array.isArray(sp.sponsors)) {
        return { ...g, items: sp.sponsors };
      }

      if (g.id === 'vendors' && Array.isArray(sp.vendors)) {
        return { ...g, items: sp.vendors };
      }

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
    const rows = await sb(
      '/rest/v1/site_content?key=eq.main&select=value'
    );

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
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: {
      key: 'main',
      value: content,
      updated_at: new Date().toISOString()
    }
  });
}

function buildTicketMap(tickets) {
  const map = {};

  for (const t of tickets || []) {
    if (t && t.id) {
      const amount = Number(t.price);

      if (Number.isFinite(amount) && amount > 0) {
        map[t.id] = {
          label: t.label,
          amount
        };
      }
    }
  }

  return map;
}

/* General website use. Retains the existing fallback behaviour. */
export async function getTicketMap() {
  const content = await getContent();
  return buildTicketMap(content.tickets || []);
}

/*
 * Payment use only.
 * Never silently falls back to defaults when Supabase is unavailable.
 */
export async function getTicketMapStrict() {
  if (!supabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  const rows = await sb(
    '/rest/v1/site_content?key=eq.main&select=value'
  );

  const saved = rows && rows[0] && rows[0].value;

  const tickets = saved && Array.isArray(saved.tickets)
    ? saved.tickets
    : DEFAULT_CONTENT.tickets;

  const map = buildTicketMap(tickets);

  if (!Object.keys(map).length) {
    throw new Error('No valid ticket configuration was found.');
  }

  return map;
}

/*
 * Save a paid ticket.
 * Unlike the previous version, database errors are NOT swallowed.
 */
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

/* Retrieve one sale by its Paystack reference. */
export async function getSale(reference) {
  if (!supabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  const rows = await sb(
    '/rest/v1/ticket_sales?reference=eq.' +
    encodeURIComponent(reference) +
    '&select=*&limit=1'
  );

  return rows && rows[0] ? rows[0] : null;
}

/* Update email delivery information without overwriting payment details. */
export async function updateSaleEmail(reference, updates) {
  if (!supabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  await sb(
    '/rest/v1/ticket_sales?reference=eq.' +
    encodeURIComponent(reference),
    {
      method: 'PATCH',
      headers: {
        Prefer: 'return=minimal'
      },
      body: {
        ...updates,
        updated_at: new Date().toISOString()
      }
    }
  );
}

export async function listSales() {
  const rows = await sb(
    '/rest/v1/ticket_sales?select=*&order=created_at.desc&limit=5000'
  );

  return rows || [];
}

/* Existing media upload functionality. */
export async function createSignedUpload(path) {
  const data = await sb(
    '/storage/v1/object/upload/sign/' + path,
    {
      method: 'POST',
      body: {}
    }
  );

  let url = data && data.url;

  if (!url) {
    throw new Error('Supabase did not return an upload URL.');
  }

  if (!/^https?:/i.test(url)) {
    url = supabaseUrl() + '/storage/v1' +
      (url.startsWith('/') ? '' : '/') + url;
  }

  return {
    uploadUrl: url,
    path,
    publicUrl: supabaseUrl() +
      '/storage/v1/object/public/' +
      MEDIA_BUCKET + '/' + path
  };
}
