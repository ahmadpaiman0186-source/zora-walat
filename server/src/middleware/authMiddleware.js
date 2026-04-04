import { env } from '../config/env.js';
import { prisma } from '../db.js';
import { verifyAccessToken } from '../services/authTokenService.js';
import { loadUserForRequest } from '../services/authService.js';

async function requireAuthAsync(req, res, next) {
  try {
    // TEMP TEST MODE - remove before production (non-production only; see env.js)
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

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
