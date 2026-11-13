/* Public: join the waitlist for a sold-out ticket. */
import { getContent } from './_lib/store.js';
import { sb, supabaseConfigured } from './_lib/supabase.js';
import { allow, clientIp } from './_lib/security.js';
import { cleanName, cleanPhone } from './_lib/tickets.js';
import { normEmail, validEmail } from './_lib/team.js';
import { reportError } from './_lib/monitor.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed.' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const email = normEmail(body.email);
    const name = cleanName(body.name, '');
    if (!name) return res.status(400).json({ message: 'Please enter your name.' });
    if (!validEmail(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });
    const qty = body.quantity === undefined ? 1 : Number(body.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) return res.status(400).json({ message: 'Choose between 1 and 50 tickets.' });
    if (!(await allow('waitlist-ip', clientIp(req), 5, 60 * 60 * 1000)) || !(await allow('waitlist-all', 'all', 300, 60 * 60 * 1000))) {
      return res.status(429).json({ message: 'Too many sign-ups. Please try again later.' });
    }
    if (!supabaseConfigured()) return res.status(503).json({ message: 'The waitlist is not available right now.' });
    const known = ((await getContent()).tickets || []).map((t) => t.id);
    const ticketType = known.includes(body.ticketType) ? body.ticketType : null;
    await sb('/rest/v1/waitlist?on_conflict=email', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: { name, email, phone: cleanPhone(body.phone) || null, ticket_type: ticketType, quantity: qty, notified_at: null }
    });
    return res.status(200).json({ ok: true, message: 'You are on the waitlist! If tickets become available we will email you straight away.' });
  } catch (error) {
    await reportError('waitlist', error, req);
    return res.status(500).json({ message: 'Could not save your details. Please try again.' });
  }
}
