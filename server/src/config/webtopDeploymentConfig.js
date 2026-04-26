/**
 * WebTopup deployment discipline: validation + sanitized runtime snapshot (no secrets).
 */
import { basename } from 'node:path';

import { env } from './env.js';
import {
  collectWebtopConfigValidationIssues,
  WEBTOP_CONFIG_VALIDATION,
} from './webtopConfig.js';
import { getWebtopSlaThresholds } from '../lib/webtopSlaPolicy.js';
import { webTopupLog } from '../lib/webTopupObservability.js';
import { isAdminIpAllowlistActive } from '../middleware/adminIpAllowlist.js';

/**
 * Pure validation for tests and startup (pass an env-shaped object with WebTopup fields).
 * @param {typeof env} e
 * @returns {{ errors: string[]; warnings: string[] }}
 */
export function collectWebTopupDeploymentValidationIssuesFromEnv(e) {
  return collectWebtopConfigValidationIssues(e);
}

/**
 * @returns {{ errors: string[]; warnings: string[] }}
 */
export function collectWebTopupDeploymentValidationIssues() {
  return collectWebtopConfigValidationIssues(env);
}

/**
 * Operator-focused config snapshot (no secrets). For detailed deployment fields see {@link getWebTopupDeploymentSnapshot}.
 */
export function getWebtopConfigSnapshot() {
  const t = getWebtopSlaThresholds();
  const e = env;
  return {
    schemaVersion: 1,
    collectedAt: new Date().toISOString(),
    validationStatus: WEBTOP_CONFIG_VALIDATION.status,
    flags: {
      slaEnforcementEnabled: e.webtopSlaEnforcementEnabled,
      stripeFallbackEnabled: e.webtopupStripeFallbackEnabled,
      durableLogEnabled: e.webtopupDurableLogEnabled,
      uxPublicFieldsEnabled: e.webtopupUxPublicFieldsEnabled,
      adminIpAllowlistEnabled: isAdminIpAllowlistActive(),
      /** Abuse limits are always enforced when middleware is mounted; thresholds come from config. */
      abuseProtectionEnabled: true,
      webtopupReliabilityEnabled: e.webtopupReliabilityEnabled,
      webtopupAutoRetryEnabled: e.webtopupAutoRetryEnabled,
      webtopupRecoveryEnqueue: e.webtopupRecoveryEnqueue,
      webtopupFulfillmentAsync: e.webtopupFulfillmentAsync,
      reloadlyDurableCircuitEnabled: e.webtopupReloadlyDurableCircuitEnabled,
      webtopupClientMarkPaidEnabled: e.webtopupClientMarkPaidEnabled,
    },
    thresholds: {
      sla: {
        paymentPendingMaxMs: t.paymentPendingMaxMs,
        paidToDeliveredMaxMs: t.paidToDeliveredMaxMs,
        warnRatio: t.warnRatio,
        paidToDeliveredWarnRatio: t.paidToDeliveredWarnRatio,
        enforcementProcessingGraceMs: e.webtopSlaEnforcementProcessingGraceMs,
      },
      reconcile: {
        paidStuckAfterMs: e.reconcilePaidStuckAfterMs,
        processingStuckAfterMs: e.reconcileProcessingStuckAfterMs,
        fulfillmentQueuedStuckAfterMs: e.reconcileFulfillmentQueuedStuckAfterMs,
        fulfillmentProcessingStuckAfterMs: e.reconcileFulfillmentProcessingStuckAfterMs,
      },
      abuse: {
        burstWindowMs: e.webtopupAbuseBurstWindowMs,
        burstMaxPerWindow: e.webtopupAbuseBurstMaxPerWindow,
        failedPaymentMaxBeforeBlock: e.webtopupAbuseFailedPaymentMaxBeforeBlock,
      },
      retry: {
        webtopupRetryMaxAttempts: e.webtopupRetryMaxAttempts,
        webtopupRetryBackoffEntries: e.webtopupRetryBackoffMs.length,
        webtopupAutoRetryMaxDispatchAttempts: e.webtopupAutoRetryMaxDispatchAttempts,
        webtopupAutoRetryBackoffEntries: e.webtopupAutoRetryBackoffMs.length,
      },
      circuit: {
        providerFailureThreshold: e.providerCircuitFailureThreshold,
        providerWindowMs: e.providerCircuitWindowMs,
        providerOpenMs: e.providerCircuitOpenMs,
        reloadlyDurableFailureThreshold: e.webtopupReloadlyCircuitFailureThreshold,
        reloadlyDurableWindowMs: e.webtopupReloadlyCircuitWindowMs,
      },
      monitoring: {
        staleProcessingWarn: e.webtopupMonitoringStaleProcessingWarnThreshold,
        staleQueuedWarn: e.webtopupMonitoringStaleQueuedWarnThreshold,
        fulfillmentFailureWarn: e.webtopupMonitoringFulfillmentFailureWarnThreshold,
        fallbackAppliedWarn: e.webtopupMonitoringFallbackAppliedWarnThreshold,
      },
    },
  };
}

/**
 * Fail fast in production when WebTopup numeric / safety config is broken.
 * Non-production: warn and continue (local dev flexibility).
 */
export function assertWebTopupDeploymentConfigOrExit() {
  if (process.env.NODE_ENV === 'test') return;

  const { errors, warnings } = collectWebtopConfigValidationIssues(env);
  for (const w of warnings) {
    console.warn('[webtopup-deployment]', w);
    webTopupLog(undefined, 'warn', 'config_validation_warning', { message: w });
  }

  if (!errors.length) return;

  const prod = env.nodeEnv === 'production';
  for (const msg of errors) {
    webTopupLog(undefined, 'error', 'config_validation_failed', { message: msg });
    if (prod) {
      console.error('[fatal webtopup-config]', msg);
    } else {
      console.warn('[webtopup-deployment] config error (non-production continues):', msg);
    }
  }
  if (prod) {
    process.exit(1);
  }
}

/**
 * Sanitized effective WebTopup config for operators (GET monitoring / support).
 * Never includes secrets, tokens, database URLs, or Stripe keys.
 */
export function getWebTopupDeploymentSnapshot() {
  const t = getWebtopSlaThresholds();
  const fb = String(env.webtopupFallbackProvider ?? '').trim();
  return {
    schemaVersion: 1,
    collectedAt: new Date().toISOString(),
    validationStatus: WEBTOP_CONFIG_VALIDATION.status,
    nodeEnv: env.nodeEnv,
    featureFlags: {
      uxPublicFieldsEnabled: env.webtopupUxPublicFieldsEnabled,
      slaEnforcementEnabled: env.webtopSlaEnforcementEnabled,
      webtopupClientMarkPaidEnabled: env.webtopupClientMarkPaidEnabled,
      webtopupStripeFallbackEnabled: env.webtopupStripeFallbackEnabled,
      webtopupDurableLogEnabled: env.webtopupDurableLogEnabled,
      webtopupAutoRetryEnabled: env.webtopupAutoRetryEnabled,
      webtopupReliabilityEnabled: env.webtopupReliabilityEnabled,
      webtopupFulfillmentAsync: env.webtopupFulfillmentAsync,
      reloadlyWebTopupProviderActive: env.reloadlyWebTopupProviderActive,
      webtopupRecoveryEnqueue: env.webtopupRecoveryEnqueue,
      prelaunchLockdown: env.prelaunchLockdown,
    },
    providers: {
      webTopupFulfillmentProvider: String(env.webTopupFulfillmentProvider ?? 'mock')
        .trim()
        .toLowerCase(),
      webtopupFallbackProvider: fb || null,
    },
    slaAndReconcileMs: {
      webtopSlaPaymentPendingMaxMs: t.paymentPendingMaxMs,
      webtopSlaPaidToDeliveredMaxMs: t.paidToDeliveredMaxMs,
      webtopSlaWarnRatio: t.warnRatio,
      webtopSlaPaidToDeliveredWarnRatio: t.paidToDeliveredWarnRatio,
      webtopSlaEnforcementProcessingGraceMs: env.webtopSlaEnforcementProcessingGraceMs,
      reconcilePaidStuckAfterMs: env.reconcilePaidStuckAfterMs,
      reconcileFulfillmentQueuedStuckAfterMs: env.reconcileFulfillmentQueuedStuckAfterMs,
      reconcileFulfillmentProcessingStuckAfterMs: env.reconcileFulfillmentProcessingStuckAfterMs,
      reconcileProcessingStuckAfterMs: env.reconcileProcessingStuckAfterMs,
    },
    fulfillmentJobs: {
      webtopupFulfillmentJobPollMs: env.webtopupFulfillmentJobPollMs,
      webtopupFulfillmentJobBatchSize: env.webtopupFulfillmentJobBatchSize,
      webtopupFulfillmentJobLeaseMs: env.webtopupFulfillmentJobLeaseMs,
      webtopupFulfillmentStaleQueuedOrderMs: env.webtopupFulfillmentStaleQueuedOrderMs,
      webtopupFulfillmentStaleProcessingOrderMs: env.webtopupFulfillmentStaleProcessingOrderMs,
    },
    retry: {
      webtopupAutoRetryMaxDispatchAttempts: env.webtopupAutoRetryMaxDispatchAttempts,
      webtopupAutoRetryBackoffEntries: env.webtopupAutoRetryBackoffMs.length,
      webtopupRetryMaxAttempts: env.webtopupRetryMaxAttempts,
    },
    reliability: {
      webtopupRetryBackoffMsLength: env.webtopupRetryBackoffMs.length,
    },
    abuse: {
      webtopupAbuseBurstWindowMs: env.webtopupAbuseBurstWindowMs,
      webtopupAbuseBurstMaxPerWindow: env.webtopupAbuseBurstMaxPerWindow,
      webtopupAbusePiChurnWindowMs: env.webtopupAbusePiChurnWindowMs,
      webtopupAbusePiChurnMaxPerWindow: env.webtopupAbusePiChurnMaxPerWindow,
      webtopupAbuseFailedPaymentWindowMs: env.webtopupAbuseFailedPaymentWindowMs,
      webtopupAbuseFailedPaymentMaxBeforeBlock: env.webtopupAbuseFailedPaymentMaxBeforeBlock,
    },
    monitoringAlertThresholds: {
      webtopupMonitoringStaleProcessingWarnThreshold:
        env.webtopupMonitoringStaleProcessingWarnThreshold,
      webtopupMonitoringStaleQueuedWarnThreshold:
        env.webtopupMonitoringStaleQueuedWarnThreshold,
      webtopupMonitoringFulfillmentFailureWarnThreshold:
        env.webtopupMonitoringFulfillmentFailureWarnThreshold,
      webtopupMonitoringFallbackAppliedWarnThreshold:
        env.webtopupMonitoringFallbackAppliedWarnThreshold,
    },
    stripeFallback: {
      webtopupStripeFallbackDelayMs: env.webtopupStripeFallbackDelayMs,
    },
    durableLog: {
      enabled: env.webtopupDurableLogEnabled,
      pathBasename: env.webtopupDurableLogPath
        ? basename(String(env.webtopupDurableLogPath))
        : null,
      maxBytes: env.webtopupDurableLogMaxBytes,
    },
    validationNote:
      'Secrets, DB connection strings, Stripe keys, and admin tokens are never included. UX copy is code-driven; uxPublicFieldsEnabled only toggles extra API fields.',
  };
}
