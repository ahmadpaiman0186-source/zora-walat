import { AUTH_ERROR_CODE } from '../constants/authErrors.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';

/**
 * After `requireAuth`. Blocks money-adjacent routes until `User.emailVerifiedAt` is set.
 */
export function requireEmailVerified(req, res, next) {
  if (!req.user?.emailVerified) {
    return res.status(403).json(
      clientErrorBody(
        'Email verification is required for this action.',
        AUTH_ERROR_CODE.AUTH_VERIFICATION_REQUIRED,
      ),
    );
  }
  next();
}
