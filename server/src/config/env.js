/**
 * Central env (bootstrap loads dotenv before any import of app code).
 * DATABASE_URL must point at PostgreSQL (see server/.env.example). No SQLite fallback.
 */

import {
  mergeReloadlyOperatorMaps,
  RELOADLY_OPERATOR_ID_DEFAULTS,
} from './reloadlyOperatorIdDefaults.js';

function parseList(raw, fallback) {
  const s = String(raw ?? '').trim();
  if (!s) return fallback;
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

const defaultCors = [
  'http://localhost:8787',
  'http://127.0.0.1:8787',
];

/** When `PRELAUNCH_LOCKDOWN=true`, default browser origins if `CORS_ORIGINS` unset (must match strict allowlist). */
const prelaunchDefaultCors = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const nodeEnv = process.env.NODE_ENV || 'development';

/**
 * Behind one reverse proxy (or CDN+LB), `1` is typical. Cap to reduce spoofing risk.
 * @returns {number | false} false in development (do not trust X-Forwarded-For locally).
 */
function parseTrustProxyHops() {
  if (nodeEnv !== 'production') {
    return false;
  }
  const raw = String(process.env.TRUST_PROXY_HOPS ?? '1').trim();
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 5);
}

function parsePositiveInt(raw, fallback) {
  const n = parseInt(String(raw ?? '').trim(), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return n;
}

function parseNonNegativeInt(raw, fallback) {
  const n = parseInt(String(raw ?? '').trim(), 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

/** Basis points (e.g. 290 = 2.9%). */
function parseBps(raw, fallback) {
  const n = parseInt(String(raw ?? '').trim(), 10);
  if (!Number.isFinite(n) || n < 0 || n > 10000) return fallback;
  return n;
}

/**
 * JSON object: internal operatorKey (any case) → Reloadly numeric operator id string.
 * Example: `{"roshan":"12345","mtn":"67890"}`
 */
function parseReloadlyOperatorMap(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return {};
  try {
    const obj = JSON.parse(s);
    if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) {
      console.warn('[env] RELOADLY_OPERATOR_MAP_JSON must be a JSON object');
      return {};
    }
    /** @type {Record<string, string>} */
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      const key = String(k).trim().toLowerCase();
      if (!key) continue;
      out[key] = String(v).trim();
    }
    return out;
  } catch {
    console.warn('[env] RELOADLY_OPERATOR_MAP_JSON is not valid JSON');
    return {};
  }
}

const prelaunchLockdownEnv = process.env.PRELAUNCH_LOCKDOWN === 'true';

function resolveCorsOrigins() {
  const raw = process.env.CORS_ORIGINS;
  if (prelaunchLockdownEnv) {
    const explicit = String(raw ?? '').trim();
    if (!explicit) return prelaunchDefaultCors;
    return parseList(raw, prelaunchDefaultCors);
  }
  return parseList(raw, nodeEnv === 'production' ? [] : defaultCors);
}

export const env = {
  port: Number(process.env.PORT || 8787),
  nodeEnv,
  /** Stripe webhook signing secret (whsec_…); required for verified payment events. */
  stripeWebhookSecret: String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim(),
  /**
   * Production only: base URL for Stripe success/cancel (no trailing slash).
   * Development: leave unset; redirects use `Origin` from the browser checkout POST.
   */
  clientUrl: String(process.env.CLIENT_URL ?? '').trim().replace(/\/$/, ''),
  databaseUrl: process.env.DATABASE_URL,
  /**
   * Production: no default — set `CORS_ORIGINS` explicitly (startup fails if empty).
   * Development: defaults to local Flutter web ports.
   */
  corsOrigins: resolveCorsOrigins(),
  logLevel: process.env.LOG_LEVEL || 'info',
  /**
   * Express `trust proxy` hop count in production only — required for correct `req.ip`
   * behind a load balancer (rate limits, logs).
   */
  trustProxyHops: parseTrustProxyHops(),

  jwtAccessSecret: String(process.env.JWT_ACCESS_SECRET ?? '').trim(),
  jwtRefreshSecret: String(process.env.JWT_REFRESH_SECRET ?? '').trim(),
  /** Access JWT TTL (seconds). */
  accessTokenTtlSec: parsePositiveInt(process.env.ACCESS_TOKEN_TTL, 900),
  /** Refresh token TTL (seconds). */
  refreshTokenTtlSec: parsePositiveInt(process.env.REFRESH_TOKEN_TTL, 604800),
  /**
   * When true: money routes return 503; strict CORS; minimal access logs; extra startup checks.
   */
  prelaunchLockdown: prelaunchLockdownEnv,

  /** Stripe fee: percent of charged amount + fixed cents (US cards; tune per account). */
  pricingStripeFeeBps: parseBps(process.env.PRICING_STRIPE_FEE_BPS, 290),
  pricingStripeFixedCents: parseNonNegativeInt(
    process.env.PRICING_STRIPE_FIXED_CENTS,
    30,
  ),
  /** FX / tax as basis points of provider cost until per-jurisdiction rules exist. */
  pricingFxBps: parseBps(process.env.PRICING_FX_BPS, 0),
  pricingTaxBps: parseBps(process.env.PRICING_TAX_BPS, 0),
  /**
   * Amount-only airtime: provider cost = round(faceCents * bps / 10000).
   * Default 9000 = 90% of face value treated as wholesale (configure from real quotes).
   */
  pricingAmountOnlyProviderBps: parseBps(
    process.env.PRICING_AMOUNT_ONLY_PROVIDER_BPS,
    9000,
  ),

  /** Reloadly API — server-only; never expose to clients. */
  reloadlyClientId: String(process.env.RELOADLY_CLIENT_ID ?? '').trim(),
  reloadlyClientSecret: String(process.env.RELOADLY_CLIENT_SECRET ?? '').trim(),
  /** Use Reloadly sandbox endpoints when true. */
  reloadlySandbox: process.env.RELOADLY_SANDBOX === 'true',
  /** HTTP timeout for future real provider calls (ms). */
  airtimeProviderTimeoutMs: parsePositiveInt(
    process.env.AIRTIME_PROVIDER_TIMEOUT_MS,
    30_000,
  ),
  /** Redis for production anti-abuse state (checkout/session). Optional; fail-safe fallback. */
  redisUrl: String(process.env.REDIS_URL ?? '').trim(),
  /** Redis connect timeout (ms). */
  redisConnectTimeoutMs: parsePositiveInt(
    process.env.REDIS_CONNECT_TIMEOUT_MS,
    2_000,
  ),
  /**
   * Internal operatorKey → Reloadly numeric operator id (server-only).
   * Defaults: `reloadlyOperatorIdDefaults.js`; overridden by `RELOADLY_OPERATOR_MAP_JSON` per key.
   * @type {Record<string, string>}
   */
  reloadlyOperatorMap: mergeReloadlyOperatorMaps(
    RELOADLY_OPERATOR_ID_DEFAULTS,
    parseReloadlyOperatorMap(process.env.RELOADLY_OPERATOR_MAP_JSON),
  ),

  /** Reconciliation scan thresholds (ms) — see `reconciliationService.js`. */
  reconcilePaidStuckAfterMs: parsePositiveInt(
    process.env.RECONCILE_PAID_STUCK_MS,
    900_000,
  ),
  reconcileProcessingStuckAfterMs: parsePositiveInt(
    process.env.RECONCILE_PROCESSING_STUCK_MS,
    1_800_000,
  ),
  reconcileFulfillmentQueuedStuckAfterMs: parsePositiveInt(
    process.env.RECONCILE_FULFILLMENT_QUEUED_STUCK_MS,
    900_000,
  ),
  reconcileFulfillmentProcessingStuckAfterMs: parsePositiveInt(
    process.env.RECONCILE_FULFILLMENT_PROCESSING_STUCK_MS,
    1_800_000,
  ),

  /**
   * TEMP TEST MODE — development only. `index.js` exits if DEV_CHECKOUT_AUTH_BYPASS is set when NODE_ENV=production.
   * When true: `POST /create-checkout-session` may accept `X-ZW-Dev-Checkout` + secret (see authMiddleware).
   */
  devCheckoutAuthBypass:
    nodeEnv !== 'production' &&
    process.env.DEV_CHECKOUT_AUTH_BYPASS === 'true',
  devCheckoutBypassSecret: String(
    process.env.DEV_CHECKOUT_BYPASS_SECRET ?? '',
  ).trim(),
  devCheckoutBypassUserId: String(
    process.env.DEV_CHECKOUT_BYPASS_USER_ID ?? '',
  ).trim(),
};

/**
 * Read at access time so tests / scripts can set `process.env.AIRTIME_PROVIDER` after `dotenv` loads.
 * Values: `mock` (default) | `reloadly` (routed in `deliveryAdapter.js`).
 */
Object.defineProperty(env, 'airtimeProvider', {
  enumerable: true,
  configurable: true,
  get() {
    return String(process.env.AIRTIME_PROVIDER ?? 'mock').trim().toLowerCase();
  },
});

/** Reloadly Topups API base (`RELOADLY_BASE_URL`); defaults from `RELOADLY_SANDBOX`. */
Object.defineProperty(env, 'reloadlyBaseUrl', {
  enumerable: true,
  configurable: true,
  get() {
    const raw = String(process.env.RELOADLY_BASE_URL ?? '').trim();
    if (raw) return raw.replace(/\/$/, '');
    return process.env.RELOADLY_SANDBOX === 'true'
      ? 'https://topups-sandbox.reloadly.com'
      : 'https://topups.reloadly.com';
  },
});

/** OAuth token URL (`RELOADLY_AUTH_URL`). */
Object.defineProperty(env, 'reloadlyAuthUrl', {
  enumerable: true,
  configurable: true,
  get() {
    const raw = String(process.env.RELOADLY_AUTH_URL ?? '').trim();
    return raw || 'https://auth.reloadly.com/oauth/token';
  },
});
