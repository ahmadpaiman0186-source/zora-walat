/**
 * Central env (bootstrap loads dotenv before any import of app code).
 * DATABASE_URL must point at PostgreSQL (see server/.env.example). No SQLite fallback.
 */

import {
  mergeReloadlyOperatorMaps,
  RELOADLY_OPERATOR_ID_DEFAULTS,
} from './reloadlyOperatorIdDefaults.js';
import { isFulfillmentQueueEnabled } from '../queues/queueEnabled.js';

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

  /** Email OTP challenge — TTL for a single code (seconds). */
  authOtpTtlSec: parsePositiveInt(process.env.AUTH_OTP_TTL_SEC, 300),
  authOtpResendCooldownSec: parsePositiveInt(
    process.env.AUTH_OTP_RESEND_COOLDOWN_SEC,
    60,
  ),
  authOtpRequestWindowSec: parsePositiveInt(
    process.env.AUTH_OTP_REQUEST_WINDOW_SEC,
    600,
  ),
  authOtpMaxRequestsPerWindow: parsePositiveInt(
    process.env.AUTH_OTP_MAX_REQUESTS_PER_WINDOW,
    3,
  ),
  authOtpMaxVerifyAttempts: parsePositiveInt(
    process.env.AUTH_OTP_MAX_VERIFY_ATTEMPTS,
    5,
  ),
  authOtpLockSec: parsePositiveInt(process.env.AUTH_OTP_LOCK_SEC, 600),
  authOtpStaleRetentionSec: parsePositiveInt(
    process.env.AUTH_OTP_STALE_RETENTION_SEC,
    86400,
  ),

  /**
   * When true: money routes return 503; strict CORS; minimal access logs; extra startup checks.
   */
  prelaunchLockdown: prelaunchLockdownEnv,

  /**
   * When true: `POST /api/wallet/topup` rejects requests without `Idempotency-Key` (UUID).
   * Recommended for scale / production; off by default for older clients.
   */
  requireWalletTopupIdempotencyKey:
    process.env.REQUIRE_WALLET_TOPUP_IDEMPOTENCY_KEY === 'true',

  /**
   * Recon: PROCESSING + Reloadly pre-HTTP arm timestamp older than this → possible crash between arm and commit.
   * Default 10 minutes.
   */
  phase1ReconPreHttpArmedStaleMs: parsePositiveInt(
    process.env.PHASE1_RECON_PRE_HTTP_ARMED_STALE_MS,
    600_000,
  ),

  /** Scale gate: require cluster-wide metrics when Prometheus + fulfillment queue are on. */
  scaleGateRequireRedisMetricsAggregation:
    process.env.SCALE_GATE_REQUIRE_REDIS_METRICS_AGGREGATION !== 'false',

  /** Scale gate: disallow mock airtime unless explicitly allowed for gated envs. */
  scaleGateAllowMockAirtime: process.env.SCALE_GATE_ALLOW_MOCK_AIRTIME === 'true',

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
  /**
   * When true, skip Reloadly GET /reports/transactions inquiry before a retrying provider POST.
   * Emergency / tests only — increases duplicate-send risk on timeouts.
   */
  reloadlyInquiryBeforeRetryDisabled:
    process.env.RELOADLY_INQUIRY_BEFORE_RETRY_DISABLED === 'true',
  /**
   * When true, do not open the Reloadly sliding-window circuit breaker (default: breaker enabled).
   */
  reloadlyCircuitBreakerDisabled:
    process.env.RELOADLY_CIRCUIT_BREAKER_DISABLED === 'true',
  /** Sliding window (ms) for Reloadly provider circuit breaker sampling. */
  fulfillmentProviderCircuitWindowMs: parsePositiveInt(
    process.env.FULFILLMENT_PROVIDER_CIRCUIT_WINDOW_MS,
    60_000,
  ),
  /** Minimum samples in window before circuit may open. */
  fulfillmentProviderCircuitMinSamples: parsePositiveInt(
    process.env.FULFILLMENT_PROVIDER_CIRCUIT_MIN_SAMPLES,
    12,
  ),
  /** Failure ratio in window above which circuit opens (default 0.15 = 15%). */
  fulfillmentProviderCircuitFailureRatio: (() => {
    const n = parseFloat(
      String(process.env.FULFILLMENT_PROVIDER_CIRCUIT_FAILURE_RATIO ?? '0.15').trim(),
    );
    if (!Number.isFinite(n) || n <= 0 || n >= 1) return 0.15;
    return n;
  })(),
  /** Max report pages (50 rows each) scanned when matching customIdentifier (unfiltered fallback). */
  reloadlyTransactionInquiryMaxPages: parsePositiveInt(
    process.env.RELOADLY_TRANSACTION_INQUIRY_MAX_PAGES,
    5,
  ),
  /** Max Redis LIST entries for distributed Reloadly circuit samples. */
  reloadlyCircuitRedisListMax: parsePositiveInt(
    process.env.RELOADLY_CIRCUIT_REDIS_LIST_MAX,
    300,
  ),
  /** Minimum HTTP 429-class samples in window to enter soft rate-limit backoff regime. */
  reloadlyCircuitRateLimitSoftMin: parsePositiveInt(
    process.env.RELOADLY_CIRCUIT_RATE_LIMIT_SOFT_MIN,
    4,
  ),
  /** TTL for idempotency registry entries (seconds). */
  reloadlyIdempotencyRegistryTtlSeconds: parsePositiveInt(
    process.env.RELOADLY_IDEMPOTENCY_REGISTRY_TTL_SECONDS,
    604800,
  ),
  /** Redis marker TTL when a Reloadly POST may still be in-flight at provider (seconds). */
  reloadlyTopupInFlightTtlSeconds: parsePositiveInt(
    process.env.RELOADLY_TOPUP_IN_FLIGHT_TTL_SECONDS,
    600,
  ),
  /** DB `startedAt`/`in-flight` recency window for stalled-verification hold (ms). */
  reloadlyStalledVerificationRecentMs: parsePositiveInt(
    process.env.RELOADLY_STALLED_VERIFICATION_RECENT_MS,
    300_000,
  ),
  /** Redis for production anti-abuse state (checkout/session). Optional; fail-safe fallback. */
  redisUrl: String(process.env.REDIS_URL ?? '').trim(),
  /** Redis connect timeout (ms). */
  redisConnectTimeoutMs: parsePositiveInt(
    process.env.REDIS_CONNECT_TIMEOUT_MS,
    2_000,
  ),
  /**
   * When literal `true` and `REDIS_URL` is set: money-adjacent HTTP rate limiters use Redis
   * (`rate-limit-redis`) so limits are shared across Node instances. On connection failure,
   * startup falls back to in-memory limits and logs a warning.
   */
  rateLimitUseRedis: process.env.RATE_LIMIT_USE_REDIS === 'true',
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

  /**
   * Client `POST …/mark-paid` (poll Stripe then transition row). Duplicates webhook authority — risky in prod.
   * Default: true in non-production, false in production (Stripe webhooks are canonical).
   * Set WEBTOPUP_CLIENT_MARK_PAID_ENABLED=true to allow in production (debug / proxy only).
   */
  webtopupClientMarkPaidEnabled: (() => {
    const raw = String(process.env.WEBTOPUP_CLIENT_MARK_PAID_ENABLED ?? '')
      .trim()
      .toLowerCase();
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return nodeEnv !== 'production';
  })(),

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

  /** BullMQ worker concurrency per worker process (bounds parallel heavy fulfillment). */
  fulfillmentWorkerConcurrency: parsePositiveInt(
    process.env.FULFILLMENT_WORKER_CONCURRENCY,
    32,
  ),
  fulfillmentJobMaxAttempts: parsePositiveInt(
    process.env.FULFILLMENT_JOB_MAX_ATTEMPTS,
    8,
  ),
  fulfillmentJobBackoffMs: parsePositiveInt(
    process.env.FULFILLMENT_JOB_BACKOFF_MS,
    2000,
  ),
  /** Client `postExecute` wait for terminal `orderStatus` when queue mode is on. */
  fulfillmentClientExecuteWaitMs: parsePositiveInt(
    process.env.FULFILLMENT_CLIENT_EXECUTE_WAIT_MS,
    120_000,
  ),

  /**
   * When true, `GET /metrics` exposes in-process counters as Prometheus text (see `prometheusTextFormat.js`).
   * Default off — enable on staging/prod scrapers only.
   */
  metricsPrometheusEnabled: process.env.METRICS_PROMETHEUS_ENABLED === 'true',

  /**
   * When true, counters + histograms also aggregate in Redis (`redisMetricsAggregator.js`) for multi-replica scrape.
   * Requires REDIS_URL. Recommended in production when `METRICS_PROMETHEUS_ENABLED=true`.
   */
  metricsRedisAggregation: process.env.METRICS_REDIS_AGGREGATION === 'true',

  /**
   * Logical instance id for logs / future metrics (`INSTANCE_ID` or HOSTNAME).
   */
  instanceId: String(
    process.env.INSTANCE_ID || process.env.HOSTNAME || 'single',
  ).slice(0, 128),
};

/**
 * Single top-up credit cap (USD cents). Read at access time so tests can clamp without module reload.
 * Default 1_000_000 ($10,000). Production should set explicitly (e.g. 50000 = $500).
 */
Object.defineProperty(env, 'walletTopupMaxUsdCents', {
  enumerable: true,
  configurable: true,
  get() {
    const n = parseInt(
      String(process.env.WALLET_TOPUP_MAX_USD_CENTS ?? '1000000').trim(),
      10,
    );
    if (!Number.isFinite(n) || n < 1) return 1_000_000;
    return n;
  },
});

/**
 * Max authenticated wallet top-up HTTP requests per rolling minute per user+IP.
 * Read at access time for integration tests.
 */
Object.defineProperty(env, 'walletTopupPerMinuteMax', {
  enumerable: true,
  configurable: true,
  get() {
    const raw = String(process.env.WALLET_TOPUP_PER_MINUTE_MAX ?? '').trim();
    if (raw) {
      const n = parseInt(raw, 10);
      if (Number.isFinite(n) && n >= 1) return n;
    }
    return nodeEnv === 'production' ? 12 : 40;
  },
});

/**
 * When true, post-topup **main balance** vs main-balance ledger reasons mismatch throws
 * (true today for `balanceUsdCents` writers in this repo; see `walletLedgerReasons.js`).
 */
Object.defineProperty(env, 'walletStrictLedgerVerify', {
  enumerable: true,
  configurable: true,
  get() {
    return process.env.WALLET_STRICT_LEDGER_VERIFY === 'true';
  },
});

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

/**
 * Phase 1 `PaymentCheckout` airtime fulfillment via BullMQ (`phase1-fulfillment-v1`).
 * Requires `FULFILLMENT_QUEUE_ENABLED=true` and `REDIS_URL`.
 */
Object.defineProperty(env, 'fulfillmentQueueEnabled', {
  enumerable: true,
  configurable: true,
  get() {
    return isFulfillmentQueueEnabled();
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
