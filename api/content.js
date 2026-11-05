import { getContent } from './_lib/store.js';

/* Public endpoint: the website reads its content from here. */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const content = await getContent();
  res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60');
  return res.status(200).json(content);
}
