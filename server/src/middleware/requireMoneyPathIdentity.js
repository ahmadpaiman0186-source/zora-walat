/**
 * Layer 2 guard: attaches `req.identityTrust` and enforces fail-closed policy per route mode.
 */

import {
  assertMoneyPathIdentityAllowed,
  buildIdentityTrustContext,
} from '../security/identityTrustContext.js';

/**
 * Anonymous pricing quote: public read-only surface; trust level is `anonymous_checkout_allowed`.
 * @type {import('express').RequestHandler}
 */
export function attachAnonymousPricingQuoteTrustContext(req, res, next) {
  req.anonymousMoneyPathSurface = true;
  req.identityTrust = buildIdentityTrustContext(req);
  next();
}

/**
 * @param {{
 *   mode?: 'strict_authenticated'|'embedded_pi'|'attach_only',
 * }} [options]
 * @returns {import('express').RequestHandler}
 */
export function requireMoneyPathIdentity(options = {}) {
  return (req, res, next) => {
    const context = buildIdentityTrustContext(req);
    req.identityTrust = context;
    const result = assertMoneyPathIdentityAllowed(context, options);
    if (result.ok) return next();

    req.log?.warn(
      {
        securityEvent: 'identity_trust_rejected',
        route: context.route,
        reason: result.reason,
        trustLevel: context.trustLevel,
        traceId: context.traceId,
      },
      'security',
    );
    const status = result.status ?? 403;
    return res.status(status).json({
      error: 'identity_not_trusted',
      code: 'IDENTITY_TRUST_REQUIRED',
    });
  };
}

