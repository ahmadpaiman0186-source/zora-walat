import { env } from '../config/env.js';
import { AUTH_ERROR_CODE } from '../constants/authErrors.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';
import { refreshTokenStorageHash } from '../lib/authCrypto.js';
import { prisma } from '../db.js';

/** Public for tests — same string as JSON `code` for denials. */
export const OWNER_ONLY_DENY_CODE = AUTH_ERROR_CODE.OWNER_ONLY_ACCESS_DENIED;

export function normalizeOwnerEmail(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase();
}

export function isOwnerOnlyEnforced() {
  return Boolean(env.ownerAllowedEmail && env.ownerAllowedEmail.length > 0);
}

export function ownerEmailMatchesAllowed(email) {
  if (!isOwnerOnlyEnforced()) return true;
  return normalizeOwnerEmail(email) === env.ownerAllowedEmail;
}

export function ownerOnlyDeniedBody() {
  return clientErrorBody(
    'Access denied (owner-only mode)',
    OWNER_ONLY_DENY_CODE,
  );
}

/**
 * After `req.user` is set (JWT or dev bypass). Sends 403 if owner-only is on and email mismatches.
 * @returns {boolean} true if the caller must abort (response already sent)
 */
export function denyIfOwnerOnlyMismatchAuthenticated(req, res) {
  if (!isOwnerOnlyEnforced()) return false;
  const email = normalizeOwnerEmail(req.user?.email);
  if (!email || !ownerEmailMatchesAllowed(email)) {
    req.log?.warn(
      {
        securityEvent: 'owner_only_denied_authenticated',
        path: req.path,
        emailSuffix: email ? email.slice(-12) : null,
      },
      'security',
    );
    res.status(403).json(ownerOnlyDeniedBody());
    return true;
  }
  return false;
}

/**
 * Routes with `email` in JSON body: register, login, request-otp, resend-otp, verify-otp.
 */
export function ownerOnlyAuthEmailBodyMiddleware(req, res, next) {
  if (!isOwnerOnlyEnforced()) return next();
  const email = normalizeOwnerEmail(req.body?.email);
  if (!email) {
    res.status(403).json(ownerOnlyDeniedBody());
    return;
  }
  if (!ownerEmailMatchesAllowed(email)) {
    req.log?.info(
      { securityEvent: 'owner_only_denied_body_email', path: req.path },
      'security',
    );
    res.status(403).json(ownerOnlyDeniedBody());
    return;
  }
  next();
}

async function ownerOnlyRefreshOrLogoutAsync(req, res, next) {
  if (!isOwnerOnlyEnforced()) return next();
  const raw = String(req.body?.refreshToken ?? '').trim();
  if (!raw) {
    res.status(403).json(ownerOnlyDeniedBody());
    return;
  }
  const tokenHash = refreshTokenStorageHash(raw);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { email: true, isActive: true } } },
  });
  if (!existing?.user) {
    return next();
  }
  if (!ownerEmailMatchesAllowed(existing.user.email)) {
    req.log?.info(
      { securityEvent: 'owner_only_denied_refresh_token', path: req.path },
      'security',
    );
    res.status(403).json(ownerOnlyDeniedBody());
    return;
  }
  next();
}

/** `POST /api/auth/refresh` and `POST /api/auth/logout` — block before session rotation or revoke. */
export function ownerOnlyRefreshOrLogoutBodyMiddleware(req, res, next) {
  Promise.resolve(ownerOnlyRefreshOrLogoutAsync(req, res, next)).catch(next);
}
