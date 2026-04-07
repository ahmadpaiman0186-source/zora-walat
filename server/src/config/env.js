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

/** Percent 0–100 (e.g. 4.5 for net margin target). */
function parseMarginPercent(raw, fallback) {
  const n = parseFloat(String(raw ?? '').trim());
  if (!Number.isFinite(n) || n < 0 || n > 100) return fallback;
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
   * Phase 1 profit floor (percent of revenue after Stripe + landed COGS).
   * Default 3% minimum, 4.5% target blend, 6% soft cap (see pricingEngine).
   */
  phase1MinMarginPercent: parseMarginPercent(
    process.env.PHASE1_MIN_MARGIN_PERCENT,
    3,
  ),
  phase1TargetMarginPercent: parseMarginPercent(
    process.env.PHASE1_TARGET_MARGIN_PERCENT,
    4.5,
  ),
  phase1MaxMarginPercent: parseMarginPercent(
    process.env.PHASE1_MAX_MARGIN_PERCENT,
    6,
  ),
  /** Reject checkouts whose final USD charge is below this (cents). Default $10. */
  phase1MinCheckoutUsdCents: parseNonNegativeInt(
    process.env.PHASE1_MIN_CHECKOUT_USD_CENTS,
    1000,
  ),
  /** Advisory only (logs / admin); preferred floor when tuning catalog. Default $15. */
  phase1RecommendedMinCheckoutUsdCents: parseNonNegativeInt(
    process.env.PHASE1_RECOMMENDED_MIN_CHECKOUT_USD_CENTS,
    1500,
  ),
  /** When true, allow orders below PHASE1_MIN_CHECKOUT_USD_CENTS (emergency; default false). */
  phase1AllowBelowMinimumOrders:
    process.env.PHASE1_ALLOW_BELOW_MINIMUM_ORDERS === 'true',

  /** Stripe fee estimate vs actual: flag divergence if delta exceeds max(cents, ratio×estimate). */
  financialTruthStripeFeeToleranceCents: parseNonNegativeInt(
    process.env.FINANCIAL_TRUTH_STRIPE_FEE_TOLERANCE_CENTS,
    50,
  ),
  /** Basis points of estimated fee (e.g. 1500 = 15%). */
  financialTruthStripeFeeToleranceRatioBps: parseBps(
    process.env.FINANCIAL_TRUTH_STRIPE_FEE_TOLERANCE_RATIO_BPS,
    1500,
  ),
  /**
   * Amount-only airtime: provider cost = round(faceCents * bps / 10000).
   * Default 9000 = 90% of face value treated as wholesale (configure from real quotes).
   */
  pricingAmountOnlyProviderBps: parseBps(
    process.env.PRICING_AMOUNT_ONLY_PROVIDER_BPS,
    9000,
  ),

  /**
   * Margin intel: routes with net/sell ratio below this (basis points) emit `low_margin_route_detected` (e.g. 500 = 5%).
   */
  marginLowRouteBp: parseBps(process.env.MARGIN_LOW_ROUTE_BP, 500),

  /** Reloadly API — server-only; never expose to clients. */
  reloadlyClientId: String(process.env.RELOADLY_CLIENT_ID ?? '').trim(),
  reloadlyClientSecret: String(process.env.RELOADLY_CLIENT_SECRET ?? '').trim(),
  /** Use Reloadly sandbox endpoints when true. */
  reloadlySandbox: process.env.RELOADLY_SANDBOX === 'true',
  /**
   * When AIRTIME_PROVIDER=reloadly and Reloadly auth/config is unavailable, allow mock airtime fallback.
   * Default false — must be explicitly enabled (never implicit from NODE_ENV).
   */
  reloadlyAllowUnavailableMockFallback:
    process.env.RELOADLY_ALLOW_UNAVAILABLE_MOCK_FALLBACK === 'true',
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
  /** Fulfilled orders older than this may be flagged if `order:{id}:delivered` inbox row is absent. */
  reconcilePushQuietPeriodMs: parsePositiveInt(
    process.env.RECONCILE_PUSH_QUIET_PERIOD_MS,
    600_000,
  ),
  /** Max rows sampled per auxiliary integrity slice (referral/loyalty/push) per scan. */
  reconcileIntegritySampleLimit: parsePositiveInt(
    process.env.RECONCILE_INTEGRITY_SAMPLE_LIMIT,
    250,
  ),
  /** Cap loyalty drift detection user rows per scan (raw aggregate). */
  reconcileLoyaltyDriftLimit: parsePositiveInt(
    process.env.RECONCILE_LOYALTY_DRIFT_LIMIT,
    40,
  ),
  /** Default chunk size for `runReconciliationScan({ fullChunk })` id scan; `0` uses service default (500). */
  reconcileFullChunkSize: parseNonNegativeInt(
    process.env.RECONCILE_FULL_CHUNK_SIZE,
    0,
  ),

  /**
   * PaymentCheckout stuck in `PROCESSING` (fulfillment) longer than this → recovery worker may revert or retry.
   * Default 10 minutes.
   */
  processingTimeoutMs: parsePositiveInt(process.env.PROCESSING_TIMEOUT_MS, 600_000),
  /** In-process poll for stuck-processing detection + recovery (`0` disables). Default 60s. */
  processingRecoveryPollMs: parseNonNegativeInt(
    process.env.PROCESSING_RECOVERY_POLL_MS,
    60_000,
  ),
  /** Auto recovery actions per order before marking `FAILED` (metadata `processingRecovery.count`). */
  processingRecoveryMaxAttempts: parsePositiveInt(
    process.env.PROCESSING_RECOVERY_MAX_ATTEMPTS,
    3,
  ),
  /** Set `false` to disable the worker (detection/recovery); default on. */
  processingRecoveryEnabled: process.env.PROCESSING_RECOVERY_ENABLED !== 'false',
  /**
   * When true with `RELOADLY_SANDBOX=true` and `AIRTIME_PROVIDER=reloadly`, stuck-processing recovery
   * will not auto-create a replacement attempt (`retry_new_attempt` → manual review). Reduces duplicate-send
   * risk during first sandbox drills; leave false for normal staging once comfortable with recovery.
   */
  processingRecoverySandboxConservative:
    process.env.PROCESSING_RECOVERY_SANDBOX_CONSERVATIVE === 'true',
  /** `manual_required_count_threshold_exceeded` when open manual-required rows ≥ this. */
  manualRequiredAlertCountThreshold: parsePositiveInt(
    process.env.MANUAL_REQUIRED_ALERT_COUNT_THRESHOLD,
    5,
  ),
  /** `manual_required_aged` when manualRequiredAt older than this (ms). Default 1h. */
  manualRequiredAgedMs: parsePositiveInt(
    process.env.MANUAL_REQUIRED_AGED_MS,
    3_600_000,
  ),
  /** Minimum length for admin manual-action `reason` (reject noise). */
  manualRequiredActionReasonMinLen: parsePositiveInt(
    process.env.MANUAL_REQUIRED_ACTION_REASON_MIN_LEN,
    8,
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

  /**
   * Web top-up fulfillment provider: `mock` | `reloadly` (Reloadly = AF + airtime only; see reloadlyWebTopupProvider).
   */
  webTopupFulfillmentProvider: String(
    process.env.WEBTOPUP_FULFILLMENT_PROVIDER ?? 'mock',
  )
    .trim()
    .toLowerCase(),

  /** When false, all web top-up fulfillment dispatch/retry is rejected (503). Default on. */
  fulfillmentDispatchEnabled: process.env.FULFILLMENT_DISPATCH_ENABLED !== 'false',
  /** Emergency kill switch — rejects dispatch/retry immediately (503). */
  fulfillmentDispatchKillSwitch:
    process.env.FULFILLMENT_DISPATCH_KILL_SWITCH === 'true',
  /**
   * When false, Reloadly adapter dispatch is disabled (503) while mock may still run.
   * Scope remains AF + airtime only when enabled.
   */
  reloadlyWebTopupProviderActive:
    process.env.RELOADLY_WEBTOPUP_PROVIDER_ACTIVE !== 'false',

  webtopupVelocitySessionWindowMs: parsePositiveInt(
    process.env.WEBTOPUP_VELOCITY_SESSION_WINDOW_MS,
    600_000,
  ),
  webtopupVelocitySessionOrdersWarn: parsePositiveInt(
    process.env.WEBTOPUP_VELOCITY_SESSION_ORDERS_WARN,
    8,
  ),
  webtopupVelocityPhoneHourOrdersWarn: parsePositiveInt(
    process.env.WEBTOPUP_VELOCITY_PHONE_HOUR_ORDERS_WARN,
    12,
  ),
  webtopupVelocityPhoneHourSameAmountWarn: parsePositiveInt(
    process.env.WEBTOPUP_VELOCITY_PHONE_HOUR_SAME_AMOUNT_WARN,
    6,
  ),

  /** When true, admin dispatch enqueues DB job only; worker runs provider I/O (see webtopFulfillmentJob.js). */
  webtopupFulfillmentAsync: process.env.WEBTOPUP_FULFILLMENT_ASYNC === 'true',
  /** Poll interval for WebTopupFulfillmentJob worker (`0` disables the interval). */
  webtopupFulfillmentJobPollMs: parseNonNegativeInt(
    process.env.WEBTOPUP_FULFILLMENT_JOB_POLL_MS,
    3_000,
  ),

  providerCircuitFailureThreshold: parsePositiveInt(
    process.env.PROVIDER_CIRCUIT_FAILURE_THRESHOLD,
    5,
  ),
  providerCircuitWindowMs: parsePositiveInt(
    process.env.PROVIDER_CIRCUIT_WINDOW_MS,
    60_000,
  ),
  providerCircuitOpenMs: parsePositiveInt(
    process.env.PROVIDER_CIRCUIT_OPEN_MS,
    120_000,
  ),

  /**
   * Mock-provider failure simulation (never affects Reloadly): timeout | terminal | unsupported
   */
  webtopupFailsim: String(process.env.WEBTOPUP_FAILSIM ?? '').trim().toLowerCase(),

  /** USD cents per 1 loyalty point (e.g. 100 → $1.00 = 1 point). */
  loyaltyPointsUsdBasisCents: parsePositiveInt(
    process.env.LOYALTY_POINTS_USD_BASIS_CENTS,
    100,
  ),

  /**
   * When false, loyalty points are not granted on delivery success (audit event still emitted).
   * Reconciliation will surface drift — use only for controlled freeze / incident response.
   */
  loyaltyAutoGrantOnDelivery: process.env.LOYALTY_AUTO_GRANT_ON_DELIVERY !== 'false',

  /**
   * When false, no delayed referral evaluation job is scheduled after delivery.
   * Independent of DB `referralEnabled` — this only suppresses the async scheduling hook.
   */
  referralEvaluationSchedulingEnabled:
    process.env.REFERRAL_EVALUATION_SCHEDULING_ENABLED !== 'false',

  /**
   * When false, inbox rows are still created but FCM is skipped (dev / staging).
   */
  pushNotificationsEnabled: process.env.PUSH_NOTIFICATIONS_ENABLED !== 'false',

  /**
   * Firebase service account JSON (entire object as a single line), or path via GOOGLE_APPLICATION_CREDENTIALS.
   * Prefer FIREBASE_SERVICE_ACCOUNT_JSON for explicit app config.
   */
  firebaseServiceAccountJson: String(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? '',
  ).trim(),

  /** Cap loyalty-related pushes per user per rolling hour (spam guard). */
  pushLoyaltyPerHourMax: parsePositiveInt(process.env.PUSH_LOYALTY_PER_HOUR_MAX, 4),

  /**
   * Optional extra salt for referral IP/device correlation hashes (HMAC).
   * Falls back to JWT_ACCESS_SECRET when unset.
   */
  referralPrivacySalt: String(process.env.REFERRAL_PRIVACY_SALT ?? '').trim(),
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
