import { env } from '../../config/env.js';
import { OPERATOR_SEVERITY_POLICY_REFERENCE } from './failureSeverity.js';
import { getAllSharedCircuitSnapshots } from './circuitBreaker.js';
import { getRetryEngineStats } from './retryEngine.js';

/**
 * Deterministic operator-facing posture from circuits + retry stats + recent decision window.
 * @param {object} input
 * @param {Record<string, { state?: string }>} input.circuits
 * @param {{ totalRetryAttempts?: number }} input.retries
 * @param {Record<string, number>} input.decisionOutcomeRollup
 * @param {Record<string, number>} input.decisionSeverityRollup
 * @param {number | null} input.avgMs
 * @param {'elevated' | 'watch' | 'normal'} input.retrySpike
 */
export function computeOperatorReadiness(input) {
  const {
    circuits = {},
    retries = {},
    decisionOutcomeRollup = {},
    decisionSeverityRollup = {},
    avgMs = null,
    retrySpike = 'normal',
  } = input;

  const circuitEntries = Object.entries(circuits);
  const anyCircuitOpen = circuitEntries.some(([, s]) => s?.state === 'OPEN');
  const anyCircuitHalfOpen =
    !anyCircuitOpen && circuitEntries.some(([, s]) => s?.state === 'HALF_OPEN');

  const reviewCount = decisionSeverityRollup.high_requires_review ?? 0;
  const exhausted = decisionOutcomeRollup.retry_exhausted ?? 0;
  const totalRetries = retries.totalRetryAttempts ?? 0;

  /** @type {string[]} */
  const factors = [];
  /** @type {'blocked' | 'partially_blocked' | 'degraded' | 'review_heavy' | 'recovering' | 'healthy'} */
  let posture = 'healthy';
  let narrative =
    'Reliability signals are nominal within the sampled window (circuits, retries, recent decisions).';

  if (anyCircuitOpen) {
    posture = 'blocked';
    factors.push('circuit_open');
    narrative =
      'One or more shared circuits are OPEN; mutating outbound calls are denied until the breaker cools down.';
  } else if (anyCircuitHalfOpen) {
    posture = 'partially_blocked';
    factors.push('circuit_half_open');
    narrative =
      'Circuit(s) are in HALF_OPEN probe mode; only limited traffic is admitted until health is proven.';
  } else if (
    retrySpike === 'elevated' ||
    (typeof avgMs === 'number' && avgMs > 15_000)
  ) {
    posture = 'degraded';
    if (retrySpike === 'elevated') factors.push('retry_spike_elevated');
    if (typeof avgMs === 'number' && avgMs > 15_000) factors.push('latency_high');
    narrative =
      'Elevated retries or measured latency — upstream or capacity may be impaired; watch exhaustion and circuits.';
  } else if (reviewCount >= 3) {
    posture = 'review_heavy';
    factors.push('high_requires_review_window');
    narrative =
      'Several recent decisions classified as high_requires_review — expect manual queue / reconciliation pressure.';
  } else if (retrySpike === 'watch' && exhausted >= 1) {
    posture = 'recovering';
    factors.push('retry_exhausted_recent');
    narrative =
      'Moderate retry volume with recent exhaustion events — backlog may be clearing; confirm queues and recovery jobs.';
  }

  return {
    posture,
    factors,
    narrative,
    counters: {
      totalRetryAttempts: totalRetries,
      retryExhaustedInWindow: exhausted,
      highRequiresReviewInWindow: reviewCount,
    },
  };
}

/** @type {Array<{ at: number; providerId: string; ms: number }>} */
const latencySamples = [];
const MAX_LATENCY_SAMPLES = 200;

/** @type {Array<Record<string, unknown>>} */
const orchestratorDecisions = [];
const MAX_ORCHESTRATOR_DECISIONS = 120;

/**
 * Ring buffer of recent orchestrator outcomes (safe fields only — no secrets).
 * @param {Record<string, unknown>} payload
 */
export function recordReliabilityDecision(payload) {
  orchestratorDecisions.push({
    at: new Date().toISOString(),
    t: Date.now(),
    ...payload,
  });
  while (orchestratorDecisions.length > MAX_ORCHESTRATOR_DECISIONS) {
    orchestratorDecisions.shift();
  }
}

export function getRecentReliabilityDecisions() {
  return [...orchestratorDecisions];
}

/**
 * @param {string} providerId
 * @param {number} ms
 */
export function recordProviderLatencySample(providerId, ms) {
  latencySamples.push({
    at: Date.now(),
    providerId: String(providerId),
    ms: Math.max(0, ms),
  });
  while (latencySamples.length > MAX_LATENCY_SAMPLES) {
    latencySamples.shift();
  }
}

/**
 * Structured observability for the reliability subsystem (circuits, retries, recent latency).
 */
export function getReliabilityWatchdogSnapshot() {
  const retries = getRetryEngineStats();
  const circuits = getAllSharedCircuitSnapshots();
  const recent = latencySamples.slice(-40);
  let sum = 0;
  for (const s of recent) sum += s.ms;
  const avgMs = recent.length ? sum / recent.length : null;

  /** @type {Array<{ type: string; detail: string }>} */
  const alerts = [];
  for (const [name, snap] of Object.entries(circuits)) {
    if (snap.state === 'OPEN') {
      alerts.push({ type: 'circuit_open', detail: name });
    }
  }
  if (retries.totalRetryAttempts > 1000) {
    alerts.push({ type: 'retry_volume_high', detail: String(retries.totalRetryAttempts) });
  }
  if (avgMs != null && avgMs > 15_000) {
    alerts.push({ type: 'latency_degraded', detail: avgMs.toFixed(0) });
  }

  const decisionWindow = orchestratorDecisions.slice(-80);
  /** @type {Record<string, number>} */
  const decisionOutcomeRollup = {};
  /** @type {Record<string, number>} */
  const decisionSeverityRollup = {};
  for (const d of decisionWindow) {
    const o = d && typeof d === 'object' ? String(/** @type {{ outcome?: string }} */ (d).outcome ?? '') : '';
    if (o) {
      decisionOutcomeRollup[o] = (decisionOutcomeRollup[o] ?? 0) + 1;
    }
    const sev =
      d && typeof d === 'object'
        ? String(/** @type {{ failureSeverity?: string }} */ (d).failureSeverity ?? '')
        : '';
    if (sev) {
      decisionSeverityRollup[sev] = (decisionSeverityRollup[sev] ?? 0) + 1;
    }
  }
  const retrySpike =
    retries.totalRetryAttempts > 500
      ? 'elevated'
      : retries.totalRetryAttempts > 100
        ? 'watch'
        : 'normal';

  const circuitSnaps = getAllSharedCircuitSnapshots();
  const anyCircuitOpen = Object.values(circuitSnaps).some((s) => s?.state === 'OPEN');

  const operatorReadiness = computeOperatorReadiness({
    circuits: circuitSnaps,
    retries,
    decisionOutcomeRollup,
    decisionSeverityRollup,
    avgMs,
    retrySpike,
  });

  return {
    circuits,
    retries,
    latency: {
      sampleCount: recent.length,
      avgMsLastN: avgMs,
    },
    orchestratorDecisionsRecent: orchestratorDecisions.slice(-25),
    operatorSeverityPolicyReference: OPERATOR_SEVERITY_POLICY_REFERENCE,
    decisionIntelligence: {
      windowSize: decisionWindow.length,
      outcomeRollup: decisionOutcomeRollup,
      severityRollup: decisionSeverityRollup,
      retrySpike,
      webtopupRecoveryEnqueueEnabled: env.webtopupRecoveryEnqueue === true,
      fulfillmentQueueName: 'phase1-fulfillment-v1',
      /** Legacy tri-state hint; prefer `operatorReadiness` for posture + narrative. */
      readinessHint:
        anyCircuitOpen
          ? 'circuit_open'
          : retrySpike === 'elevated'
            ? 'retry_spike'
            : 'nominal',
      operatorReadiness,
      phase1QueueObservation:
        'GET /ready includes phase1FulfillmentQueue when REDIS_URL is set (one-shot BullMQ probe)',
    },
    alerts,
    collectedAt: new Date().toISOString(),
  };
}

/**
 * Evaluate alerts (for cron / ops hooks). Does not mutate circuits.
 */
export function evaluateReliabilityAnomalies() {
  return getReliabilityWatchdogSnapshot().alerts;
}
