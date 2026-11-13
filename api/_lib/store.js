import { DEFAULT_CONTENT } from './defaults.js';
import { sb, supabaseConfigured, supabaseUrl } from './supabase.js';

export const MEDIA_BUCKET = 'site-media';

/* Deep-merge saved content over defaults. Arrays from saved content replace
   the default  arrays completely (so deleting a sponsor really deletes it). */
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

/* How many people one ticket admits. Saved content from before this update
   has no "admits" value, so fall back to the name: a "Group" ticket = 4. */
export function ticketAdmits(t) {
  const n = Number(t && t.admits);
  if (Number.isInteger(n) && n >= 1) return n;
  return /group/i.test(String((t && t.id) || '') + ' ' + String((t && t.label) || '')) ? 4 : 1;
}

/* { ticket_id: { label, amount, admits } } — includes inactive tickets so a
   payment that was already started can still be verified. */
export async function getTicketMap() {
  const content = await getContent();
  const map = {};
  for (const t of content.tickets || []) {
    if (t && t.id) map[t.id] = { label: t.label, amount: Number(t.price), admits: ticketAdmits(t) };
  }
  return map;
}

const NEW_SALE_COLUMNS = ['quantity', 'unit_price', 'admits_per_unit', 'admits_total'];

/* Record a paid ticket. Safe to call more than once for the same reference
   (webhook + browser verification both call it).
   Normally it never throws. With { strict: true } it throws if the sale could
   not be saved, so the caller can tell Paystack to retry later. */
export async function recordSale(row, opts = {}) {
  if (!supabaseConfigured()) return;
  const clean = {};
  for (const [k, v] of Object.entries(row)) {
    if (v !== undefined && v !== null && v !== '') clean[k] = v;
  }
  const send = (body) => sb('/rest/v1/ticket_sales?on_conflict=reference', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body
  });
  const giveUp = (error) => {
    console.error('recordSale failed:', error.message);
    if (opts.strict) throw error;
  };
  try {
    await send(clean);
    if (clean.reference) { try { await releaseReservation(clean.reference); } catch (e) { /* hold simply expires */ } }
  } catch (error) {
    /* If the SQL update has not been run yet, the new columns do not exist.
       Still save the sale in the old format rather than losing it. */
    if (error.status === 400 && NEW_SALE_COLUMNS.some((c) => c in clean)) {
      console.error('recordSale: new columns missing, saving in old format. Run supabase/upgrade.sql.', error.message);
      const legacy = { ...clean };
      NEW_SALE_COLUMNS.forEach((c) => delete legacy[c]);
      try { await send(legacy); } catch (e2) { giveUp(e2); }
      return;
    }
    /* A hiccup on Supabase's side (5xx or network): try once more. */
    if (!error.status || error.status >= 500) {
      try { await send(clean); return; } catch (e3) { giveUp(e3); return; }
    }
    giveUp(error);
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

/* ---------- capacity, sold out, seat holds ---------- */
const HOLD_MINUTES = 15;
const encU = encodeURIComponent;

export async function createReservation(row) {
  const rows = await sb('/rest/v1/reservations', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: {
      reference: row.reference,
      ticket_type: row.ticket_type,
      quantity: row.quantity,
      people: row.people,
      expires_at: new Date(Date.now() + HOLD_MINUTES * 60 * 1000).toISOString()
    }
  });
  return rows && rows[0];
}

export async function releaseReservation(reference) {
  if (!supabaseConfigured()) return;
  await sb('/rest/v1/reservations?reference=eq.' + encU(reference), { method: 'DELETE' });
}

/*
 * How many tickets are left. "Held" tickets belong to people who are paying right now
 * (held for 15 minutes). People are counted, not tickets: a Group of 4 uses 4 places.
 * beforeId: count only holds made before that one (used to settle two people grabbing the last ticket).
 */
export async function getAvailability({ beforeId } = {}) {
  const content = await getContent();
  const cfg = content.ticketing || {};
  const capTotal = Number(cfg.capacityTotal) || 0;
  const out = { capacityTotal: capTotal, showLeftBelow: Number(cfg.showLeftBelow) || 0, peopleSold: 0, peopleHeld: 0, peopleLeft: null, tickets: {}, limited: {}, over: false };
  const list = (content.tickets || []).filter((t) => t && t.id);
  if (!supabaseConfigured()) {
    list.forEach((t) => { out.tickets[t.id] = { left: null, soldOut: false }; out.limited[t.id] = false; });
    return out;
  }
  const sales = (await sb('/rest/v1/ticket_sales?select=reference,ticket_type,quantity,admits_total&limit=5000')) || [];
  let holds = [];
  try {
    holds = (await sb('/rest/v1/reservations?select=id,reference,ticket_type,quantity,people&expires_at=gte.' + encU(new Date().toISOString()) + '&limit=2000')) || [];
  } catch (e) { holds = []; }   /* table not created yet: no holds */
  const sold = new Set(sales.map((x) => x.reference));
  holds = holds.filter((h) => !sold.has(h.reference) && (beforeId === undefined || Number(h.id) < Number(beforeId)));

  const unitsSold = {};
  const unitsHeld = {};
  for (const x of sales) {
    out.peopleSold += Number(x.admits_total) || 1;
    unitsSold[x.ticket_type] = (unitsSold[x.ticket_type] || 0) + (Number(x.quantity) || 1);
  }
  for (const h of holds) {
    out.peopleHeld += Number(h.people) || 0;
    unitsHeld[h.ticket_type] = (unitsHeld[h.ticket_type] || 0) + (Number(h.quantity) || 0);
  }
  if (capTotal) out.peopleLeft = capTotal - out.peopleSold - out.peopleHeld;
  for (const t of list) {
    const cap = Number(t.capacity) || 0;
    const admits = ticketAdmits(t);
    let left = null;
    if (cap) left = cap - (unitsSold[t.id] || 0) - (unitsHeld[t.id] || 0);
    if (capTotal) {
      const byPeople = Math.floor(out.peopleLeft / admits);
      left = left === null ? byPeople : Math.min(left, byPeople);
    }
    if (left !== null) left = Math.max(left, left < 0 ? left : 0);
    out.limited[t.id] = Boolean(cap || capTotal);
    out.tickets[t.id] = { left: left === null ? null : Math.max(0, left), soldOut: left !== null && left <= 0 };
    if (left !== null && left < 0) out.over = true;
  }
  if (out.peopleLeft !== null && out.peopleLeft < 0) out.over = true;
  return out;
}
