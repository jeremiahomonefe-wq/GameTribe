/*
 * For uptime monitors (UptimeRobot, Better Stack...):
 *   GET /api/health                           quick "the site's code is running" answer
 *   GET /api/health?deep=1&token=HEALTH_TOKEN checks the database, Paystack and email too.
 *                                             Answers 200 when all is well, 503 when checkout is at risk.
 * The deep check needs the secret HEALTH_TOKEN (set it in Vercel) so strangers cannot trigger it.
 */
import { runHealthChecks, tokenMatches } from './_lib/monitor.js';
import { alertOnce } from './_lib/security.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ message: 'Method not allowed.' });
  }
  if (!req.query || !req.query.deep) return res.status(200).json({ ok: true });
  if (!tokenMatches(req.query.token)) return res.status(403).json({ message: 'Forbidden.' });

  const result = await runHealthChecks();
  if (!result.ok) {
    const bad = result.checks.filter((c) => !c.ok && c.critical).map((c) => c.name + ': ' + c.detail).join('\n');
    await alertOnce('health', 'Checkout health check FAILED', 'Your uptime monitor ran the deep health check and these parts of checkout are not working:\n\n' + bad, 30 * 60 * 1000);
  }
  return res.status(result.ok ? 200 : 503).json({ ok: result.ok, at: result.at, checks: result.checks.map((c) => ({ name: c.name, ok: c.ok, detail: c.detail })) });
}
