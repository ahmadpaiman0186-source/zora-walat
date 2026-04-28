/**
 * Admin secret auth for WebTopup control routes.
 * Reads env on each request so tests can set `ADMIN_SECRET` without reloading modules.
 *
 * Rotation: set `ADMIN_SECRET_CURRENT` (+ optional `ADMIN_SECRET_PREVIOUS`).
 * Legacy: `ADMIN_SECRET` alone (>= 16 chars) when `ADMIN_SECRET_CURRENT` is unset/short.
 */

import { timingSafeEqual } from 'node:crypto';

/**
 * @param {string} a
 * @param {string} b
 */
function timingSafeStringEqual(a, b) {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

const MIN_LEN = 16;

/**
 * @returns {{ value: string, slot: 'primary' | 'secondary' }[]}
 */
export function getAdminSecretCandidates() {
  const current = String(process.env.ADMIN_SECRET_CURRENT ?? '').trim();
  const previous = String(process.env.ADMIN_SECRET_PREVIOUS ?? '').trim();
  const legacy = String(process.env.ADMIN_SECRET ?? '').trim();

  if (current.length >= MIN_LEN) {
    const out = [{ value: current, slot: /** @type {const} */ ('primary') }];
    if (previous.length >= MIN_LEN) {
      out.push({ value: previous, slot: 'secondary' });
    }
    return out;
  }
  if (legacy.length >= MIN_LEN) {
    return [{ value: legacy, slot: 'primary' }];
  }
  return [];
}

/**
 * Safe metadata for monitoring (no secret values or lengths of secrets).
 */
export function getAdminAuthModeSummary() {
  const current = String(process.env.ADMIN_SECRET_CURRENT ?? '').trim();
  const previous = String(process.env.ADMIN_SECRET_PREVIOUS ?? '').trim();
  const legacy = String(process.env.ADMIN_SECRET ?? '').trim();
  const rotationActive = current.length >= MIN_LEN;
  return {
    mode: rotationActive ? 'rotation' : 'legacy',
    rotationEnabled: rotationActive,
    secondarySlotConfigured: rotationActive && previous.length >= MIN_LEN,
    legacyFallbackConfigured: !rotationActive && legacy.length >= MIN_LEN,
  };
}

/**
 * @returns {boolean} true if response was sent
 */
export function denyIfAdminSecretNotConfigured(res) {
  const cands = getAdminSecretCandidates();
  if (cands.length > 0) return false;
  res.setHeader('Cache-Control', 'no-store');
  res.status(503).json({
    ok: false,
    error: 'admin_unconfigured',
    hint:
      'Set ADMIN_SECRET (>=16 chars) or ADMIN_SECRET_CURRENT (>=16 chars), optionally ADMIN_SECRET_PREVIOUS for rotation',
  });
  return true;
}

/**
 * @param {import('express').Request} req
 * @returns {{ token: string, source: 'authorization_bearer' | 'x_admin_secret' } | null}
 */
function readProvidedAdminSecret(req) {
  const auth = req.headers.authorization;
  const x = req.headers['x-admin-secret'];
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim();
    if (token) return { token, source: 'authorization_bearer' };
  }
  if (typeof x === 'string' && x.trim()) {
    return { token: x.trim(), source: 'x_admin_secret' };
  }
  return null;
}

/**
 * @param {import('express').Request} req
 * @returns {boolean}
 */
export function adminSecretMatches(req) {
  const cands = getAdminSecretCandidates();
  if (cands.length === 0) return false;
  const prov = readProvidedAdminSecret(req);
  if (!prov) return false;
  for (const c of cands) {
    if (timingSafeStringEqual(prov.token, c.value)) {
      req.adminAuthSource = prov.source;
      req.adminSecretSlot = c.slot;
      return true;
    }
  }
  return false;
}

/**
 * Express middleware: 503 if secret unset; 401 if wrong secret.
 */
export function requireAdminSecret(req, res, next) {
  if (denyIfAdminSecretNotConfigured(res)) return;
  if (!adminSecretMatches(req)) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(401).json({
      ok: false,
      error: 'unauthorized',
      hint: 'Send Authorization: Bearer <secret> or X-Admin-Secret (ADMIN_SECRET or ADMIN_SECRET_CURRENT)',
    });
    return;
  }
  next();
}
