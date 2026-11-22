import { getContent } from './_lib/store.js';

/* Public endpoint: the website reads its content from here. */
/* Image proxy (reached through /m/...). Vercel's edge cache keeps these responses for a year,
   so each picture is fetched from Supabase about once instead of on every visit. */
const IMAGE_PATH = /^site-media\/(images|logos)\/[A-Za-z0-9._-]+\.(jpe?g|png|webp|gif|avif)$/i;
const MAX_PROXY_BYTES = 4 * 1024 * 1024; /* Vercel functions cannot return more than ~4.5 MB */

async function proxyImage(req, res, rawPath) {
  const path = String(rawPath || '').replace(/^\/+/, '');
  const base = String(process.env.SUPABASE_URL || 'https://kznxobrdftfshkunpbmx.supabase.co').trim().replace(/\/+$/, '');
  if (!IMAGE_PATH.test(path)) return res.status(404).send('Not found');
  const origin = base + '/storage/v1/object/public/' + path;
  try {
    const upstream = await fetch(origin);
    if (!upstream.ok) return res.status(upstream.status === 404 ? 404 : 502).send('Image unavailable');
    const length = Number(upstream.headers.get('content-length') || 0);
    if (length > MAX_PROXY_BYTES) {
      res.setHeader('Cache-Control', 'public, s-maxage=3600');
      return res.redirect(302, origin);
    }
    const body = Buffer.from(await upstream.arrayBuffer());
    if (body.length > MAX_PROXY_BYTES) {
      res.setHeader('Cache-Control', 'public, s-maxage=3600');
      return res.redirect(302, origin);
    }
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(body);
  } catch (error) {
    console.error('image proxy failed:', error.message);
    return res.status(502).send('Image unavailable');
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  if (req.query && req.query.m !== undefined) return proxyImage(req, res, req.query.m);
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  const content = { ...(await getContent({ cache: true })) };
  /* Never let saved content decide this; it only comes from server settings. */
  delete content.security;
  if (process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY) {
    content.security = { turnstileSiteKey: process.env.TURNSTILE_SITE_KEY };
  }
  res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=600');
  return res.status(200).json(content);
}
