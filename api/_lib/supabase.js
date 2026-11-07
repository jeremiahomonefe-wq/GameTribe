/*
 * Tiny Supabase REST helper (no npm packages needed).
 * Uses the SERVICE ROLE key, so it must only ever run on the server.
 */
/* Accepts the URL with or without a trailing slash, a /rest/v1 suffix, or no
   https:// and always returns just https://<project>.supabase.co */
export function supabaseUrl() {
  const raw = (process.env.SUPABASE_URL || '').trim();
  if (!raw) return '';
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw).origin;
  } catch (e) {
    return raw.replace(/\/+$/, '');
  }
}

export function supabaseConfigured() {
  return Boolean(supabaseUrl() && (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim());
}

export async function sb(path, { method = 'GET', headers = {}, body } = {}) {
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
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
    const host = supabaseUrl().replace(/^https?:\/\//, '');
    const error = new Error(
      'Supabase ' + response.status + ': ' + message +
      ' (' + method + ' ' + path.split('?')[0] + ' on ' + host + ')'
    );
    error.status = response.status;
    throw error;
  }
  return data;
}
