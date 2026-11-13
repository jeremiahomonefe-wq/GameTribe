/*
 * Ticket QR codes.
 * The QR holds  GTK1:<reference>.<signature>  . The signature is made with a
 * server-only secret, so only tickets this site issued can be scanned: a made-up
 * or edited code is refused. Set TICKET_SECRET in Vercel (any long random text)
 * and never change it, otherwise ticket QR codes already emailed stop verifying.
 */
import crypto from 'crypto';
import qrcode from './vendor/qrcode.js';
import { modulesToPng } from './png.js';

const REF = /^[\w.\-=]{3,100}$/;

function secret() {
  if (process.env.TICKET_SECRET) return String(process.env.TICKET_SECRET);
  return crypto
    .createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PAYSTACK_SECRET_KEY || 'game-tribe-local')
    .update('game-tribe-ticket-qr-v1')
    .digest();
}

const macFor = (reference) =>
  crypto.createHmac('sha256', secret()).update('gt-ticket|' + reference).digest('base64url').slice(0, 16);

export const ticketToken = (reference) => reference + '.' + macFor(reference);

/* token -> reference, or null if it is not a genuine token */
export function referenceFromToken(token) {
  const s = String(token || '').trim();
  const i = s.lastIndexOf('.');
  if (i < 3) return null;
  const reference = s.slice(0, i);
  const mac = s.slice(i + 1);
  if (!REF.test(reference) || mac.length !== 16) return null;
  const want = Buffer.from(macFor(reference));
  const got = Buffer.from(mac);
  return want.length === got.length && crypto.timingSafeEqual(want, got) ? reference : null;
}

export const qrPayload = (reference) => 'GTK1:' + ticketToken(reference);

export function referenceFromPayload(text) {
  const s = String(text || '').trim();
  return s.startsWith('GTK1:') ? referenceFromToken(s.slice(5)) : null;
}

export function qrPng(text, scale = 8) {
  const qr = qrcode(0, 'M');
  qr.addData(String(text));
  qr.make();
  return modulesToPng((r, c) => qr.isDark(r, c), qr.getModuleCount(), scale, 4);
}

export const ticketQrPng = (reference, scale) => qrPng(qrPayload(reference), scale);
