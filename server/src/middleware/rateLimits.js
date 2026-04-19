/**
 * Rate limits default to an in-memory store (per process).
 *
 * **Multi-instance:** set `RATE_LIMIT_USE_REDIS=true` and `REDIS_URL` so money-adjacent
 * and auth/webhook limiters use Redis (`rate-limit-redis`). See `docs/RATE_LIMITING.md`.
 * Initialization runs from `server/bootstrap.js` before `app.js` loads.
 */
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

import { env } from '../config/env.js';
import { API_CONTRACT_CODE } from '../constants/apiContractCodes.js';
import { webTopupLog } from '../lib/webTopupObservability.js';
import { AUTH_ERROR_CODE } from '../constants/authErrors.js';
import { RISK_REASON_CODE } from '../constants/riskErrors.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';
import { rateLimitRedisStore } from '../lib/rateLimitRedisInit.js';
import {
  getWebtopupAdminMutationMaxPerWindow,
  getWebtopupAdminReadMaxPerWindow,
  WEBTOPUP_ADMIN_RATE_WINDOW_MS,
} from '../lib/adminSecuritySnapshot.js';

/**
 * @param {string} prefix
 * @param {import('express-rate-limit').Options} options
 */
function rateLimitWithOptionalRedis(prefix, options) {
  const store = rateLimitRedisStore(prefix);
  return rateLimit(store ? { ...options, store } : options);
}

const prod = env.nodeEnv === 'production';

/**
 * Stable client IP for rate-limit keys. express-rate-limit v7 throws if `req.ip` is
 * undefined (ERR_ERL_UNDEFINED_IP_ADDRESS); Express may omit `req.ip` when trust proxy
 * is off in some edge cases — fall back to the socket (local dev / Flutter web).
 */
export function clientIpKey(req) {
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
      contractCode: API_CONTRACT_CODE.RATE_LIMITED,
    },
    'security',
  );
  const raw = options.message;
  const msg =
    typeof raw === 'object' && raw && 'error' in raw
      ? String(/** @type {{ error?: string }} */ (raw).error)
      : typeof raw === 'string'
        ? raw
        : 'Too many requests; try again later.';
  res
    .status(options.statusCode)
    .json(clientErrorBody(msg, API_CONTRACT_CODE.RATE_LIMITED));
}

function authRateLimitHandler(req, res, _next, options) {
  req.log?.warn(
    {
      securityEvent: 'rate_limit_exceeded',
      path: req.path,
      limit: options.limit ?? options.max,
      clientIp: req.ip,
      code: AUTH_ERROR_CODE.AUTH_RATE_LIMITED,
    },
    'security',
  );
  res.status(options.statusCode).json(
    clientErrorBody(
      'Too many authentication attempts; try again later.',
      AUTH_ERROR_CODE.AUTH_RATE_LIMITED,
    ),
  );
}

function authOtpRateLimitHandler(req, res, _next, options) {
  req.log?.warn(
    {
      securityEvent: 'rate_limit_exceeded',
      path: req.path,
      limit: options.limit ?? options.max,
      clientIp: req.ip,
    },
    'security',
  );
  const msg =
    typeof options.message === 'object' && options.message?.error
      ? String(options.message.error)
      : 'Too many requests; try again later.';
  res
    .status(options.statusCode)
    .json(clientErrorBody(msg, RISK_REASON_CODE.RATE_LIMITED));
}

function stripeWebhookRateLimitHandler(req, res, next, options) {
  console.error(
    `[stripe-webhook] rate_limited path=${req.originalUrl} limit=${options.limit ?? options.max}`,
  );
  rateLimitHandler(req, res, next, options);
}

/**
 * Stripe checkout — after `requireAuth`; key = IP + user id (abuse resistance).
 */
export const checkoutAuthenticatedLimiter = rateLimitWithOptionalRedis(
  'checkout_auth_15m',
  {
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
  },
);

/** Authenticated order reads — list / get by id / Stripe session lookup. */
export const ordersReadLimiter = rateLimitWithOptionalRedis('orders_read_15m', {
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
export const authenticatedApiLimiter = rateLimitWithOptionalRedis(
  'authed_api_15m',
  {
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
  },
);

/**
 * POST /api/wallet/topup — **order in `wallet.routes.js`**:
 * 1) {@link walletTopupPerMinuteLimiter} (1m velocity)
 * 2) {@link walletTopupLimiter} (15m cap)
 * 3) `authenticatedApiLimiter` applies to all `/api/wallet/*` earlier on the router.
 *
 * Replies include `code: wallet_topup_rate_limited` for typed client handling.
 */
function walletTopupRateLimitHandler(req, res, _next, options) {
  req.log?.warn(
    {
      securityEvent: 'wallet_topup_rate_limited',
      path: req.path,
      limit: options.limit ?? options.max,
      clientIp: req.ip,
      userIdSuffix: req.user?.id?.slice(-8),
      traceId: req.traceId,
    },
    'security',
  );
  const msg =
    typeof options.message === 'object' && options.message?.error
      ? String(options.message.error)
      : 'Too many wallet top-up requests; try again later.';
  res
    .status(options.statusCode)
    .json(clientErrorBody(msg, 'wallet_topup_rate_limited'));
}

export const walletTopupLimiter = rateLimitWithOptionalRedis('wallet_topup_15m', {
  windowMs: 15 * 60 * 1000,
  max: prod ? 40 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = clientIpKey(req);
    const uid = req.user?.id;
    return uid ? `wallet_topup:${ip}:${uid}` : `wallet_topup:${ip}`;
  },
  message: { error: 'Too many wallet top-up requests; try again later.' },
  handler: walletTopupRateLimitHandler,
});

function walletTopupPerMinuteHandler(req, res, _next, options) {
  req.log?.warn(
    {
      securityEvent: 'wallet_topup_per_minute_limited',
      path: req.path,
      limit: options.limit ?? options.max,
      clientIp: req.ip,
      userIdSuffix: req.user?.id?.slice(-8),
      traceId: req.traceId,
    },
    'security',
  );
  const msg =
    typeof options.message === 'object' && options.message?.error
      ? String(options.message.error)
      : 'Too many wallet top-ups per minute; try again shortly.';
  res
    .status(options.statusCode)
    .json(clientErrorBody(msg, 'wallet_topup_per_minute_limited'));
}

/**
 * Rolling 1-minute cap per user+IP on POST /api/wallet/topup (fraud/velocity).
 * `WALLET_TOPUP_PER_MINUTE_MAX` overrides (see env.walletTopupPerMinuteMax).
 */
export const walletTopupPerMinuteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: () => env.walletTopupPerMinuteMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = clientIpKey(req);
    const uid = req.user?.id;
    return uid ? `wallet_topup_1m:${ip}:${uid}` : `wallet_topup_1m:${ip}`;
  },
  message: {
    code: 'wallet_topup_per_minute_limited',
    error: 'Too many wallet top-ups per minute; try again shortly.',
  },
  handler: walletTopupPerMinuteHandler,
});

/**
 * Post-payment fulfillment kick (`POST /api/recharge/execute`) — tighter than generic wallet/recharge.
 * Prevents aggressive client polling from hammering DB + worker scheduling.
 */
/**
 * Staff-only privileged APIs (`/api/admin/ops/*`, support full-trace) — per staff user + IP.
 */
export const staffPrivilegedLimiter = rateLimitWithOptionalRedis(
  'staff_priv_15m',
  {
    windowMs: 15 * 60 * 1000,
    max: prod ? 90 : 400,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ip = clientIpKey(req);
      const uid = req.user?.id;
      return uid ? `staff_priv:${uid}:${ip}` : `staff_priv:${ip}`;
    },
    message: { error: 'Too many staff requests; slow down.' },
    handler: rateLimitHandler,
  },
);

/**
 * Canonical Phase 1 truth reads — stricter than general order list.
 */
export const phase1TruthReadLimiter = rateLimitWithOptionalRedis(
  'phase1_truth_15m',
  {
    windowMs: 15 * 60 * 1000,
    max: prod ? 36 : 160,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ip = clientIpKey(req);
      const uid = req.user?.id;
      return uid ? `${ip}:phase1:${uid}` : ip;
    },
    message: { error: 'Too many order truth requests; try again later.' },
    handler: rateLimitHandler,
  },
);

export const rechargeExecuteLimiter = rateLimitWithOptionalRedis(
  'recharge_execute_15m',
  {
    windowMs: 15 * 60 * 1000,
    max: prod ? 45 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ip = clientIpKey(req);
      const uid = req.user?.id;
      return uid ? `${ip}:${uid}` : ip;
    },
    message: { error: 'Too many fulfillment refresh attempts; try again shortly.' },
    handler: rateLimitHandler,
  },
);

/** Public catalog reads — own limiter instance so buckets are not shared with `/api/*`. */
export const catalogLimiter = rateLimitWithOptionalRedis('catalog_15m_ip', {
  windowMs: 15 * 60 * 1000,
  max: prod ? 200 : 400,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => clientIpKey(req),
  message: { error: 'Too many requests; try again later.' },
  handler: rateLimitHandler,
});

/** First-line IP bucket for `/api/wallet` and `/api/recharge` (before JWT). */
export const apiIpLimiter = rateLimitWithOptionalRedis('api_ip_15m', {
  windowMs: 15 * 60 * 1000,
  max: prod ? 200 : 400,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => clientIpKey(req),
  message: { error: 'Too many requests; try again later.' },
  handler: rateLimitHandler,
});

/** Auth endpoints (login/register/refresh) — stricter abuse control. */
export const authLimiter = rateLimitWithOptionalRedis('auth_15m', {
  windowMs: 15 * 60 * 1000,
  max: prod ? 20 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => clientIpKey(req),
  message: { error: 'Too many authentication attempts; try again later.' },
  handler: authRateLimitHandler,
});

function riskPaymentIntentRateLimitHandler(req, res, _next, options) {
  req.log?.warn(
    {
      securityEvent: 'risk_rate_limit_exceeded',
      route: 'create_payment_intent',
      limit: options.limit ?? options.max,
      clientIp: req.ip,
    },
    'security',
  );
  const msg = 'Too many payment intents; try again later.';
  res
    .status(options.statusCode)
    .json(clientErrorBody(msg, RISK_REASON_CODE.RATE_LIMITED));
}

function riskRechargeOrderCreateHandler(req, res, _next, options) {
  req.log?.warn(
    {
      securityEvent: 'risk_rate_limit_exceeded',
      route: 'recharge_order_create',
      limit: options.limit ?? options.max,
      clientIp: req.ip,
      userIdSuffix: req.user?.id?.slice(-8),
    },
    'security',
  );
  const msg = 'Too many recharge checkout attempts; try again later.';
  res
    .status(options.statusCode)
    .json(clientErrorBody(msg, RISK_REASON_CODE.RATE_LIMITED));
}

/** OTP request — dedicated bucket; {@link RISK_REASON_CODE.RATE_LIMITED} on exceed. */
export const otpRequestEndpointLimiter = rateLimitWithOptionalRedis(
  'auth_otp_req_endpoint_10m',
  {
    windowMs: 10 * 60 * 1000,
    max: prod ? 10 : 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => clientIpKey(req),
    message: { error: 'Too many OTP requests; try again later.' },
    handler: authOtpRateLimitHandler,
  },
);

/** OTP verify — dedicated bucket. */
export const otpVerifyEndpointLimiter = rateLimitWithOptionalRedis(
  'auth_otp_verify_endpoint_10m',
  {
    windowMs: 10 * 60 * 1000,
    max: prod ? 30 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => clientIpKey(req),
    message: { error: 'Too many OTP verification attempts; try again later.' },
    handler: authOtpRateLimitHandler,
  },
);

/** @deprecated Use {@link otpRequestEndpointLimiter} */
export const emailOtpRequestLimiter = otpRequestEndpointLimiter;

/** @deprecated Use {@link otpVerifyEndpointLimiter} */
export const emailOtpVerifyLimiter = otpVerifyEndpointLimiter;

/**
 * Embedded PaymentIntent — dedicated Redis prefix; {@link RISK_REASON_CODE.RATE_LIMITED} on exceed.
 */
export const paymentIntentEndpointLimiter = rateLimitWithOptionalRedis(
  'risk_topup_pi_15m',
  {
    windowMs: 15 * 60 * 1000,
    max: prod ? 60 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => clientIpKey(req),
    message: { error: 'Too many payment intents; try again later.' },
    handler: riskPaymentIntentRateLimitHandler,
  },
);

/** @deprecated Use {@link paymentIntentEndpointLimiter} */
export const topupPaymentIntentLimiter = paymentIntentEndpointLimiter;

/**
 * Authenticated recharge checkout creation — per user + IP (after requireAuth).
 */
export const rechargeOrderCreateLimiter = rateLimitWithOptionalRedis(
  'recharge_order_create_15m',
  {
    windowMs: 15 * 60 * 1000,
    max: prod ? 25 : 80,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ip = clientIpKey(req);
      const uid = req.user?.id;
      return uid ? `recharge_ord_create:${ip}:${uid}` : `recharge_ord_create:${ip}`;
    },
    message: { error: 'Too many recharge checkout attempts; try again later.' },
    handler: riskRechargeOrderCreateHandler,
  },
);

/** Stripe webhook ingress — high ceiling; still bounded for abuse. */
export const stripeWebhookLimiter = rateLimitWithOptionalRedis('stripe_webhook_15m', {
  windowMs: 15 * 60 * 1000,
  max: prod ? 2000 : 8000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => clientIpKey(req),
  message: { error: 'Too many webhook requests' },
  handler: stripeWebhookRateLimitHandler,
});

/** Public marketing top-up: create order. */
export const topupOrderCreateLimiter = rateLimitWithOptionalRedis(
  'topup_order_create_15m',
  {
    windowMs: 15 * 60 * 1000,
    max: prod ? 40 : 150,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => clientIpKey(req),
    message: { error: 'Too many order requests; try again later.' },
    handler: rateLimitHandler,
  },
);

export const topupOrderReadLimiter = rateLimitWithOptionalRedis(
  'topup_order_read_15m',
  {
    windowMs: 15 * 60 * 1000,
    max: prod ? 120 : 400,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => clientIpKey(req),
    message: { error: 'Too many requests; try again later.' },
    handler: rateLimitHandler,
  },
);

/** Mark-paid + similar sensitive transitions. */
export const topupOrderMarkPaidLimiter = rateLimitWithOptionalRedis(
  'topup_mark_paid_15m',
  {
    windowMs: 15 * 60 * 1000,
    max: prod ? 60 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => clientIpKey(req),
    message: { error: 'Too many payment updates; try again later.' },
    handler: rateLimitHandler,
  },
);

/**
 * Web top-up order create — second bucket on `sessionKey` + IP (after `topupOrderCreateLimiter`).
 * Requires `express.json` before route so `req.body.sessionKey` is available.
 */
export const topupOrderSessionBurstLimiter = rateLimitWithOptionalRedis(
  'topup_sess_burst_15m',
  {
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
  },
);

/**
 * Web top-up money flow — max **5** create-order + PaymentIntent requests per **client IP per minute**
 * (shared bucket with {@link webtopTopupsPerMinuteLimiter} on `POST /create-payment-intent`).
 * Logs `securityEvent: 'rate_limit_exceeded'` and structured `webTopupLog` `rate_limit_exceeded`.
 */
function webtopTopupPerMinuteHandler(req, res, _next, options) {
  const limit = options.limit ?? options.max;
  req.log?.warn(
    {
      securityEvent: 'rate_limit_exceeded',
      reason: 'webtop_topup_per_minute',
      path: req.path,
      limit,
      clientIp: req.ip,
      contractCode: API_CONTRACT_CODE.RATE_LIMITED,
    },
    'security',
  );
  webTopupLog(req.log, 'warn', 'rate_limit_exceeded', {
    reason: 'topup_per_minute',
    limit,
    path: req.path,
  });
  res.status(429).json(
    clientErrorBody(
      'Too many top-up requests; try again shortly.',
      API_CONTRACT_CODE.RATE_LIMITED,
    ),
  );
}

export const webtopTopupsPerMinuteLimiter = rateLimitWithOptionalRedis(
  'webtop_flow_1m',
  {
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => clientIpKey(req),
    message: { error: 'Too many top-up requests; try again shortly.' },
    handler: webtopTopupPerMinuteHandler,
  },
);

/** Admin fulfillment mutations — IP + authenticated user (after requireAuth). */
export const fulfillmentAdminMutationLimiter = rateLimitWithOptionalRedis(
  'admin_fulfill_mut_15m',
  {
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
  },
);

/** Per orderId + user — reduces hammering on a single order. */
export const fulfillmentPerOrderLimiter = rateLimitWithOptionalRedis(
  'admin_fulfill_ord_15m',
  {
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
  },
);

function webtopAdminMutationRateLimitHandler(req, res, _next, options) {
  const limit = options.limit ?? options.max;
  req.log?.warn(
    {
      webtopAdminRateLimited: true,
      kind: 'mutation',
      path: req.path,
      limit,
      clientIp: req.ip,
      traceId: req.traceId,
    },
    'security',
  );
  webTopupLog(req.log, 'warn', 'webtop_admin_rate_limited', {
    kind: 'mutation',
    path: req.path,
    limit,
    windowMs: options.windowMs,
    traceId: req.traceId ?? undefined,
  });
  res
    .status(429)
    .json(
      clientErrorBody(
        'Too many WebTopup admin actions; try again later.',
        API_CONTRACT_CODE.RATE_LIMITED,
      ),
    );
}

function webtopAdminReadRateLimitHandler(req, res, _next, options) {
  const limit = options.limit ?? options.max;
  req.log?.warn(
    {
      webtopAdminRateLimited: true,
      kind: 'read',
      path: req.path,
      limit,
      clientIp: req.ip,
      traceId: req.traceId,
    },
    'security',
  );
  webTopupLog(req.log, 'warn', 'webtop_admin_rate_limited', {
    kind: 'read',
    path: req.path,
    limit,
    windowMs: options.windowMs,
    traceId: req.traceId ?? undefined,
  });
  res
    .status(429)
    .json(
      clientErrorBody(
        'Too many WebTopup admin reads; try again later.',
        API_CONTRACT_CODE.RATE_LIMITED,
      ),
    );
}

/**
 * WebTopup admin POST mutations (`/api/admin/webtopup/retry`, `force-deliver`) — per client IP, stricter than {@link apiIpLimiter}.
 */
export const webtopAdminMutationLimiter = rateLimitWithOptionalRedis('webtop_admin_mut_15m', {
  windowMs: WEBTOPUP_ADMIN_RATE_WINDOW_MS,
  max: () => getWebtopupAdminMutationMaxPerWindow(),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `wt_admin_mut:${clientIpKey(req)}`,
  message: { error: 'Too many WebTopup admin actions; try again later.' },
  handler: webtopAdminMutationRateLimitHandler,
});

/**
 * WebTopup admin GET reads (status, monitoring, health, reconciliation) — per client IP.
 */
export const webtopAdminReadLimiter = rateLimitWithOptionalRedis('webtop_admin_read_15m', {
  windowMs: WEBTOPUP_ADMIN_RATE_WINDOW_MS,
  max: () => getWebtopupAdminReadMaxPerWindow(),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `wt_admin_read:${clientIpKey(req)}`,
  message: { error: 'Too many WebTopup admin reads; try again later.' },
  handler: webtopAdminReadRateLimitHandler,
});
