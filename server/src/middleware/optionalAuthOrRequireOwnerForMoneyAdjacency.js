import { requireAuth } from './authMiddleware.js';
import { optionalAuth } from './optionalAuth.js';
import { isOwnerOnlyEnforced } from './ownerOnlyAccessGuard.js';

/**
 * Web top-up / marketing money-adjacent routes normally accept anonymous traffic and
 * optionally decorate Stripe metadata when `Authorization: Bearer` is present.
 *
 * When `OWNER_ALLOWED_EMAIL` is set, require a valid JWT for the allowed identity and
 * bind `req.webtopupAuthUser` so anonymous abuse of these surfaces is impossible while
 * owner-only pre-private mode is active.
 */
export function optionalAuthOrRequireOwnerForMoneyAdjacency(req, res, next) {
  if (!isOwnerOnlyEnforced()) {
    return optionalAuth(req, res, next);
  }
  return requireAuth(req, res, () => {
    req.webtopupAuthUser = {
      id: req.user.id,
      emailVerified: Boolean(req.user.emailVerified),
    };
    next();
  });
}
