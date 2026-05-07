/**
 * Layer 2 — identity / session trust for money-adjacent routes.
 * Trusted identity never comes from req.body; only JWT, optional JWT decoration, or env-gated dev bypass.
 */

import { isOwnerOnlyEnforced } from '../middleware/ownerOnlyAccessGuard.js';

/** @typedef {'verified_user'|'anonymous_checkout_allowed'|'local_proof_user'|'admin_operator'|'untrusted'} IdentityTrustLevel */

const STAFF_ROLES = new Set(['admin', 'operator', 'viewer']);

/**
 * @param {{
 *   hasUser: boolean,
 *   hasOptionalJwt: boolean,
 *   isLocalProof: boolean,
 *   isAdminOperator: boolean,
 *   anonymousSurface: boolean,
 * }} s
 * @returns {IdentityTrustLevel}
 */
export function classifyIdentityTrustLevel(s) {
  if (s.isLocalProof) return 'local_proof_user';
  if (s.hasUser && s.isAdminOperator) return 'admin_operator';
  if (s.hasUser) return 'verified_user';
  if (s.hasOptionalJwt) return 'verified_user';
  if (s.anonymousSurface) return 'anonymous_checkout_allowed';
  return 'untrusted';
}

/**
 * @param {import('express').Request} req
 * @returns {{
 *   trustLevel: IdentityTrustLevel,
 *   userId: string | null,
 *   email: string | null,
 *   emailVerified: boolean,
 *   isAnonymousCheckout: boolean,
 *   isLocalProof: boolean,
 *   isAdminOperator: boolean,
 *   source: string,
 *   reason: string,
 *   traceId: string | null,
 *   route: string,
 * }}
 */
export function buildIdentityTrustContext(req) {
  const traceId =
    typeof req.traceId === 'string' && req.traceId.length > 0
      ? req.traceId
      : req.correlation?.traceId ?? null;
  const route = String(req.originalUrl ?? req.url ?? req.path ?? '').split('?')[0];

  let userId = null;
  let email = null;
  let emailVerified = false;
  let source = 'none';
  let reason = 'no_authenticated_identity';
  let isLocalProof = false;
  let isAdminOperator = false;

  if (req.user) {
    userId = req.user.id;
    email = req.user.email ?? null;
    emailVerified = Boolean(req.user.emailVerified);
    const role = req.user.role;
    isAdminOperator = STAFF_ROLES.has(role);
    if (req.identityAuthSource === 'dev_bypass') {
      source = 'dev_bypass';
      isLocalProof = true;
      reason = 'dev_checkout_header_bypass_env_gated';
    } else {
      source = 'jwt';
      reason = 'bearer_access_token_verified';
    }
  } else if (req.webtopupAuthUser) {
    userId = req.webtopupAuthUser.id;
    email = null;
    emailVerified = Boolean(req.webtopupAuthUser.emailVerified);
    source = 'jwt_optional';
    reason = 'optional_bearer_metadata_bound';
  }

  const hasUser = Boolean(req.user);
  const hasOptionalJwt = Boolean(req.webtopupAuthUser);
  const anonymousSurface = Boolean(req.anonymousMoneyPathSurface);

  const trustLevel = classifyIdentityTrustLevel({
    hasUser,
    hasOptionalJwt,
    isLocalProof,
    isAdminOperator,
    anonymousSurface,
  });

  const isAnonymousCheckout =
    trustLevel === 'anonymous_checkout_allowed' || trustLevel === 'untrusted';

  return {
    trustLevel,
    userId,
    email,
    emailVerified,
    isAnonymousCheckout,
    isLocalProof,
    isAdminOperator,
    source,
    reason,
    traceId,
    route,
  };
}

/**
 * @param {ReturnType<typeof buildIdentityTrustContext>} context
 * @param {{
 *   mode?: 'strict_authenticated'|'embedded_pi'|'attach_only',
 * }} [options]
 * @returns {{ ok: true } | { ok: false, status: number, reason: string }}
 */
export function assertMoneyPathIdentityAllowed(context, options = {}) {
  const mode = options.mode ?? 'strict_authenticated';
  const allowedStrict = new Set([
    'verified_user',
    'admin_operator',
    'local_proof_user',
  ]);

  if (mode === 'attach_only') {
    return { ok: true };
  }

  if (mode === 'strict_authenticated') {
    if (allowedStrict.has(context.trustLevel)) return { ok: true };
    return {
      ok: false,
      status: 401,
      reason: 'authenticated_identity_required',
    };
  }

  if (mode === 'embedded_pi') {
    if (isOwnerOnlyEnforced()) {
      if (allowedStrict.has(context.trustLevel)) return { ok: true };
      return {
        ok: false,
        status: 403,
        reason: 'owner_only_requires_verified_session',
      };
    }
    const okEmbedded = new Set([
      'verified_user',
      'admin_operator',
      'local_proof_user',
      'anonymous_checkout_allowed',
      'untrusted',
    ]);
    if (okEmbedded.has(context.trustLevel)) return { ok: true };
    return {
      ok: false,
      status: 403,
      reason: 'identity_trust_unknown_state',
    };
  }

  return {
    ok: false,
    status: 401,
    reason: 'unknown_identity_trust_mode',
  };
}
