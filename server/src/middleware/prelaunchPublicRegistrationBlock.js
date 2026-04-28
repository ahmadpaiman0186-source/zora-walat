import { env } from '../config/env.js';
import { PRELAUNCH_MONEY_BODY } from './prelaunchMoneyBlock.js';
import {
  isOwnerOnlyEnforced,
  normalizeOwnerEmail,
  ownerEmailMatchesAllowed,
} from './ownerOnlyAccessGuard.js';

/**
 * Blocks `POST /api/auth/register` when pre-launch lockdown is on unless the operator
 * explicitly sets `PRELAUNCH_ALLOW_PUBLIC_REGISTRATION=true` (e.g. staging seed flows).
 *
 * When `OWNER_ALLOWED_EMAIL` is set, that single identity may still register so private
 * prelaunch can bootstrap without opening public registration.
 */
export function blockPublicRegistrationIfPrelaunch(req, res, next) {
  if (!env.prelaunchLockdown) return next();
  if (env.prelaunchAllowPublicRegistration) return next();
  if (isOwnerOnlyEnforced()) {
    const email = normalizeOwnerEmail(req.body?.email);
    if (email && ownerEmailMatchesAllowed(email)) {
      return next();
    }
  }
  req.log?.info(
    { securityEvent: 'prelaunch_register_blocked', path: req.path },
    'security',
  );
  return res.status(503).json(PRELAUNCH_MONEY_BODY);
}
