/*
 * Tiny Supabase REST helper (no npm packages needed).
 * Uses the SERVICE ROLE key, so it must only ever run on the server.
 */
const clean = (v) => (v || '').trim().replace(/\/+$/, '');

export function supabaseConfigured() {
  return Boolean(clean(process.env.SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function supabaseUrl() {
  return clean(process.env.SUPABASE_URL);
}

export async function sb(path, { method = 'GET', headers = {}, body } = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const response = await fetch(supabaseUrl() + path, {
    method,
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }

  if (!response.ok) {
    const message = (data && (data.message || data.error || data.msg)) || response.statusText;
    const error = new Error('Supabase ' + response.status + ': ' + message);
    error.status = response.status;
    throw error;
  }
  return data;
}
