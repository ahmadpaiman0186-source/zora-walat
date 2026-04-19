import { verifyAccessToken } from '../services/authTokenService.js';
import { loadUserForRequest } from '../services/authService.js';
import {
  isOwnerOnlyEnforced,
  ownerEmailMatchesAllowed,
} from './ownerOnlyAccessGuard.js';

/**
 * If `Authorization: Bearer` is present and valid, sets `req.webtopupAuthUser`.
 * Invalid or missing tokens are ignored (anonymous request continues).
 */
export async function optionalAuth(req, res, next) {
  req.webtopupAuthUser = null;
  const h = req.headers.authorization;
  if (!h || typeof h !== 'string' || !h.startsWith('Bearer ')) {
    return next();
  }
  const token = h.slice(7).trim();
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    const tv =
      typeof payload.tv === 'number'
        ? payload.tv
        : parseInt(String(payload.tv), 10);
    const user = await loadUserForRequest(payload.sub, tv);
    if (user) {
      if (isOwnerOnlyEnforced() && !ownerEmailMatchesAllowed(user.email)) {
        req.webtopupAuthUser = null;
      } else {
        req.webtopupAuthUser = {
          id: user.id,
          emailVerified: Boolean(user.emailVerifiedAt),
        };
      }
    }
  } catch {
    /* optional — ignore bad/expired JWT */
  }
  next();
}
