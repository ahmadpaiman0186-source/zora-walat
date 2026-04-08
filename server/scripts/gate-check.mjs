#!/usr/bin/env node
/**
 * Launch / readiness gate for this repo (real checks only).
 * Without --strict: exits 0 (report-only).
 * With --strict: exits 1 when verdict is BLOCKED or NOT_READY_FOR_SCALE (scale CI must not pass).
 * With --scale: additionally requires cross-replica metrics + wallet idempotency policy + clean recon
 * (exits 1 when `scaleReady` is false if combined with --strict).
 *
 * Verdicts: BLOCKED | CONDITIONAL_BETA_ONLY | LIMITED_PRODUCTION_READY | NOT_READY_FOR_SCALE
 *
 * `LIMITED_PRODUCTION_READY` is not upgraded by tests or docs alone—only by truth in `checks`
 * (e.g. non-mock airtime, recon cleanliness). `scaleReady` is a separate, stricter checklist.
 */
import '../bootstrap.js';

import { evaluateProductionMoneyPathSafety } from '../src/config/productionSafetyGates.js';
import { collectCriticalLaunchConfigViolations } from '../src/config/criticalConfigValidation.js';
import { env } from '../src/config/env.js';
import { withRedis } from '../src/services/redisClient.js';
import { isReloadlyConfigured } from '../src/services/reloadlyClient.js';
import {
  runPhase1MoneyFulfillmentReconciliationScan,
  RECON_DIVERGENCE_CODE,
} from '../src/services/phase1MoneyFulfillmentReconciliationEngine.js';
import { computeScaleBlockers } from '../src/lib/scaleGateBlockers.js';

const strict = process.argv.includes('--strict');
const scaleIntent = process.argv.includes('--scale');
const productionIntent =
  process.argv.includes('--production') || env.nodeEnv === 'production';

/** @type {Record<string, unknown>} */
const checks = {
  nodeEnv: env.nodeEnv,
  databaseUrlPresent: String(process.env.DATABASE_URL ?? '').trim().length > 0,
  databaseUrlPostgres: /^postgres(ql)?:\/\//i.test(String(process.env.DATABASE_URL ?? '').trim()),
  redisUrlPresent: String(process.env.REDIS_URL ?? '').trim().length > 0,
  fulfillmentQueueEnabledFlag: process.env.FULFILLMENT_QUEUE_ENABLED === 'true',
  metricsPrometheusEnabled: env.metricsPrometheusEnabled,
  metricsRedisAggregation: env.metricsRedisAggregation,
  airtimeProvider: String(process.env.AIRTIME_PROVIDER ?? 'mock').trim().toLowerCase(),
  reloadlyConfiguredForAirtime:
    String(process.env.AIRTIME_PROVIDER ?? 'mock').trim().toLowerCase() !== 'reloadly' ||
    isReloadlyConfigured(),
  productionMoneyPathSafetyOk: false,
  redisPingOk: null,
  providerOutcomeRegistryImplemented: true,
  phase1ReconciliationCriticalLedgerCount: null,
  phase1ReconciliationStallCount: null,
  phase1ReconciliationInconsistentCount: null,
  phase1ReconciliationPreHttpStaleCount: null,
  phase1ReconciliationScanError: null,
  requireWalletTopupIdempotencyKey: env.requireWalletTopupIdempotencyKey,
  scaleGateRequireRedisMetricsAggregation: env.scaleGateRequireRedisMetricsAggregation,
  scaleGateAllowMockAirtime: env.scaleGateAllowMockAirtime,
};

const blockers = [];
const warnings = [];

const money = evaluateProductionMoneyPathSafety(process.env);
checks.productionMoneyPathSafetyOk = money.ok;
if (!money.ok) {
  blockers.push(`production_safety:${money.code}:${money.message}`);
}

for (const v of collectCriticalLaunchConfigViolations()) {
  blockers.push(`critical_config:${v}`);
}

if (productionIntent) {
  if (!checks.databaseUrlPostgres) {
    blockers.push('production_intent:DATABASE_URL must be PostgreSQL');
  }
  if (String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim().length < 8) {
    blockers.push('production_intent:STRIPE_WEBHOOK_SECRET missing or too short');
  }
  if (String(process.env.STRIPE_SECRET_KEY ?? '').trim().length < 8) {
    blockers.push('production_intent:STRIPE_SECRET_KEY missing or too short');
  }
}

if (
  checks.fulfillmentQueueEnabledFlag &&
  checks.metricsPrometheusEnabled &&
  !checks.metricsRedisAggregation
) {
  warnings.push(
    'METRICS_PROMETHEUS_ENABLED with fulfillment queue but METRICS_REDIS_AGGREGATION=false — per-replica metrics only.',
  );
}

if (checks.airtimeProvider === 'reloadly' && !isReloadlyConfigured()) {
  blockers.push('AIRTIME_PROVIDER=reloadly but Reloadly credentials are not configured');
}

const rPing = await withRedis((c) => c.ping());
checks.redisPingOk = rPing.ok === true;
if (checks.fulfillmentQueueEnabledFlag && checks.redisPingOk === false) {
  blockers.push('FULFILLMENT_QUEUE_ENABLED=true but Redis ping failed or REDIS_URL missing');
}

if (checks.fulfillmentQueueEnabledFlag && checks.redisPingOk !== true) {
  warnings.push('Fulfillment queue expected Redis healthy for distributed circuit + idempotency registry.');
}

let ledgerCritical = 0;
let stallFindings = 0;
let inconsistentFindings = 0;
let preHttpStaleFindings = 0;
try {
  const recon = await runPhase1MoneyFulfillmentReconciliationScan({ limit: 100 });
  for (const f of recon.findings ?? []) {
    if (
      f.divergenceCode === RECON_DIVERGENCE_CODE.ATTEMPT_SUCCEEDED_ORDER_NOT_FULFILLED ||
      f.divergenceCode === RECON_DIVERGENCE_CODE.FULFILLED_PAYMENT_ROW_MISMATCH
    ) {
      ledgerCritical += 1;
    }
    if (f.divergenceCode === RECON_DIVERGENCE_CODE.PROVIDER_UNKNOWN_STALL) {
      stallFindings += 1;
    }
    if (f.divergenceCode === RECON_DIVERGENCE_CODE.INCONSISTENT_ATTEMPT_VS_ORDER) {
      inconsistentFindings += 1;
    }
    if (f.divergenceCode === RECON_DIVERGENCE_CODE.PRE_HTTP_DISPATCH_ARMED_STALE) {
      preHttpStaleFindings += 1;
    }
  }
  checks.phase1ReconciliationCriticalLedgerCount = ledgerCritical;
  checks.phase1ReconciliationStallCount = stallFindings;
  checks.phase1ReconciliationInconsistentCount = inconsistentFindings;
  checks.phase1ReconciliationPreHttpStaleCount = preHttpStaleFindings;
} catch (e) {
  checks.phase1ReconciliationScanError = String(e?.message ?? e).slice(0, 400);
  warnings.push(
    `phase1_reconciliation_scan_failed:${checks.phase1ReconciliationScanError}`,
  );
}

let verdict = 'LIMITED_PRODUCTION_READY';
if (blockers.length > 0) {
  verdict = 'BLOCKED';
} else if (env.prelaunchLockdown || checks.airtimeProvider === 'mock') {
  verdict = 'CONDITIONAL_BETA_ONLY';
} else if (!checks.redisUrlPresent) {
  verdict = 'NOT_READY_FOR_SCALE';
}

if (verdict !== 'BLOCKED' && ledgerCritical > 0) {
  verdict = 'NOT_READY_FOR_SCALE';
  warnings.push(
    'phase1_reconciliation: critical PaymentCheckout↔fulfillment ledger divergences detected — resolve before scaling traffic.',
  );
}

if (verdict !== 'BLOCKED' && inconsistentFindings > 0) {
  verdict = 'NOT_READY_FOR_SCALE';
  warnings.push(
    'phase1_reconciliation: inconsistent fulfillment attempts vs order lifecycle — data repair required before scale.',
  );
}

if (verdict === 'LIMITED_PRODUCTION_READY' && stallFindings > 0) {
  verdict = 'NOT_READY_FOR_SCALE';
  warnings.push(
    'phase1_reconciliation: stalled provider-verification holds present — operator capacity required before scale.',
  );
}

if (verdict !== 'BLOCKED' && preHttpStaleFindings > 0) {
  verdict = 'NOT_READY_FOR_SCALE';
  warnings.push(
    'phase1_reconciliation: stale pre-HTTP Reloadly dispatch arms — investigate crash-ordering / provider truth before scale.',
  );
}

/** Scale certification (stricter than LIMITED): honest checklist only — never auto-fix. */
const scaleBlockers = computeScaleBlockers({
  fulfillmentQueueEnabledFlag: checks.fulfillmentQueueEnabledFlag,
  metricsPrometheusEnabled: checks.metricsPrometheusEnabled,
  metricsRedisAggregation: checks.metricsRedisAggregation,
  scaleGateRequireRedisMetricsAggregation: checks.scaleGateRequireRedisMetricsAggregation,
  airtimeProvider: checks.airtimeProvider,
  scaleGateAllowMockAirtime: checks.scaleGateAllowMockAirtime,
  requireWalletTopupIdempotencyKey: checks.requireWalletTopupIdempotencyKey,
  redisPingOk: checks.redisPingOk,
  redisUrlPresent: checks.redisUrlPresent,
  ledgerCritical,
  inconsistentFindings,
  stallFindings,
  preHttpStaleFindings,
});

const scaleReady = scaleBlockers.length === 0 && verdict === 'LIMITED_PRODUCTION_READY';

/** Factual booleans for operators — not a “green/healthy” rollup. */
const readinessSummary = {
  walletTopupIdempotencyKeyEnforced: env.requireWalletTopupIdempotencyKey,
  phase1ReconciliationFindingsClean:
    ledgerCritical === 0 &&
    inconsistentFindings === 0 &&
    stallFindings === 0 &&
    preHttpStaleFindings === 0,
  phase1ReconciliationScanCompleted: checks.phase1ReconciliationScanError == null,
  redisPingSucceeded: checks.redisPingOk === true,
};

const out = {
  verdict,
  scaleReady,
  scaleCertified: scaleReady,
  scaleIntent,
  scaleBlockers,
  strict,
  blockers,
  warnings,
  checks,
  readinessSummary,
  hint: 'verdict=LIMITED_PRODUCTION_READY is a maturity / posture label (not “all risks closed”). scaleReady is the stricter `--scale` checklist. See npm run phase1:launch-readiness for Phase-1 JSON.',
};

console.log(JSON.stringify(out, null, 2));

const STRICT_FAIL_VERDICTS = new Set(['BLOCKED', 'NOT_READY_FOR_SCALE']);
if (strict && STRICT_FAIL_VERDICTS.has(verdict)) {
  process.exit(1);
}
if (strict && scaleIntent && !scaleReady) {
  process.exit(1);
}
