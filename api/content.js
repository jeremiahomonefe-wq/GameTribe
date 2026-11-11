import { getContent } from './_lib/store.js';

/* Public endpoint: the website reads its content from here. */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const content = { ...(await getContent()) };
  /* Never let saved content decide this; it only comes from server settings. */
  delete content.security;
  if (process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY) {
    content.security = { turnstileSiteKey: process.env.TURNSTILE_SITE_KEY };
  }
  res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60');
  return res.status(200).json(content);
}
