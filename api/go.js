import { getContent } from './_lib/store.js';

/*
 * Sponsor page:  yoursite.com/get.falconlite.com
 *
 * Opens the sponsor's website inside a Game Tribe page (with a Game Tribe
 * bar on top) so visitors stay on gametribeng.com. If the sponsor's site does
 * not allow being shown inside another website, a Game Tribe sponsor card with
 * a "Visit" button is shown instead.
 *
 * SAFETY: only websites that you added as a logo link in the dashboard can be
 * opened here, so nobody can use this page to show other people's sites.
 */

const esc = (v) =>
  String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const hostKey = (link) => {
  try {
    const u = new URL(link);
    if (!/^https?:$/.test(u.protocol)) return null;
    return u.host.toLowerCase().replace(/^www\./, '');
  } catch (e) { return null; }
};

const assetUrl = (v) => {
  v = String(v || '');
  if (/^https?:\/\//i.test(v)) return v;
  return v ? '/' + v.replace(/^\/+/, '') : '';
};

const embedCache = new Map();

async function canEmbed(url, ownHost) {
  const hit = embedCache.get(url);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.ok;
  let ok = false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    const r = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GameTribeEmbedCheck/1.0)' }
    });
    clearTimeout(timer);
    if (r.body && r.body.cancel) r.body.cancel().catch(() => {});
    const xfo = (r.headers.get('x-frame-options') || '').toLowerCase();
    const csp = (r.headers.get('content-security-policy') || '').toLowerCase();
    const fa = /frame-ancestors([^;]*)/.exec(csp);
    const faAllows = !fa || fa[1].includes('*') || (ownHost && fa[1].includes(ownHost));
    ok = r.ok && !/deny|sameorigin|allow-from/.test(xfo) && faAllows;
  } catch (e) {
    ok = false;
  }
  embedCache.set(url, { ok, at: Date.now() });
  return ok;
}

const BASE_HEAD = (title) => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bowlby+One&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
<style>
body{margin:0;min-height:100vh;display:flex;flex-direction:column;background:var(--cream)}
.gobar{display:flex;align-items:center;gap:12px;padding:8px 16px;background:var(--ink);color:#fff;flex-shrink:0}
.gobar img{height:40px;width:auto}
.gobar .sp{flex:1;min-width:0;font-weight:800;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gobar .sp small{display:block;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);font-weight:800}
.gobar .btn{padding:8px 16px;font-size:12px}
.frame{flex:1;width:100%;border:0;background:#fff;min-height:0}
.card-wrap{flex:1;display:grid;place-items:center;padding:32px 20px}
.spot{width:100%;max-width:520px;background:#fff;border:1px solid var(--line);border-radius:24px;padding:36px 28px;text-align:center;box-shadow:0 20px 50px rgba(28,20,16,.1)}
.spot .tag{display:inline-block;padding:6px 14px;border-radius:999px;background:var(--gold);color:var(--ink);font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
.spot .logo{margin:22px auto 6px;max-width:260px;max-height:120px;width:auto;height:auto;object-fit:contain}
.spot h1{font-family:var(--display);text-transform:uppercase;font-size:clamp(24px,5vw,34px);line-height:1.05;margin:14px 0 8px}
.spot p{color:rgba(28,20,16,.7);margin:0 0 22px}
.spot .host{display:inline-block;font-weight:800;background:var(--cream);border-radius:999px;padding:4px 12px;font-size:13px;margin-bottom:22px}
.spot .btns{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
@media(max-width:600px){.gobar .sp small{display:none}.gobar .btn.back{display:none}}
</style>
</head>`;

function bar(item, host, url) {
  return `<div class="gobar">
  <a href="/" aria-label="Back to Game Tribe"><img src="/assets/logo.png" alt="Game Tribe"></a>
  <div class="sp"><small>Game Tribe sponsor</small>${esc(item.name || host)}</div>
  <a class="btn btn-light back" href="/">← Back to Game Tribe</a>
  <a class="btn btn-yellow" href="${esc(url)}" target="_blank" rel="noopener">Open ${esc(host)} ↗</a>
</div>`;
}

function notFound(res) {
  res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(BASE_HEAD('Not found · Game Tribe') + `<body>
<div class="card-wrap"><div class="spot"><span class="tag">404</span>
<h1>We couldn’t find that page</h1><p>That sponsor link isn’t on our list.</p>
<div class="btns"><a class="btn btn-red" href="/">Back to Game Tribe</a></div></div></div></body></html>`);
}

export default async function handler(req, res) {
  const wanted = String((req.query && req.query.host) || '').toLowerCase().replace(/^www\./, '').trim();
  if (!wanted || wanted.length > 120) return notFound(res);

  const content = await getContent();
  const groups = (content.sponsors && content.sponsors.groups) || [];
  let found = null;
  for (const g of groups) {
    for (const item of g.items || []) {
      if (item && item.link && hostKey(item.link) === wanted) { found = { item, group: g }; break; }
    }
    if (found) break;
  }
  if (!found) return notFound(res);

  const { item, group } = found;
  const url = item.link;
  const ownHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
  const embed = await canEmbed(url, ownHost);
  const name = item.name || wanted;

  res.status(200);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  if (embed) {
    return res.send(BASE_HEAD(name + ' · Game Tribe') + `<body>
${bar(item, wanted, url)}
<iframe class="frame" src="${esc(url)}" title="${esc(name)}" referrerpolicy="no-referrer-when-downgrade"
  sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"></iframe>
</body></html>`);
  }

  const logo = assetUrl(item.image);
  return res.send(BASE_HEAD(name + ' · Game Tribe') + `<body>
${bar(item, wanted, url)}
<div class="card-wrap"><div class="spot">
  <span class="tag">${esc(group.title || 'Partner')}</span>
  ${logo ? `<img class="logo" src="${esc(logo)}" alt="${esc(name)}">` : ''}
  <h1>${esc(name)}</h1>
  <span class="host">${esc(wanted)}</span>
  <p>You’re about to visit one of the brands behind Game Tribe Fest.</p>
  <div class="btns">
    <a class="btn btn-red" href="${esc(url)}" target="_blank" rel="noopener">Visit ${esc(wanted)} ↗</a>
    <a class="btn btn-outline" href="/">Back to Game Tribe</a>
  </div>
</div></div>
</body></html>`);
}
