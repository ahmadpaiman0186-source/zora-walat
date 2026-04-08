import { env } from '../config/env.js';
import { prisma } from '../db.js';
import { verifyAccessToken } from '../services/authTokenService.js';
import { loadUserForRequest } from '../services/authService.js';

async function requireAuthAsync(req, res, next) {
  try {
    /**
     * TEMP — non-production only. Env-gated dev header bypass for routes using `requireAuth`
     * (e.g. `/api/wallet/*`, `/auth/me`, checkout): same secret as Flutter `X-ZW-Dev-Checkout`.
     * See `docs/WALLET_TOPUP_LOCAL_VERIFY.md`.
     */
    if (
      env.nodeEnv !== 'production' &&
      env.devCheckoutAuthBypass &&
      env.devCheckoutBypassSecret.length >= 16 &&
      env.devCheckoutBypassUserId
    ) {
      const bypass = req.headers['x-zw-dev-checkout'];
      if (typeof bypass === 'string' && bypass === env.devCheckoutBypassSecret) {
        const user = await prisma.user.findUnique({
          where: { id: env.devCheckoutBypassUserId },
          select: { id: true, email: true, role: true },
        });
        if (user) {
          req.user = { id: user.id, email: user.email, role: user.role };
          req.log?.warn(
            {
              securityEvent: 'dev_checkout_auth_bypass_used',
              path: req.path,
              userIdSuffix: String(user.id).slice(-8),
            },
            'security',
          );
          return next();
        }
      }
    }

    const h = req.headers.authorization;
    if (!h || typeof h !== 'string' || !h.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const token = h.slice(7).trim();
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const payload = verifyAccessToken(token);
    const tv =
      typeof payload.tv === 'number'
        ? payload.tv
        : parseInt(String(payload.tv), 10);
    const user = await loadUserForRequest(payload.sub, tv);
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch {
    res.status(401).json({ error: 'Authentication required' });
  }
}

/** Express-compatible async middleware (works with Express 4/5). */
export function requireAuth(req, res, next) {
  Promise.resolve(requireAuthAsync(req, res, next)).catch(next);
}

/** Staff roles allowed to access web-top-up fulfillment *read* admin routes. */
const STAFF_ROLES = new Set(['admin', 'operator', 'viewer']);

/** Roles allowed to dispatch / retry fulfillment. */
const FULFILLMENT_MUTATION_ROLES = new Set(['admin', 'operator']);

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

/** Admin, operator, or viewer — for diagnostics / preflight / readiness. */
export function requireStaff(req, res, next) {
  if (!req.user || !STAFF_ROLES.has(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

/** Admin or operator — dispatch and retry. */
export function requireFulfillmentActor(req, res, next) {
  if (!req.user || !FULFILLMENT_MUTATION_ROLES.has(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
