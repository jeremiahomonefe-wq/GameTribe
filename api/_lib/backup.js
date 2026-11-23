import { sb, supabaseConfigured } from './supabase.js';
import { getContent, listSales } from './store.js';

/* Weekly safety copy: key records as spreadsheets (CSV) plus a copy of the site content,
   emailed to the owner. Nothing here is ever shown publicly. */
const RECIPIENT = () => String(process.env.BACKUP_EMAIL || process.env.ALERT_EMAIL || process.env.CONTACT_TO_EMAIL || '').trim();

function csvCell(value) {
  let text = value === null || value === undefined ? '' : (typeof value === 'object' ? JSON.stringify(value) : String(value));
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text; /* stops spreadsheet formula tricks */
  return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}
export function toCsv(rows) {
  if (!rows || !rows.length) return 'No records yet\n';
  const columns = [];
  rows.forEach((row) => Object.keys(row || {}).forEach((key) => { if (!columns.includes(key)) columns.push(key); }));
  return [columns.map(csvCell).join(',')].concat(rows.map((row) => columns.map((key) => csvCell(row[key])).join(','))).join('\n') + '\n';
}

async function safe(path) { try { return (await sb(path)) || []; } catch { return null; } }

export async function buildBackup() {
  const files = [];
  const counts = {};
  const add = (name, rows) => { if (rows === null) { counts[name] = 'not available'; return; } counts[name] = rows.length; files.push({ filename: name + '.csv', content: Buffer.from('\ufeff' + toCsv(rows), 'utf8').toString('base64') }); };
  let sales = null;
  try { sales = await listSales(); } catch { sales = null; }
  add('ticket-sales', sales);
  add('merch-orders', await safe('/rest/v1/merch_orders?select=*&order=created_at.desc&limit=5000'));
  add('advertising-leads', await safe('/rest/v1/advertising_leads?select=*&order=created_at.desc&limit=2000'));
  add('feedback', await safe('/rest/v1/attendee_feedback?select=*&order=created_at.desc&limit=2000'));
  add('waitlist', await safe('/rest/v1/waitlist?select=*&order=created_at.desc&limit=2000'));
  add('coupons', await safe('/rest/v1/coupons?select=*&limit=500'));
  try { files.push({ filename: 'site-content.json', content: Buffer.from(JSON.stringify(await getContent(), null, 2), 'utf8').toString('base64') }); counts['site-content'] = 'ok'; } catch { counts['site-content'] = 'not available'; }
  return { files, counts };
}

export async function sendBackup({ to, reason = 'weekly' } = {}) {
  const target = String(to || RECIPIENT()).trim();
  if (!target) return { ok: false, message: 'No backup email address is set. Add ALERT_EMAIL (or BACKUP_EMAIL) in Vercel.' };
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return { ok: false, message: 'Email is not configured yet (RESEND_API_KEY and RESEND_FROM_EMAIL).' };
  if (!supabaseConfigured()) return { ok: false, message: 'The database is not connected.' };
  const { files, counts } = await buildBackup();
  const date = new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 10);
  const lines = Object.keys(counts).map((k) => '  ' + k + ': ' + counts[k]);
  const response = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL, to: [target],
      subject: 'Game Tribe backup · ' + date + (reason === 'manual' ? ' (manual)' : ''),
      text: 'Your ' + (reason === 'manual' ? 'requested' : 'weekly') + ' Game Tribe backup is attached.\n\nRecords included:\n' + lines.join('\n') + '\n\nThese files contain personal details (names, emails, phone numbers). Keep them private and delete this email when you no longer need it.',
      attachments: files
    })
  });
  if (!response.ok) return { ok: false, message: 'The email provider rejected the backup email.' };
  return { ok: true, to: target, counts };
}
