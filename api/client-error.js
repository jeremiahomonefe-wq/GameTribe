/*
 * Visitors' browsers report script errors here (see the small snippet at the top
 * of the pages). Nothing sensitive is sent, it is rate limited, and only errors
 * from this site's own scripts are reported.
 */
import { reportBrowserError } from './_lib/monitor.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  let body = req.body;
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (body && typeof body === 'object' && body.message) {
    const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, n);
    try {
      await reportBrowserError({
        area: body.area === 'checkout' ? 'checkout' : 'browser',
        message: clean(body.message, 300),
        source: clean(body.source, 200),
        line: Number(body.line) || 0,
        page: clean(body.page, 120)
      }, req);
    } catch (e) { /* never fail the visitor */ }
  }
  return res.status(204).end();
}
