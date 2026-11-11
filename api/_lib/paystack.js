/*
 * Small Paystack helpers used to compare Paystack with the saved sales
 * (the "Check against Paystack" tool in the admin).
 */
const BASE = 'https://api.paystack.co';
const enc = encodeURIComponent;

async function call(path) {
  if (!process.env.PAYSTACK_SECRET_KEY) throw new Error('PAYSTACK_SECRET_KEY is not configured.');
  const response = await fetch(BASE + path, {
    headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY }
  });
  let json = null;
  try { json = await response.json(); } catch (e) { json = null; }
  if (!response.ok || !json || json.status === false) {
    throw new Error('Paystack: ' + ((json && json.message) || response.status));
  }
  return json;
}

/* Paystack sometimes returns metadata as a JSON string, sometimes as an object, sometimes null. */
export function normalizeTx(tx) {
  const t = { ...(tx || {}) };
  let m = t.metadata;
  if (typeof m === 'string') {
    try { m = JSON.parse(m); } catch (e) { m = null; }
  }
  t.metadata = m && typeof m === 'object' ? m : {};
  return t;
}

/* Every successful payment between two dates (follows Paystack's pages). */
export async function listSuccessful({ from, to, maxPages = 15 }) {
  const out = [];
  let page = 1;
  let pageCount = 1;
  do {
    const q = '/transaction?status=success&perPage=200&page=' + page +
      '&from=' + enc(from) + '&to=' + enc(to);
    const json = await call(q);
    for (const tx of json.data || []) out.push(normalizeTx(tx));
    pageCount = Number(json.meta && json.meta.pageCount) || 1;
    page += 1;
    if (page <= pageCount) await new Promise((r) => setTimeout(r, 120));
  } while (page <= pageCount && page <= maxPages);
  return { transactions: out, truncated: pageCount > maxPages };
}

export async function verifyTransaction(reference) {
  const json = await call('/transaction/verify/' + enc(reference));
  return normalizeTx(json.data);
}
