import { sb } from './_lib/supabase.js';
import { reportBrowserError, runHealthChecks, tokenMatches, checkOvercapacity, checkInventoryAlerts } from './_lib/monitor.js';
import * as ann from './_lib/announce.js';
import { getAvailability } from './_lib/store.js';
import { bumpEvent, EVENTS } from './_lib/events.js';
import { sendBackup } from './_lib/backup.js';
import { allow, clientIp } from './_lib/security.js';

const readBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
};
const cronAuthorised = (req) => Boolean(process.env.CRON_SECRET && String((req.headers || {}).authorization || '') === 'Bearer ' + process.env.CRON_SECRET);

async function advanceScheduledCampaigns() {
  const due = (await sb('/rest/v1/announcements?status=eq.scheduled&scheduled_for=lte.' + encodeURIComponent(new Date().toISOString()) + '&select=*&order=scheduled_for.asc&limit=3')) || [];
  let progressed = 0;
  for (const row of due) {
    const claimed = await sb('/rest/v1/announcements?id=eq.' + row.id + '&status=eq.scheduled', { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: { status: 'sending', started_at: new Date().toISOString() } });
    if (claimed && claimed[0]) progressed++;
  }
  const sending = (await sb('/rest/v1/announcements?status=eq.sending&select=*&order=id.asc&limit=3')) || [];
  for (const row of sending) {
    const start = Number(row.next_index) || 0;
    const chunk = (row.recipients || []).slice(start, start + ann.CHUNK);
    if (!chunk.length) {
      await sb('/rest/v1/announcements?id=eq.' + row.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { status: 'done' } });
      progressed++;
      continue;
    }
    const claim = await sb('/rest/v1/announcements?id=eq.' + row.id + '&next_index=eq.' + start, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: { next_index: start + chunk.length } });
    if (!claim || !claim.length) continue;
    let result;
    try { result = await ann.sendChunk({ recipients: chunk, subject: row.subject, body: row.body, audience: row.audience, idempotencyKey: 'ann-' + row.id + '-' + start }); }
    catch (error) { result = { sent: 0, failed: chunk.length, errors: [error.message] }; }
    const done = start + chunk.length >= Number(row.total || 0);
    const errors = ((row.errors ? row.errors + '\n' : '') + result.errors.join('\n')).slice(0, 1500) || null;
    await sb('/rest/v1/announcements?id=eq.' + row.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { sent_count: (Number(row.sent_count) || 0) + result.sent, failed_count: (Number(row.failed_count) || 0) + result.failed, errors, status: done ? 'done' : 'sending' } });
    progressed++;
  }
  return progressed;
}

/* When capacity is deliberately reopened, let a small waitlist batch know
   automatically. Recipients are marked only after the whole batch succeeds. */
async function notifyWaitlistWhenOpen() {
  const availability = await getAvailability();
  const open = Object.keys(availability.tickets || {}).some((id) => {
    const ticket = availability.tickets[id];
    return ticket && ticket.left !== null && Number(ticket.left) > 0;
  });
  if (!open) return 0;
  const recipients = await ann.recipientsFor('waitlist');
  const chunk = recipients.slice(0, ann.CHUNK);
  if (!chunk.length) return 0;
  const result = await ann.sendChunk({ recipients: chunk, subject: 'Tickets may be available again', body: 'Hi {name},\n\nGood news — tickets may now be available again for Game Tribe Fest. Please visit the website to check the remaining ticket options and reserve your spot.', audience: 'waitlist', idempotencyKey: 'waitlist-reopen-' + chunk.map((r) => r.email).join('|').slice(0, 180) });
  if (result.failed) return 0;
  const now = new Date().toISOString();
  for (const recipient of chunk) await sb('/rest/v1/waitlist?email=eq.' + encodeURIComponent(recipient.email), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { notified_at: now } });
  return chunk.length;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'POST' && req.query && (req.query.csp || req.query.report)) {
    const payload = await readBody(req);
    const csp = payload['csp-report'] || {};
    await reportBrowserError({ area: 'browser', message: csp['violated-directive'] || payload.message, source: payload.source, line: payload.line, page: csp['document-uri'] || payload.page }, req);
    return res.status(204).end();
  }
  if (req.method === 'POST' && req.query && req.query.event) {
    const name = String(req.query.event);
    if (EVENTS.has(name) && (await allow('beacon', clientIp(req), 120, 60 * 1000))) await bumpEvent(name);
    return res.status(204).end();
  }
  if (cronAuthorised(req)) {
    try {
      const campaigns = await advanceScheduledCampaigns();
      const waitlist = await notifyWaitlistWhenOpen();
      await Promise.all([checkOvercapacity(), checkInventoryAlerts()]);
      /* every Monday (Nigeria time) the owner gets a safety copy of the records by email */
      let backup = null;
      if (new Date(Date.now() + 3600 * 1000).getUTCDay() === 1) { try { backup = await sendBackup({ reason: 'weekly' }); } catch (error) { backup = { ok: false, message: error.message }; } }
      return res.status(200).json({ ok: true, campaigns, waitlist, backup: backup && backup.ok ? 'sent' : (backup ? backup.message : 'not due'), at: new Date().toISOString() });
    } catch (error) { return res.status(500).json({ ok: false, message: error.message || 'Scheduled work failed.' }); }
  }
  if (req.query && req.query.deep) {
    if (!tokenMatches(req.query.token)) return res.status(401).json({ message: 'Unauthorised.' });
    const result = await runHealthChecks();
    return res.status(result.ok ? 200 : 503).json(result);
  }
  return res.status(200).json({ ok: true, service: 'gametribe', at: new Date().toISOString() });
}
