/*
 * Gate check-in. A sale covers `admits_total` people; staff admit them
 * in one or several goes until `admitted_count` reaches the total.
 *
 * Every change is "compare and set": it only succeeds if the count is still
 * what we just read. If two gate devices act at the same moment, one of them
 * simply fails and re-reads, so nobody is ever admitted twice. The database
 * also has a CHECK constraint as a last safety net (see supabase/upgrade.sql).
 */
import { sb } from './supabase.js';

const enc = encodeURIComponent;

export async function getSale(reference) {
  const rows = await sb('/rest/v1/ticket_sales?select=*&reference=eq.' + enc(reference) + '&limit=1');
  return (rows && rows[0]) || null;
}

async function writeLog(reference, action, delta, byName, byRole) {
  try {
    await sb('/rest/v1/checkin_log', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: { reference, action, delta, by_name: byName, by_role: byRole }
    });
  } catch (e) {
    console.error('checkin_log write failed (check-in itself succeeded):', e.message);
  }
}

export async function admit(reference, count, byName, byRole) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const sale = await getSale(reference);
    if (!sale) return { error: 'not_found' };
    const total = Number(sale.admits_total) || 1;
    const current = Number(sale.admitted_count) || 0;
    if (current + count > total) return { error: 'too_many', sale };

    const rows = await sb(
      '/rest/v1/ticket_sales?reference=eq.' + enc(reference) + '&admitted_count=eq.' + current,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: { admitted_count: current + count, checked_in_at: new Date().toISOString(), checked_in_by: byName }
      }
    );
    if (rows && rows.length) {
      await writeLog(reference, 'admit', count, byName, byRole);
      return { ok: true, sale: rows[0] };
    }
    /* Someone else changed it between our read and write: read again. */
  }
  return { error: 'busy', sale: await getSale(reference) };
}

export async function undo(reference, count, byName, byRole) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const sale = await getSale(reference);
    if (!sale) return { error: 'not_found' };
    const current = Number(sale.admitted_count) || 0;
    if (count > current) return { error: 'nothing_to_undo', sale };
    const left = current - count;

    const rows = await sb(
      '/rest/v1/ticket_sales?reference=eq.' + enc(reference) + '&admitted_count=eq.' + current,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: {
          admitted_count: left,
          checked_in_at: left === 0 ? null : sale.checked_in_at,
          checked_in_by: left === 0 ? null : sale.checked_in_by
        }
      }
    );
    if (rows && rows.length) {
      await writeLog(reference, 'undo', count, byName, byRole);
      return { ok: true, sale: rows[0] };
    }
  }
  return { error: 'busy', sale: await getSale(reference) };
}

export async function getLog(reference) {
  try {
    return (await sb(
      '/rest/v1/checkin_log?select=action,delta,by_name,by_role,created_at&reference=eq.' + enc(reference) +
      '&order=created_at.desc&limit=50'
    )) || [];
  } catch (e) {
    return [];
  }
}
