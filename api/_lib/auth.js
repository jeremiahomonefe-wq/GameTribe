import crypto from 'crypto';

const COOKIE = 'gt_admin';
const MAX_AGE = 60 * 60 * 12; // 12 hours

function secret() {
  return crypto
    .createHash('sha256')
    .update('gt-admin|' + (process.env.ADMIN_PASSWORD || '') + '|' + (process.env.SUPABASE_SERVICE_ROLE_KEY || ''))
    .digest();
}

const b64 = (buf) => Buffer.from(buf).toString('base64url');

function sign(payload) {
  const body = b64(JSON.stringify(payload));
  const mac = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return body + '.' + mac;
}

/* Returns the session payload if the token is genuine and not expired, else null. */
function verify(token) {
  if (!token || token.indexOf('.') < 0) return null;
  const [body, mac] = token.split('.');
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    return payload.exp > Date.now() ? payload : null;
  } catch (e) {
    return null;
  }
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return '';
}

export function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 8);
}

/* The signed-in session { role, uid?, name?, email? } or null.
   Sessions created before roles existed have no role: only the main admin
   password could create those, so they are the owner. */
export function getSession(req) {
  if (!adminConfigured()) return null;
  const payload = verify(readCookie(req, COOKIE));
  if (!payload) return null;
  return { ...payload, role: payload.role || 'owner' };
}

export function isAdmin(req) {
  return getSession(req) !== null;
}

export function passwordMatches(input) {
  const a = crypto.createHash('sha256').update(String(input || '')).digest();
  const b = crypto.createHash('sha256').update(String(process.env.ADMIN_PASSWORD || '')).digest();
  return crypto.timingSafeEqual(a, b);
}

/* extra = { role, uid, name, email } for team members. Omit it for the main admin. */
export function sessionCookie(extra) {
  const token = sign({ role: 'owner', ...(extra || {}), exp: Date.now() + MAX_AGE * 1000 });
  return COOKIE + '=' + token + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=' + MAX_AGE;
}

export function clearCookie() {
  return COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
}
