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

/** Stripe webhook ingress — high ceiling; still bounded for abuse. */
export const stripeWebhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: prod ? 2000 : 8000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => clientIpKey(req),
  message: { error: 'Too many webhook requests' },
  handler: rateLimitHandler,
});

/** Public marketing top-up: create order. */
export const topupOrderCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: prod ? 40 : 150,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => clientIpKey(req),
  message: { error: 'Too many order requests; try again later.' },
  handler: rateLimitHandler,
});

export const topupOrderReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: prod ? 120 : 400,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => clientIpKey(req),
  message: { error: 'Too many requests; try again later.' },
  handler: rateLimitHandler,
});

/** Mark-paid + similar sensitive transitions. */
export const topupOrderMarkPaidLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: prod ? 60 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => clientIpKey(req),
  message: { error: 'Too many payment updates; try again later.' },
  handler: rateLimitHandler,
});

/** Test PaymentIntent creation (Next.js checkout). */
export const topupPaymentIntentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: prod ? 60 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => clientIpKey(req),
  message: { error: 'Too many payment intents; try again later.' },
  handler: rateLimitHandler,
});

/**
 * Web top-up order create — second bucket on `sessionKey` + IP (after `topupOrderCreateLimiter`).
 * Requires `express.json` before route so `req.body.sessionKey` is available.
 */
export const topupOrderSessionBurstLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: prod ? 60 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = clientIpKey(req);
    const sk = String(req.body?.sessionKey ?? '_').trim().slice(0, 128);
    return `topup_sess:${ip}:${sk || '_'}`;
  },
  message: { error: 'Too many orders for this session; try again later.' },
  handler: rateLimitHandler,
});

/** Admin fulfillment mutations — IP + authenticated user (after requireAuth). */
export const fulfillmentAdminMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: prod ? 50 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = clientIpKey(req);
    const uid = req.user?.id ?? 'anon';
    return `adm_fulfill_mut:${ip}:${uid}`;
  },
  message: {
    error: 'Too many fulfillment actions from this client; slow down and retry.',
  },
  handler: rateLimitHandler,
});

/** Per orderId + user — reduces hammering on a single order. */
export const fulfillmentPerOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: prod ? 25 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const oid = String(req.params?.orderId ?? 'unknown').slice(0, 80);
    const uid = req.user?.id ?? 'anon';
    return `adm_fulfill_ord:${uid}:${oid}`;
  },
  message: {
    error: 'Too many attempts for this order; wait before retrying dispatch.',
  },
  handler: rateLimitHandler,
});
