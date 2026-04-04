/**
 * Rate limits use the default in-memory store (per process). For horizontal scale,
 * replace `store` with a Redis-backed implementation from `rate-limit-redis` (or similar)
 * on each exported limiter — insertion point is the `rateLimit({ ... })` options object.
 */
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

import { env } from '../config/env.js';

const prod = env.nodeEnv === 'production';

/**
 * Stable client IP for rate-limit keys. express-rate-limit v7 throws if `req.ip` is
 * undefined (ERR_ERL_UNDEFINED_IP_ADDRESS); Express may omit `req.ip` when trust proxy
 * is off in some edge cases — fall back to the socket (local dev / Flutter web).
 */
function clientIpKey(req) {
  /** Use `||` so empty-string `req.ip` (Express edge cases) falls back like `undefined`. */
  const raw = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  const s = typeof raw === 'string' ? raw.replace(/^::ffff:/, '') : String(raw);
  return ipKeyGenerator(s);
}

function rateLimitHandler(req, res, _next, options) {
  req.log?.warn(
    {
      securityEvent: 'rate_limit_exceeded',
      path: req.path,
      limit: options.limit ?? options.max,
      clientIp: req.ip,
    },
    'security',
  );
  res.status(options.statusCode).json(options.message);
}

/**
 * Stripe checkout — after `requireAuth`; key = IP + user id (abuse resistance).
 */
export const checkoutAuthenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: prod ? 20 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = clientIpKey(req);
    const uid = req.user?.id;
    return uid ? `${ip}:${uid}` : ip;
  },
  message: { error: 'Too many checkout attempts; try again later.' },
  handler: rateLimitHandler,
});

/** Authenticated order reads — list / get by id / Stripe session lookup. */
export const ordersReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: prod ? 60 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = clientIpKey(req);
    const uid = req.user?.id;
    return uid ? `${ip}:${uid}` : ip;
  },
  message: { error: 'Too many order requests; try again later.' },
  handler: rateLimitHandler,
});

/** Wallet + recharge — after `requireAuth`; key = IP + user id. */
export const authenticatedApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: prod ? 200 : 400,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = clientIpKey(req);
    const uid = req.user?.id;
    return uid ? `${ip}:${uid}` : ip;
  },
  message: { error: 'Too many requests; try again later.' },
  handler: rateLimitHandler,
});

/** Public catalog reads — own limiter instance so buckets are not shared with `/api/*`. */
export const catalogLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: prod ? 200 : 400,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => clientIpKey(req),
  message: { error: 'Too many requests; try again later.' },
  handler: rateLimitHandler,
});

/** First-line IP bucket for `/api/wallet` and `/api/recharge` (before JWT). */
export const apiIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: prod ? 200 : 400,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => clientIpKey(req),
  message: { error: 'Too many requests; try again later.' },
  handler: rateLimitHandler,
});

/** Auth endpoints (login/register/refresh) — stricter abuse control. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: prod ? 20 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => clientIpKey(req),
  message: { error: 'Too many authentication attempts; try again later.' },
  handler: rateLimitHandler,
});
