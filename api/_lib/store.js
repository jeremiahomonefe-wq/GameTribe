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

export async function getContent() {
  if (!supabaseConfigured()) return DEFAULT_CONTENT;
  try {
    const rows = await sb('/rest/v1/site_content?key=eq.main&select=value');
    const saved = rows && rows[0] && rows[0].value;
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
  if (!supabaseConfigured()) return;
  try {
    const clean = {};
    for (const [k, v] of Object.entries(row)) {
      if (v !== undefined && v !== null && v !== '') clean[k] = v;
    }
    await sb('/rest/v1/ticket_sales?on_conflict=reference', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: clean
    });
  } catch (error) {
    console.error('recordSale failed:', error.message);
  }
}

export async function listSales() {
  const rows = await sb('/rest/v1/ticket_sales?select=*&order=created_at.desc&limit=5000');
  return rows || [];
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
