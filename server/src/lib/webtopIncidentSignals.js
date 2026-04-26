/**
 * Maps WebTopup monitoring inputs to structured incident signals for operators and runbooks.
 */

/** Total abuse blocks in-process above this → abuse_spike incident. */
const ABUSE_BLOCK_TOTAL_WARN = 20;
/** Any single abuse reason at or above this → abuse_spike. */
const ABUSE_SINGLE_REASON_WARN = 8;
/** Queued fulfillment jobs above batchSize * this factor → queue_backlog. */
const QUEUE_JOBS_BACKLOG_FACTOR = 4;
/** Financial guardrail blocks (process lifetime) above this → financial_guardrail_spike. */
const FINANCIAL_GUARDRAIL_WARN = 12;
/** Reconciliation mismatches (lifetime) ≥ this → reconciliation_incident. */
const RECON_MISMATCH_WARN = 1;
/** Minimum approximate SLA breach count to raise an incident. */
const SLA_BREACH_MIN = 1;

/**
 * @param {Record<string, unknown>} metrics
 * @param {{ staleProcessingCount: number; staleQueuedCount: number; queued?: number; processing?: number }} orderFulfillment
 * @param {Record<string, number>} jobsByStatus
 * @param {{ batchSize: number }} queueConfig
 * @returns {boolean}
 */
function isQueueBacklogElevated(metrics, orderFulfillment, jobsByStatus, queueConfig) {
  const q = Number(jobsByStatus.queued ?? 0);
  const batch = Math.max(1, Number(queueConfig.batchSize ?? 15));
  if (q >= QUEUE_JOBS_BACKLOG_FACTOR * batch) return true;
  const oq = Number(orderFulfillment.queued ?? 0);
  const op = Number(orderFulfillment.processing ?? 0);
  const sp = Number(orderFulfillment.staleProcessingCount ?? 0);
  const sq = Number(orderFulfillment.staleQueuedCount ?? 0);
  if (sp + sq >= Math.max(5, batch) && oq + op >= batch * 2) return true;
  void metrics;
  return false;
}

/**
 * @param {{
 *   evaluate: { severity: 'ok'|'warn'|'critical'; alerts: { id: string; severity: 'warn'|'critical'; message: string; detail?: Record<string, unknown> }[] };
 *   queueHealth: import('../services/topupFulfillment/webtopFulfillmentJob.js').getWebTopupFulfillmentQueueHealthSnapshot extends Promise<infer R> ? R : never;
 *   reloadlyDurableCircuit: { durableCircuitEnabled?: boolean; state?: string };
 *   slaPolicy: { aggregate?: { breachedApproximateCounts?: Record<string, number> } };
 *   abuseProtection: { blockCounts?: Record<string, number> };
 *   metricsSummary: Record<string, unknown>;
 *   metrics: Record<string, unknown>;
 * }} input
 * @returns {{ severity: 'ok'|'warn'|'critical'; incidents: { id: string; type: string; severity: 'warn'|'critical'; message: string; hint: string; detail?: Record<string, unknown> }[] }}
 */
export function getWebtopIncidentSignals(input) {
  const { evaluate, queueHealth, reloadlyDurableCircuit, slaPolicy, abuseProtection, metricsSummary, metrics } =
    input;

  /** @type {{ id: string; type: string; severity: 'warn'|'critical'; message: string; hint: string; detail?: Record<string, unknown> }[]} */
  const incidents = [];

  const hintForAlert = (alertId) => {
    switch (alertId) {
      case 'reloadly_durable_circuit_open':
        return 'Check Reloadly status, credentials, and sandbox/prod routing. Review provider-health; do not force-deliver until circuit recovers or risk is accepted.';
      case 'reloadly_durable_circuit_half_open':
        return 'Circuit is probing. Monitor provider-health; avoid bulk retries until stable.';
      case 'stale_processing_backlog':
        return 'Orders stuck in processing: consider recover_stale_fulfillment_jobs, then targeted retry_order after inspecting order status.';
      case 'stale_queued_backlog':
        return 'Queued orders exceed stale threshold: verify worker tick, queue backlog, and provider latency.';
      case 'dead_letter_jobs':
        return 'Jobs reached dead_letter after max attempts. Inspect queue-health and per-order status; use retry_order_force only with confirmation.';
      case 'fulfillment_failures_elevated':
        return 'Elevated fulfillment failures: check provider errors, circuit state, and financial guardrails.';
      case 'fallback_payment_recovery_activity':
        return 'Stripe fallback applied payments — webhook delivery may be delayed. Verify Stripe dashboard and webhook logs.';
      default:
        return 'Review monitoring metrics, queue-health, and recent durable logs for correlated errors.';
    }
  };

  const typeForAlert = (alertId) => {
    if (alertId.includes('circuit')) return 'provider_circuit';
    if (alertId.includes('fallback')) return 'payment_webhook_fallback';
    if (alertId.includes('stale_processing')) return 'fulfillment_stale_processing';
    if (alertId.includes('stale_queued')) return 'fulfillment_stale_queued';
    if (alertId.includes('dead_letter')) return 'fulfillment_dead_letter';
    if (alertId.includes('fulfillment_failures')) return 'fulfillment_failures';
    return 'system_health';
  };

  for (const a of evaluate.alerts) {
    incidents.push({
      id: a.id,
      type: typeForAlert(a.id),
      severity: a.severity,
      message: a.message,
      hint: hintForAlert(a.id),
      detail: a.detail,
    });
  }

  const breached = slaPolicy.aggregate?.breachedApproximateCounts ?? {};
  const bPay = Number(breached.paymentPendingTimeout ?? 0);
  const bPend = Number(breached.stalePendingAfterPayment ?? 0);
  const bQ = Number(breached.staleQueued ?? 0);
  const bP = Number(breached.staleProcessing ?? 0);
  if (bPay >= SLA_BREACH_MIN) {
    incidents.push({
      id: 'sla_breach_payment_pending',
      type: 'sla_breach',
      severity: 'warn',
      message: `Approximate count of orders breaching payment-pending SLA: ${bPay}`,
      hint: 'Investigate checkout abandonment vs webhook issues; use reconciliation views for sampled rows.',
      detail: { segment: 'payment_pending', count: bPay },
    });
  }
  if (bPend >= SLA_BREACH_MIN) {
    incidents.push({
      id: 'sla_breach_paid_pending',
      type: 'sla_breach',
      severity: 'warn',
      message: `Paid orders still pending fulfillment beyond SLA: ~${bPend}`,
      hint: 'Dispatch may be disabled or stuck; check fulfillment queue and provider circuit.',
      detail: { segment: 'paid_pending', count: bPend },
    });
  }
  if (bQ >= SLA_BREACH_MIN) {
    incidents.push({
      id: 'sla_breach_stale_queued',
      type: 'sla_breach',
      severity: 'critical',
      message: `Orders queued past SLA threshold: ~${bQ}`,
      hint: 'Prioritize worker health and recover_stale_fulfillment_jobs; then targeted retries.',
      detail: { segment: 'stale_queued', count: bQ },
    });
  }
  if (bP >= SLA_BREACH_MIN) {
    incidents.push({
      id: 'sla_breach_stale_processing',
      type: 'sla_breach',
      severity: 'critical',
      message: `Orders in processing past SLA: ~${bP}`,
      hint: 'Possible hung provider calls or lease issues; run recover_stale_fulfillment_jobs and inspect provider-health.',
      detail: { segment: 'stale_processing', count: bP },
    });
  }

  const blocks = abuseProtection.blockCounts ?? {};
  let abuseTotal = 0;
  let maxReason = '';
  let maxN = 0;
  for (const [k, v] of Object.entries(blocks)) {
    const n = Number(v ?? 0);
    abuseTotal += n;
    if (n > maxN) {
      maxN = n;
      maxReason = k;
    }
  }
  if (abuseTotal >= ABUSE_BLOCK_TOTAL_WARN || maxN >= ABUSE_SINGLE_REASON_WARN) {
    incidents.push({
      id: 'abuse_blocked_spike',
      type: 'abuse_rate',
      severity: abuseTotal >= ABUSE_BLOCK_TOTAL_WARN * 2 || maxN >= ABUSE_SINGLE_REASON_WARN * 2 ? 'critical' : 'warn',
      message: `Abuse blocks elevated (total=${abuseTotal}${maxReason ? `, maxReason=${maxReason}(${maxN})` : ''})`,
      hint: 'Check for attack or misconfiguration; tune thresholds only after confirming legitimate traffic.',
      detail: { abuseTotal, maxReason, maxN },
    });
  }

  const fg = Number(metricsSummary.financialGuardrailBlocks ?? 0);
  if (fg >= FINANCIAL_GUARDRAIL_WARN) {
    incidents.push({
      id: 'financial_guardrail_spike',
      type: 'financial_protection',
      severity: 'warn',
      message: `Financial guardrail blocks (lifetime counter): ${fg}`,
      hint: 'Review amount/currency/cap configuration and contradictory payment/fulfillment rows.',
      detail: { financialGuardrailBlocks: fg },
    });
  }

  const rm = Number(metricsSummary.reconciliationMismatches ?? metrics.reconciliation_mismatch_detected ?? 0);
  if (rm >= RECON_MISMATCH_WARN) {
    incidents.push({
      id: 'reconciliation_mismatch',
      type: 'financial_protection',
      severity: 'warn',
      message: `Reconciliation mismatch events detected: ${rm}`,
      hint: 'Run single-order reconciliation for affected ids; avoid bulk DB updates.',
      detail: { reconciliationMismatches: rm },
    });
  }

  if (
    isQueueBacklogElevated(
      metrics,
      queueHealth.orderFulfillment,
      queueHealth.jobsByStatus,
      queueHealth.config,
    )
  ) {
    incidents.push({
      id: 'fulfillment_queue_backlog',
      type: 'fulfillment_queue',
      severity: 'warn',
      message: 'Fulfillment job queue backlog or correlated stale counts are elevated',
      hint: 'Scale workers or reduce batch contention; recover stale jobs before bulk retries.',
      detail: {
        jobsQueued: queueHealth.jobsByStatus?.queued,
        batchSize: queueHealth.config?.batchSize,
      },
    });
  }

  let severity = /** @type {'ok'|'warn'|'critical'} */ (evaluate.severity);
  for (const inc of incidents) {
    if (inc.severity === 'critical') severity = 'critical';
    else if (inc.severity === 'warn' && severity === 'ok') severity = 'warn';
  }

  const dedupe = new Map();
  for (const inc of incidents) {
    const key = `${inc.id}:${inc.message}`;
    if (!dedupe.has(key)) dedupe.set(key, inc);
  }

  return { severity, incidents: [...dedupe.values()] };
}
