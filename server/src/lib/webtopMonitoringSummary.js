/**
 * Operator-facing WebTopup monitoring: in-process metrics + DB queue health + durable circuit + alert severity.
 */

import { env } from '../config/env.js';
import { getWebTopupMetricsSnapshot } from './webTopupObservability.js';
import { getReloadlyWebtopupDurableCircuitAdminSnapshot } from '../services/reliability/reloadlyWebtopupDurableCircuit.js';
import { getWebTopupFulfillmentQueueHealthSnapshot } from '../services/topupFulfillment/webtopFulfillmentJob.js';
import { getWebtopDurableLogConfigSnapshot } from './webtopDurableLogSink.js';
import { getAdminSecuritySnapshot } from './adminSecuritySnapshot.js';
import { getWebtopAbuseProtectionSnapshot } from '../middleware/webtopAbuseProtection.js';
import {
  getWebtopSlaAggregateSnapshot,
  getWebtopSlaThresholds,
} from './webtopSlaPolicy.js';
import {
  getWebtopConfigSnapshot,
  getWebTopupDeploymentSnapshot,
} from '../config/webtopDeploymentConfig.js';
import { getWebtopIncidentSignals } from './webtopIncidentSignals.js';
import { diagnoseWebtopIncident } from './webtopIncidentDiagnosis.js';
import { buildIncidentRunbookPayload } from './webtopIncidentRunbook.js';
import { webTopupLog } from './webTopupObservability.js';
import { getWebtopResourceSnapshot } from './webtopResourceSnapshot.js';

/**
 * Pure evaluation for tests and deterministic alert logic.
 * @param {{
 *   metrics: Record<string, unknown>;
 *   queue: Awaited<ReturnType<typeof getWebTopupFulfillmentQueueHealthSnapshot>>;
 *   durableCircuit: Awaited<ReturnType<typeof getReloadlyWebtopupDurableCircuitAdminSnapshot>>;
 *   thresholds: {
 *     staleProcessingWarn: number;
 *     staleQueuedWarn: number;
 *     fulfillmentFailureWarn: number;
 *     fallbackAppliedWarn: number;
 *   };
 * }} input
 */
export function evaluateWebTopupMonitoringHealth(input) {
  const { metrics, queue, durableCircuit, thresholds } = input;
  /** @type {{ id: string; severity: 'warn' | 'critical'; message: string; detail?: Record<string, unknown> }[]} */
  const alerts = [];
  let severity = /** @type {'ok' | 'warn' | 'critical'} */ ('ok');

  const bump = (sev, id, message, detail) => {
    alerts.push(detail ? { id, severity: sev, message, detail } : { id, severity: sev, message });
    if (sev === 'critical') severity = 'critical';
    else if (sev === 'warn' && severity === 'ok') severity = 'warn';
  };

  if (durableCircuit.durableCircuitEnabled && durableCircuit.state === 'open') {
    bump('critical', 'reloadly_durable_circuit_open', 'Reloadly durable circuit is OPEN (provider calls gated)');
  } else if (durableCircuit.durableCircuitEnabled && durableCircuit.state === 'half_open') {
    bump('warn', 'reloadly_durable_circuit_half_open', 'Reloadly durable circuit is half-open (probe phase)');
  }

  const staleProc = queue.orderFulfillment.staleProcessingCount;
  if (staleProc >= thresholds.staleProcessingWarn) {
    bump('warn', 'stale_processing_backlog', 'Orders stuck in processing past stale threshold', {
      staleProcessingCount: staleProc,
    });
  }

  const staleQueued = queue.orderFulfillment.staleQueuedCount;
  if (staleQueued >= thresholds.staleQueuedWarn) {
    bump('warn', 'stale_queued_backlog', 'Orders queued past stale threshold', {
      staleQueuedCount: staleQueued,
    });
  }

  const dl = queue.jobsByStatus.dead_letter ?? 0;
  if (dl > 0) {
    bump('warn', 'dead_letter_jobs', 'One or more fulfillment jobs are in dead_letter status', {
      deadLetterCount: dl,
    });
  }

  const ff =
    Number(metrics.fulfillment_failed_retryable ?? 0) +
    Number(metrics.fulfillment_failed_terminal ?? 0);
  if (ff >= thresholds.fulfillmentFailureWarn) {
    bump('warn', 'fulfillment_failures_elevated', 'Fulfillment failure events reached warn threshold (process lifetime)', {
      fulfillmentFailedRetryable: Number(metrics.fulfillment_failed_retryable ?? 0),
      fulfillmentFailedTerminal: Number(metrics.fulfillment_failed_terminal ?? 0),
    });
  }

  const fbApplied = Number(metrics.fallback_payment_applied ?? 0);
  if (fbApplied >= thresholds.fallbackAppliedWarn) {
    bump(
      'warn',
      'fallback_payment_recovery_activity',
      'Stripe fallback poller applied payments — verify webhook delivery health',
      { fallbackPaymentApplied: fbApplied },
    );
  }

  return { severity, alerts };
}

/**
 * Full monitoring snapshot for GET /api/admin/webtopup/monitoring.
 */
export async function getWebTopupMonitoringSnapshot() {
  const metrics = getWebTopupMetricsSnapshot();
  const queue = await getWebTopupFulfillmentQueueHealthSnapshot();
  const slaAggregate = await getWebtopSlaAggregateSnapshot();
  const durableCircuit = await getReloadlyWebtopupDurableCircuitAdminSnapshot();
  const abuseProtection = getWebtopAbuseProtectionSnapshot();

  const thresholds = {
    staleProcessingWarn: env.webtopupMonitoringStaleProcessingWarnThreshold,
    staleQueuedWarn: env.webtopupMonitoringStaleQueuedWarnThreshold,
    fulfillmentFailureWarn: env.webtopupMonitoringFulfillmentFailureWarnThreshold,
    fallbackAppliedWarn: env.webtopupMonitoringFallbackAppliedWarnThreshold,
  };

  const evaluate = evaluateWebTopupMonitoringHealth({
    metrics,
    queue,
    durableCircuit,
    thresholds,
  });
  const { severity, alerts } = evaluate;

  const configSnapshot = getWebtopConfigSnapshot();

  const incidentSignals = getWebtopIncidentSignals({
    evaluate,
    queueHealth: queue,
    reloadlyDurableCircuit: durableCircuit,
    slaPolicy: { aggregate: slaAggregate, thresholds: getWebtopSlaThresholds() },
    abuseProtection,
    metricsSummary: {
      paymentsReceived: Number(metrics.payment_received ?? 0),
      fulfillmentSucceeded: Number(metrics.fulfillment_succeeded ?? 0),
      fulfillmentFailedRetryable: Number(metrics.fulfillment_failed_retryable ?? 0),
      fulfillmentFailedTerminal: Number(metrics.fulfillment_failed_terminal ?? 0),
      financialGuardrailBlocks: Number(metrics.financial_guardrail_blocked ?? 0),
      reconciliationMismatches: Number(metrics.reconciliation_mismatch_detected ?? 0),
    },
    metrics,
  });

  if (incidentSignals.incidents.length > 0) {
    try {
      webTopupLog(undefined, 'warn', 'incident_detected', {
        severity: incidentSignals.severity,
        incidentIds: incidentSignals.incidents.map((i) => i.id),
        incidentTypes: [...new Set(incidentSignals.incidents.map((i) => i.type))],
      });
    } catch {
      /* never fail monitoring on observability sink */
    }
  }

  const resourceSnapshot = await getWebtopResourceSnapshot(queue);

  const incidentRunbookBase = buildIncidentRunbookPayload({ incidentSignals });
  const diagnosis = diagnoseWebtopIncident({
    incidentSignals,
    configSnapshot,
    orderId: null,
  });
  if (incidentRunbookBase.suggestedActions.length > 0) {
    try {
      webTopupLog(undefined, 'info', 'incident_action_suggested', {
        actionIds: incidentRunbookBase.suggestedActions.map((a) => a.id),
        incidentSeverity: incidentSignals.severity,
      });
    } catch {
      /* never fail monitoring on observability sink */
    }
  }

  const metricsSummary = {
    paymentsReceived: Number(metrics.payment_received ?? 0),
    fulfillmentSucceeded: Number(metrics.fulfillment_succeeded ?? 0),
    fulfillmentFailedRetryable: Number(metrics.fulfillment_failed_retryable ?? 0),
    fulfillmentFailedTerminal: Number(metrics.fulfillment_failed_terminal ?? 0),
    retriesScheduled: Number(metrics.fulfillment_retry_scheduled ?? 0),
    circuitOpenEvents: Number(metrics.provider_circuit_opened ?? 0),
    circuitHalfOpenEvents: Number(metrics.provider_circuit_half_open ?? 0),
    providerCallsBlockedByCircuit: Number(metrics.provider_call_blocked_by_circuit ?? 0),
    financialGuardrailBlocks: Number(metrics.financial_guardrail_blocked ?? 0),
    reconciliationMismatches: Number(metrics.reconciliation_mismatch_detected ?? 0),
    fallbackPaymentDetected: Number(metrics.fallback_payment_detected ?? 0),
    fallbackPaymentApplied: Number(metrics.fallback_payment_applied ?? 0),
  };

  let rollupSeverity = severity;
  if (incidentSignals.severity === 'critical') rollupSeverity = 'critical';
  else if (incidentSignals.severity === 'warn' && rollupSeverity === 'ok') {
    rollupSeverity = 'warn';
  }

  return {
    ok: true,
    collectedAt: new Date().toISOString(),
    severity: rollupSeverity,
    alerts,
    /** Flattened resource hints for dashboards / Phase 13 ops (full detail in `resourceSnapshot`). */
    dbConnections:
      resourceSnapshot.database &&
      typeof resourceSnapshot.database === 'object' &&
      'connectionsTotal' in resourceSnapshot.database &&
      typeof resourceSnapshot.database.connectionsTotal === 'number'
        ? resourceSnapshot.database.connectionsTotal
        : null,
    queueDepth: resourceSnapshot.queueDepth,
    workerActivity: resourceSnapshot.workerActivity,
    memoryUsage: resourceSnapshot.process?.memoryUsage ?? null,
    resourceSnapshot,
    config: {
      webtopup: configSnapshot,
    },
    durableLog: getWebtopDurableLogConfigSnapshot(),
    adminSecurity: getAdminSecuritySnapshot(),
    abuseProtection,
    slaPolicy: {
      thresholds: getWebtopSlaThresholds(),
      aggregate: slaAggregate,
      enforcementEnabled: env.webtopSlaEnforcementEnabled,
    },
    webtopDeployment: getWebTopupDeploymentSnapshot(),
    metricsSummary,
    metrics,
    queueHealth: queue,
    reloadlyDurableCircuit: durableCircuit,
    thresholds,
    incidentSignals,
    incidentRunbook: {
      ...incidentRunbookBase,
      diagnosis,
    },
  };
}
