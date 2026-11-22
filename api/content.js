import { getContent } from './_lib/store.js';

/* Public endpoint: the website reads its content from here. */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const content = { ...(await getContent({ cache: true })) };
  /* Never let saved content decide this; it only comes from server settings. */
  delete content.security;
  if (process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY) {
    content.security = { turnstileSiteKey: process.env.TURNSTILE_SITE_KEY };
  }
  res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=600');
  return res.status(200).json(content);
}
