/* Public: how many tickets are left (only for tickets that have a limit). Cached for a few seconds. */
import { getAvailability } from './_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method not allowed.' });
  }
  try {
    const a = await getAvailability();
    res.setHeader('Cache-Control', 'public, s-maxage=8, stale-while-revalidate=30');
    return res.status(200).json({ tickets: a.tickets, showLeftBelow: a.showLeftBelow });
  } catch (e) {
    /* The page  then just shows everything as available, as before. */
    return res.status(200).json({ tickets: {}, showLeftBelow: 0 });
  }
}
