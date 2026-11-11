/*
 * Receives "Content-Security-Policy-Report-Only" violation reports from browsers
 * and writes one short line per report to the Vercel logs (search for CSP-REPORT).
 * Nothing is stored. Reports are rate limited per address (in memory) so it can't be flooded.
 */
const seen = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const recent = (seen.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 60) return res.status(204).end();
  recent.push(now);
  seen.set(ip, recent);

  let body = req.body;
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  const r = (body && (body['csp-report'] || body)) || {};
  console.log('CSP-REPORT', JSON.stringify({
    page: String(r['document-uri'] || r.documentURL || '').slice(0, 200),
    directive: String(r['violated-directive'] || r.effectiveDirective || '').slice(0, 80),
    blocked: String(r['blocked-uri'] || r.blockedURL || '').slice(0, 200)
  }));
  return res.status(204).end();
}
