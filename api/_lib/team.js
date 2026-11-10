/*
 * Team members: the main admin (ADMIN_PASSWORD) invites people with a
 * limited role. Passwords are hashed with scrypt (built into Node, no
 * packages). Invite links hold a random token; only its hash is stored.
 */
import crypto from 'crypto';
import { promisify } from 'util';
import { sb } from './supabase.js';
import { escapeHtml } from './tickets.js';

const scrypt = promisify(crypto.scrypt);
const enc = encodeURIComponent;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIST_FIELDS = 'id,email,name,role,status,invited_at,activated_at,last_login_at,invite_expires_at';

export const INVITE_HOURS = 72;

export const ROLES = {
  sales: {
    label: 'Sales',
    blurb: 'Can see everyone who bought tickets. Cannot change anything.'
  },
  tickets: {
    label: 'Ticket in charge',
    blurb: 'Can see everyone who bought tickets and check people in at the gate. Cannot edit tickets, prices or the website.'
  }
};

export const normEmail = (e) => String(e || '').trim().toLowerCase();
export const validEmail = (e) => e.length <= 254 && /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(e);
export const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(String(password), salt, 32, { N: 16384, r: 8, p: 1 });
  return 's1$' + salt.toString('base64url') + '$' + key.toString('base64url');
}

/* Always does one scrypt, even for a missing member, so timing does not reveal who exists. */
export async function checkPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 3 || parts[0] !== 's1') {
    await scrypt(String(password || ''), Buffer.alloc(16), 32, { N: 16384, r: 8, p: 1 });
    return false;
  }
  const salt = Buffer.from(parts[1], 'base64url');
  const expected = Buffer.from(parts[2], 'base64url');
  const actual = await scrypt(String(password || ''), salt, expected.length, { N: 16384, r: 8, p: 1 });
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function newInvite() {
  const token = crypto.randomBytes(32).toString('base64url');
  return {
    token,
    hash: hashToken(token),
    expires: new Date(Date.now() + INVITE_HOURS * 3600 * 1000).toISOString()
  };
}

export async function listMembers() {
  return (await sb('/rest/v1/team_members?select=' + LIST_FIELDS + '&order=created_at.asc')) || [];
}

export async function findByEmail(email) {
  const rows = await sb('/rest/v1/team_members?select=*&email=eq.' + enc(email) + '&limit=1');
  return (rows && rows[0]) || null;
}

export async function getById(id) {
  if (!UUID.test(String(id || ''))) return null;
  const rows = await sb('/rest/v1/team_members?select=*&id=eq.' + id + '&limit=1');
  return (rows && rows[0]) || null;
}

/* A member whose invite token matches and has not expired. */
export async function findByInvite(token) {
  token = String(token || '');
  if (token.length < 20 || token.length > 200) return null;
  const rows = await sb('/rest/v1/team_members?select=*&invite_token_hash=eq.' + hashToken(token) + '&limit=1');
  const m = rows && rows[0];
  if (!m || !m.invite_expires_at || new Date(m.invite_expires_at).getTime() < Date.now()) return null;
  return m;
}

export async function createMember({ email, name, role, invite }) {
  const rows = await sb('/rest/v1/team_members', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: { email, name, role, status: 'invited', invite_token_hash: invite.hash, invite_expires_at: invite.expires }
  });
  return rows && rows[0];
}

async function patch(id, body) {
  const rows = await sb('/rest/v1/team_members?id=eq.' + id, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body
  });
  return rows && rows[0];
}

export const setInvite = (id, invite, extra = {}) =>
  patch(id, { ...extra, invite_token_hash: invite.hash, invite_expires_at: invite.expires, invited_at: new Date().toISOString() });

export const activate = (id, passwordHash) =>
  patch(id, {
    password_hash: passwordHash,
    status: 'active',
    invite_token_hash: null,
    invite_expires_at: null,
    activated_at: new Date().toISOString(),
    last_login_at: new Date().toISOString()
  });

export const setRole = (id, role) => patch(id, { role });
export const touchLogin = (id) => patch(id, { last_login_at: new Date().toISOString() });

export async function removeMember(id) {
  await sb('/rest/v1/team_members?id=eq.' + id, { method: 'DELETE' });
}

export const isMemberId = (id) => UUID.test(String(id || ''));

export async function sendInviteEmail({ to, name, role, link, reset }) {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured.');
  if (!process.env.RESEND_FROM_EMAIL) throw new Error('RESEND_FROM_EMAIL is not configured.');
  const label = (ROLES[role] && ROLES[role].label) || role;
  const blurb = (ROLES[role] && ROLES[role].blurb) || '';
  const who = name || 'there';
  const lead = reset
    ? 'You asked for a new password for the Game Tribe admin.'
    : 'You have been invited to help run Game Tribe Fest as: <b>' + escapeHtml(label) + '</b>.';
  const leadText = reset
    ? 'You asked for a new password for the Game Tribe admin.'
    : 'You have been invited to help run Game Tribe Fest as: ' + label + '.';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [to],
      subject: reset ? 'Reset your Game Tribe admin password' : 'You are invited to the Game Tribe admin',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1C1410">
          <div style="background:#E8342A;color:#FFF6E5;padding:24px;border-radius:16px 16px 0 0;">
            <h1 style="margin:0">GAME TRIBE</h1>
            <p style="margin:8px 0 0">Admin access</p>
          </div>
          <div style="border:2px solid #1C1410;border-top:0;padding:24px;border-radius:0 0 16px 16px;">
            <p>Hi ${escapeHtml(who)},</p>
            <p>${lead}</p>
            ${reset ? '' : '<p>' + escapeHtml(blurb) + '</p>'}
            <p><a href="${escapeHtml(link)}" style="display:inline-block;background:#E8342A;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px;">Set your password</a></p>
            <p style="font-size:13px">Or paste this link into your browser:<br>${escapeHtml(link)}</p>
            <p style="font-size:13px">This link works once and expires in ${INVITE_HOURS} hours. If you were not expecting it, ignore this email.</p>
          </div>
        </div>`,
      text: `Hi ${who},\n\n${leadText}\n${reset ? '' : blurb + '\n'}\nSet your password: ${link}\n\nThis link works once and expires in ${INVITE_HOURS} hours. If you were not expecting it, ignore this email.`
    })
  });
  const text = await response.text();
  if (!response.ok) throw new Error('Resend failed: ' + response.status + ' ' + text);
}
