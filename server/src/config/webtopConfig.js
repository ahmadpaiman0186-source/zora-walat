/**
 * WebTopup centralized runtime configuration — parsed once from `process.env`, frozen.
 * Hot paths must read via `env` (spread from this slice) or import `WEBTOP_ENV_SLICE` directly;
 * do not read `process.env.WEBTOPUP_*` / `RECONCILE_*` in services for these keys.
 */

import path from 'node:path';

const nodeEnv = process.env.NODE_ENV || 'development';

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

/** Comma-separated backoff schedule for reliability retries (ms). */
function parseBackoffMs(raw, fallback) {
  const s = String(raw ?? '').trim();
  if (!s) return fallback;
  const parts = s.split(',').map((x) => parseInt(x.trim(), 10));
  const ok = parts.filter((n) => Number.isFinite(n) && n >= 0);
  return ok.length ? ok : fallback;
}

function envPositiveInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Build the env-shaped WebTopup slice (same property names as `env` had inline).
 * @returns {Record<string, unknown>}
 */
function buildWebtopEnvSlice() {
  const webtopSlaPaidToDeliveredWarnRatio = (() => {
    const raw = String(process.env.WEBTOPUP_SLA_PAID_TO_DELIVERED_WARN_RATIO ?? '').trim();
    if (!raw) {
      const w = parseFloat(String(process.env.WEBTOPUP_SLA_WARN_RATIO ?? '0.7'));
      if (!Number.isFinite(w)) return 0.7;
      return Math.min(0.95, Math.max(0.5, w));
    }
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return 0.7;
    return Math.min(0.95, Math.max(0.5, n));
  })();

  const webtopSlaWarnRatio = (() => {
    const raw = parseFloat(String(process.env.WEBTOPUP_SLA_WARN_RATIO ?? '0.7'));
    if (!Number.isFinite(raw)) return 0.7;
    return Math.min(0.95, Math.max(0.5, raw));
  })();

  const webtopupClientMarkPaidEnabled = (() => {
    const raw = String(process.env.WEBTOPUP_CLIENT_MARK_PAID_ENABLED ?? '')
      .trim()
      .toLowerCase();
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return nodeEnv !== 'production';
  })();

  const webtopupDurableLogPath = (() => {
    const raw = String(process.env.WEBTOPUP_DURABLE_LOG_PATH ?? '').trim();
    if (raw) return raw;
    return path.join(process.cwd(), 'logs', 'webtopup-events.ndjson');
  })();

  const dailyRaw = String(process.env.WEBTOPUP_FINANCIAL_DAILY_CAP_CENTS_PER_PHONE ?? '').trim();
  const webtopupFinancialDailyCapCentsPerPhone =
    dailyRaw === '' ? 0 : Math.max(0, parseInt(dailyRaw, 10) || 0);

  const maxDefault = 10_000_000;
  const webtopupFinancialMinAmountCents = envPositiveInt('WEBTOPUP_FINANCIAL_MIN_AMOUNT_CENTS', 1);
  let webtopupFinancialMaxAmountCents = envPositiveInt(
    'WEBTOPUP_FINANCIAL_MAX_AMOUNT_CENTS',
    maxDefault,
  );
  webtopupFinancialMaxAmountCents = Math.max(webtopupFinancialMinAmountCents, webtopupFinancialMaxAmountCents);

  const webtopupFinancialAllowedCurrenciesCsv = String(
    process.env.WEBTOPUP_FINANCIAL_ALLOWED_CURRENCIES ?? 'usd',
  )
    .trim()
    .toLowerCase();

  const adminMutationDefault = nodeEnv === 'production' ? 20 : 120;
  const adminReadDefault = nodeEnv === 'production' ? 80 : 300;
  const webtopupAdminMutationMaxPer15m = (() => {
    const raw = process.env.WEBTOPUP_ADMIN_MUTATION_MAX_PER_15M;
    if (raw === undefined || raw === '') return adminMutationDefault;
    const n = parseInt(String(raw), 10);
    return Number.isFinite(n) && n >= 1 ? Math.min(10_000, n) : adminMutationDefault;
  })();
  const webtopupAdminReadMaxPer15m = (() => {
    const raw = process.env.WEBTOPUP_ADMIN_READ_MAX_PER_15M;
    if (raw === undefined || raw === '') return adminReadDefault;
    const n = parseInt(String(raw), 10);
    return Number.isFinite(n) && n >= 1 ? Math.min(50_000, n) : adminReadDefault;
  })();

  return {
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

    webtopSlaPaymentPendingMaxMs: parsePositiveInt(
      process.env.WEBTOPUP_SLA_PAYMENT_PENDING_MAX_MS,
      1_800_000,
    ),
    webtopSlaPaidToDeliveredMaxMs: parsePositiveInt(
      process.env.WEBTOPUP_SLA_PAID_TO_DELIVERED_MAX_MS,
      3_600_000,
    ),
    webtopSlaPaidToDeliveredWarnRatio,
    webtopSlaWarnRatio,
    webtopSlaEnforcementEnabled: process.env.WEBTOPUP_SLA_ENFORCEMENT_ENABLED !== 'false',
    webtopSlaEnforcementProcessingGraceMs: parsePositiveInt(
      process.env.WEBTOPUP_SLA_ENFORCEMENT_PROCESSING_GRACE_MS,
      45_000,
    ),
    webtopupUxPublicFieldsEnabled: process.env.WEBTOPUP_UX_PUBLIC_FIELDS_ENABLED !== 'false',

    reconcilePushQuietPeriodMs: parsePositiveInt(
      process.env.RECONCILE_PUSH_QUIET_PERIOD_MS,
      600_000,
    ),
    reconcileIntegritySampleLimit: parsePositiveInt(
      process.env.RECONCILE_INTEGRITY_SAMPLE_LIMIT,
      250,
    ),
    reconcileLoyaltyDriftLimit: parsePositiveInt(
      process.env.RECONCILE_LOYALTY_DRIFT_LIMIT,
      40,
    ),
    reconcileFullChunkSize: parseNonNegativeInt(process.env.RECONCILE_FULL_CHUNK_SIZE, 0),

    webTopupFulfillmentProvider: String(process.env.WEBTOPUP_FULFILLMENT_PROVIDER ?? 'mock')
      .trim()
      .toLowerCase(),
    fulfillmentDispatchEnabled: process.env.FULFILLMENT_DISPATCH_ENABLED !== 'false',
    fulfillmentDispatchKillSwitch: process.env.FULFILLMENT_DISPATCH_KILL_SWITCH === 'true',
    reloadlyWebTopupProviderActive: process.env.RELOADLY_WEBTOPUP_PROVIDER_ACTIVE !== 'false',

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

    webtopupAbuseBurstWindowMs: parsePositiveInt(process.env.WEBTOPUP_ABUSE_BURST_WINDOW_MS, 120_000),
    webtopupAbuseBurstMaxPerWindow: parsePositiveInt(
      process.env.WEBTOPUP_ABUSE_BURST_MAX_PER_WINDOW,
      40,
    ),
    webtopupAbusePiChurnWindowMs: parsePositiveInt(
      process.env.WEBTOPUP_ABUSE_PI_CHURN_WINDOW_MS,
      300_000,
    ),
    webtopupAbusePiChurnMaxPerWindow: parsePositiveInt(
      process.env.WEBTOPUP_ABUSE_PI_CHURN_MAX_PER_WINDOW,
      20,
    ),
    webtopupAbuseMultiTargetWindowMs: parsePositiveInt(
      process.env.WEBTOPUP_ABUSE_MULTI_TARGET_WINDOW_MS,
      900_000,
    ),
    webtopupAbuseMultiTargetDistinctMax: parsePositiveInt(
      process.env.WEBTOPUP_ABUSE_MULTI_TARGET_DISTINCT_MAX,
      14,
    ),
    webtopupAbusePhoneSpamWindowMs: parsePositiveInt(
      process.env.WEBTOPUP_ABUSE_PHONE_SPAM_WINDOW_MS,
      600_000,
    ),
    webtopupAbusePhoneSpamMaxPerWindow: parsePositiveInt(
      process.env.WEBTOPUP_ABUSE_PHONE_SPAM_MAX_PER_WINDOW,
      10,
    ),
    webtopupAbuseFailedPaymentWindowMs: parsePositiveInt(
      process.env.WEBTOPUP_ABUSE_FAILED_PAYMENT_WINDOW_MS,
      900_000,
    ),
    webtopupAbuseFailedPaymentMaxBeforeBlock: parsePositiveInt(
      process.env.WEBTOPUP_ABUSE_FAILED_PAYMENT_MAX,
      8,
    ),

    webtopupFulfillmentAsync: process.env.WEBTOPUP_FULFILLMENT_ASYNC === 'true',
    webtopupFulfillmentJobPollMs: parseNonNegativeInt(
      process.env.WEBTOPUP_FULFILLMENT_JOB_POLL_MS,
      3_000,
    ),
    webtopupFulfillmentJobBatchSize: parsePositiveInt(
      process.env.WEBTOPUP_FULFILLMENT_JOB_BATCH_SIZE,
      15,
    ),
    webtopupFulfillmentJobLeaseMs: parsePositiveInt(
      process.env.WEBTOPUP_FULFILLMENT_JOB_LEASE_MS,
      300_000,
    ),
    webtopupFulfillmentStaleQueuedOrderMs: parsePositiveInt(
      process.env.WEBTOPUP_FULFILLMENT_STALE_QUEUED_ORDER_MS,
      900_000,
    ),
    webtopupFulfillmentStaleProcessingOrderMs: parsePositiveInt(
      process.env.WEBTOPUP_FULFILLMENT_STALE_PROCESSING_ORDER_MS,
      1_800_000,
    ),

    webtopupDurableLogEnabled: process.env.WEBTOPUP_DURABLE_LOG_ENABLED === 'true',
    webtopupDurableLogPath,
    webtopupDurableLogMaxBytes: parsePositiveInt(process.env.WEBTOPUP_DURABLE_LOG_MAX_BYTES, 52_428_800),

    webtopupMonitoringStaleProcessingWarnThreshold: parsePositiveInt(
      process.env.WEBTOPUP_MONITORING_STALE_PROCESSING_WARN,
      1,
    ),
    webtopupMonitoringStaleQueuedWarnThreshold: parsePositiveInt(
      process.env.WEBTOPUP_MONITORING_STALE_QUEUED_WARN,
      1,
    ),
    webtopupMonitoringFulfillmentFailureWarnThreshold: parsePositiveInt(
      process.env.WEBTOPUP_MONITORING_FULFILLMENT_FAIL_WARN,
      5,
    ),
    webtopupMonitoringFallbackAppliedWarnThreshold: parsePositiveInt(
      process.env.WEBTOPUP_MONITORING_FALLBACK_APPLIED_WARN,
      1,
    ),

    webtopupStripeFallbackEnabled: process.env.WEBTOPUP_STRIPE_FALLBACK_ENABLED === 'true',
    webtopupStripeFallbackDelayMs: parsePositiveInt(
      process.env.WEBTOPUP_STRIPE_FALLBACK_DELAY_MS,
      60_000,
    ),

    providerCircuitFailureThreshold: parsePositiveInt(
      process.env.PROVIDER_CIRCUIT_FAILURE_THRESHOLD,
      5,
    ),
    providerCircuitWindowMs: parsePositiveInt(process.env.PROVIDER_CIRCUIT_WINDOW_MS, 60_000),
    providerCircuitOpenMs: parsePositiveInt(process.env.PROVIDER_CIRCUIT_OPEN_MS, 120_000),

    webtopupReliabilityEnabled: process.env.WEBTOPUP_RELIABILITY_ENABLED !== 'false',
    webtopupFallbackProvider: String(process.env.WEBTOPUP_FALLBACK_PROVIDER ?? '')
      .trim()
      .toLowerCase(),
    webtopupRetryMaxAttempts: parsePositiveInt(process.env.WEBTOPUP_RETRY_MAX_ATTEMPTS, 3),
    webtopupRetryBackoffMs: parseBackoffMs(process.env.WEBTOPUP_RETRY_BACKOFF_MS, [500, 1500, 3000]),
    webtopupRecoveryEnqueue: process.env.WEBTOPUP_RECOVERY_ENQUEUE === 'true',

    webtopupAutoRetryEnabled: process.env.WEBTOPUP_AUTO_RETRY_ENABLED !== 'false',
    webtopupAutoRetryMaxDispatchAttempts: parsePositiveInt(
      process.env.WEBTOPUP_AUTO_RETRY_MAX_DISPATCH_ATTEMPTS,
      3,
    ),
    webtopupAutoRetryBackoffMs: parseBackoffMs(
      process.env.WEBTOPUP_AUTO_RETRY_BACKOFF_MS,
      [10_000, 30_000, 60_000],
    ),

    webtopupFailsim: String(process.env.WEBTOPUP_FAILSIM ?? '').trim().toLowerCase(),
    webtopupClientMarkPaidEnabled,

    webtopupReloadlyDurableCircuitEnabled:
      process.env.WEBTOPUP_RELOADLY_DURABLE_CIRCUIT_ENABLED !== 'false',
    webtopupReloadlyCircuitFailureThreshold: envPositiveInt(
      'WEBTOPUP_RELOADLY_CIRCUIT_FAILURE_THRESHOLD',
      5,
    ),
    webtopupReloadlyCircuitWindowMs: envPositiveInt('WEBTOPUP_RELOADLY_CIRCUIT_WINDOW_MS', 120_000),
    webtopupReloadlyCircuitCooldownMs: envPositiveInt(
      'WEBTOPUP_RELOADLY_CIRCUIT_COOLDOWN_MS',
      120_000,
    ),
    webtopupReloadlyCircuitHalfOpenMaxProbes: envPositiveInt(
      'WEBTOPUP_RELOADLY_CIRCUIT_HALF_OPEN_MAX_PROBES',
      2,
    ),

    webtopupFinancialMinAmountCents,
    webtopupFinancialMaxAmountCents,
    webtopupFinancialDailyCapCentsPerPhone,
    webtopupFinancialDailyCapWindowHours: envPositiveInt(
      'WEBTOPUP_FINANCIAL_DAILY_CAP_WINDOW_HOURS',
      24,
    ),
    webtopupFinancialAllowedCurrenciesCsv,

    webtopupAdminMutationMaxPer15m,
    webtopupAdminReadMaxPer15m,
  };
}

export const WEBTOP_ENV_SLICE = Object.freeze(buildWebtopEnvSlice());

const MIN_PAID_TO_DELIVERED_SLA_MS = 60_000;
const MIN_PAYMENT_PENDING_SLA_MS = 30_000;
const MAX_ABUSE_BURST_PER_WINDOW = 50_000;

/**
 * Pure validation (tests + startup). Pass an env-shaped object with WebTopup fields.
 * @param {Record<string, unknown>} e
 * @returns {{ errors: string[]; warnings: string[] }}
 */
export function collectWebtopConfigValidationIssues(e) {
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];

  if (
    Number.isFinite(e.webtopSlaPaidToDeliveredMaxMs) &&
    e.webtopSlaPaidToDeliveredMaxMs < MIN_PAID_TO_DELIVERED_SLA_MS
  ) {
    errors.push(
      `WEBTOPUP_SLA_PAID_TO_DELIVERED_MAX_MS must be >= ${MIN_PAID_TO_DELIVERED_SLA_MS} (got ${e.webtopSlaPaidToDeliveredMaxMs})`,
    );
  }
  if (
    Number.isFinite(e.webtopSlaPaymentPendingMaxMs) &&
    e.webtopSlaPaymentPendingMaxMs < MIN_PAYMENT_PENDING_SLA_MS
  ) {
    errors.push(
      `WEBTOPUP_SLA_PAYMENT_PENDING_MAX_MS must be >= ${MIN_PAYMENT_PENDING_SLA_MS} (got ${e.webtopSlaPaymentPendingMaxMs})`,
    );
  }

  if (
    Number.isFinite(e.webtopupAbuseBurstMaxPerWindow) &&
    e.webtopupAbuseBurstMaxPerWindow > MAX_ABUSE_BURST_PER_WINDOW
  ) {
    errors.push(
      `WEBTOPUP_ABUSE_BURST_MAX_PER_WINDOW is unrealistically high (${e.webtopupAbuseBurstMaxPerWindow}); check for a typo`,
    );
  }

  if (
    Number.isFinite(e.reconcileFulfillmentQueuedStuckAfterMs) &&
    Number.isFinite(e.reconcileFulfillmentProcessingStuckAfterMs) &&
    e.reconcileFulfillmentQueuedStuckAfterMs > e.reconcileFulfillmentProcessingStuckAfterMs
  ) {
    warnings.push(
      'RECONCILE_FULFILLMENT_QUEUED_STUCK_MS exceeds RECONCILE_FULFILLMENT_PROCESSING_STUCK_MS — queued “stale” may never flag before processing',
    );
  }

  const maxA = e.webtopupAutoRetryMaxDispatchAttempts;
  const backoffLen = Array.isArray(e.webtopupAutoRetryBackoffMs)
    ? e.webtopupAutoRetryBackoffMs.length
    : 0;
  if (
    Number.isFinite(maxA) &&
    Array.isArray(e.webtopupAutoRetryBackoffMs) &&
    maxA > 1 &&
    backoffLen < maxA - 1
  ) {
    warnings.push(
      `WEBTOPUP_AUTO_RETRY_BACKOFF_MS has ${backoffLen} entries; need at least ${maxA - 1} for max ${maxA} dispatch attempts`,
    );
  }

  if (Number.isFinite(e.webtopupFulfillmentJobLeaseMs) && e.webtopupFulfillmentJobLeaseMs < 10_000) {
    warnings.push(
      `WEBTOPUP_FULFILLMENT_JOB_LEASE_MS=${e.webtopupFulfillmentJobLeaseMs} is very short; hung jobs may be recycled aggressively`,
    );
  }

  if (
    e.webtopupDurableLogEnabled &&
    Number.isFinite(e.webtopupDurableLogMaxBytes) &&
    e.webtopupDurableLogMaxBytes < 1024
  ) {
    warnings.push(
      'WEBTOPUP_DURABLE_LOG_MAX_BYTES should be at least 1024 when durable log is enabled',
    );
  }

  const retryMax = e.webtopupRetryMaxAttempts;
  const retryBackoffLen = Array.isArray(e.webtopupRetryBackoffMs)
    ? e.webtopupRetryBackoffMs.length
    : 0;
  if (Number.isFinite(retryMax) && retryMax > 1 && retryBackoffLen < retryMax - 1) {
    warnings.push(
      `WEBTOPUP_RETRY_BACKOFF_MS should list at least ${retryMax - 1} delays for ${retryMax} max attempts (has ${retryBackoffLen})`,
    );
  }

  if (
    Number.isFinite(e.providerCircuitFailureThreshold) &&
    e.providerCircuitFailureThreshold > 10_000
  ) {
    errors.push('PROVIDER_CIRCUIT_FAILURE_THRESHOLD is unrealistically high');
  }

  return { errors, warnings };
}

const _initialValidation = collectWebtopConfigValidationIssues(WEBTOP_ENV_SLICE);

export const WEBTOP_CONFIG_VALIDATION = Object.freeze({
  status: _initialValidation.errors.length
    ? 'invalid'
    : _initialValidation.warnings.length
      ? 'warn'
      : 'ok',
  errors: _initialValidation.errors,
  warnings: _initialValidation.warnings,
});
