import { sb, supabaseConfigured } from './supabase.js';

/* Simple anonymous counters (no personal data): page views, sessions and checkout starts.
   Needs the site_events table from supabase/features.sql. Everything here fails quietly. */
export const EVENTS = new Set(['view', 'session', 'checkout_start', 'merch_checkout']);
export const lagosDay = (time = Date.now()) => new Date(time + 3600 * 1000).toISOString().slice(0, 10);

export async function bumpEvent(name) {
  if (!EVENTS.has(name) || !supabaseConfigured()) return false;
  try {
    await sb('/rest/v1/rpc/bump_event', { method: 'POST', body: { p_day: lagosDay(), p_event: name } });
    return true;
  } catch { return false; }
}

export async function readEvents(days = 30) {
  if (!supabaseConfigured()) return { configured: false, rows: [] };
  const since = lagosDay(Date.now() - (days - 1) * 86400000);
  try {
    const rows = (await sb('/rest/v1/site_events?day=gte.' + since + '&select=day,event,count&order=day.asc&limit=2000')) || [];
    return { configured: true, rows };
  } catch (error) {
    return { configured: false, rows: [], message: error.message };
  }
}
