/*
 * Authenticator-app codes (TOTP, RFC 6238) using only Node's crypto.
 * Works with Google Authenticator, Microsoft Authenticator, Authy, 1Password...
 */
import crypto from 'crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    value &= (1 << bits) - 1;
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text) {
  const clean = String(text || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    value = (value << 5) | ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
    value &= (1 << bits) - 1;
  }
  return Buffer.from(out);
}

export const newSecret = () => base32Encode(crypto.randomBytes(20));

export function hotp(key, counter) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', key).update(msg).digest();
  const o = h[19] & 0xf;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1000000).padStart(6, '0');
}

/*
 * Returns the matched 30-second step (a number > 0) or 0 if the code is wrong.
 * `lastStep` is the last step already used: a code can only be used once, so a
 * code someone watched over your shoulder cannot be replayed.
 */
export function verifyTotp(secret, code, { now = Date.now(), lastStep = 0, window = 1 } = {}) {
  const given = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(given)) return 0;
  const key = base32Decode(secret);
  if (!key.length) return 0;
  const current = Math.floor(now / 30000);
  let matched = 0;
  for (let d = -window; d <= window; d++) {
    const step = current + d;
    const ok = crypto.timingSafeEqual(Buffer.from(hotp(key, step)), Buffer.from(given));
    if (ok && step > lastStep && step > matched) matched = step;
  }
  return matched;
}

export function otpauthUri({ secret, account, issuer }) {
  return 'otpauth://totp/' + encodeURIComponent(issuer) + ':' + encodeURIComponent(account) +
    '?secret=' + secret + '&issuer=' + encodeURIComponent(issuer) + '&algorithm=SHA1&digits=6&period=30';
}

export const groupSecret = (s) => String(s).replace(/(.{4})/g, '$1 ').trim();
