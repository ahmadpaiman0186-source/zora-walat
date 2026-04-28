/**
 * Phase 1 structured observability — JSON lines with safe identifiers only.
 * Never log Stripe secrets, webhook secrets, Reloadly credentials, full PANs, or raw phones.
 */

import { safeSuffix } from '../../lib/webTopupObservability.js';
import {
  reportPhase1CriticalAlert,
  PHASE1_CRITICAL_ALERT_TYPE,
} from './phase1CriticalAlertHooks.js';
import {
  sanitizePhase1ObservabilityFields,
} from './phase1ObservabilitySanitize.js';

export {
  sanitizePhase1ObservabilityValue,
  sanitizePhase1ObservabilityFields,
} from './phase1ObservabilitySanitize.js';

export const PHASE1_OBSERVABILITY_SCHEMA_VERSION = 1;

/** Canonical grep-friendly event names (`phase1.` prefix). */
export const PHASE1_OBSERVABILITY_EVENT = Object.freeze({
  PAYMENT_SUCCEEDED: 'phase1.payment_succeeded',
  FULFILLMENT_QUEUED: 'phase1.fulfillment_queued',
  FULFILLMENT_ATTEMPTED: 'phase1.fulfillment_attempted',
  FULFILLMENT_SUCCEEDED: 'phase1.fulfillment_succeeded',
  FULFILLMENT_FAILED: 'phase1.fulfillment_failed',
  RETRY_SCHEDULED: 'phase1.retry_scheduled',
  RETRY_DENIED: 'phase1.retry_denied',
  RECONCILIATION_ALIGNED: 'phase1.reconciliation_aligned',
  RECONCILIATION_DRIFT_DETECTED: 'phase1.reconciliation_drift_detected',
  DUPLICATE_FULFILLMENT_BLOCKED: 'phase1.duplicate_fulfillment_blocked',
});

/**
 * @param {string} eventName — use `PHASE1_OBSERVABILITY_EVENT`
 * @param {Record<string, unknown>} fields — safe business fields only
 */
export function emitPhase1ObservabilityEvent(eventName, fields = {}) {
  const safe = sanitizePhase1ObservabilityFields({
    ...fields,
    event: eventName,
  });
  const { event: _ignoredEvent, ...rest } = safe;
  const line = {
    phase1Observability: true,
    schemaVersion: PHASE1_OBSERVABILITY_SCHEMA_VERSION,
    event: eventName,
    t: new Date().toISOString(),
    ...rest,
  };
  console.log(JSON.stringify(line));
}

/**
 * @param {{ id?: string | null, stripePaymentIntentId?: string | null }} orderLike
 * @param {{ id?: string | null } | null | undefined} [attemptLike]
 */
export function buildPhase1SafeRefs(orderLike, attemptLike = null) {
  const oid = orderLike?.id != null ? String(orderLike.id) : '';
  const pi = orderLike?.stripePaymentIntentId != null ? String(orderLike.stripePaymentIntentId) : '';
  const aid = attemptLike?.id != null ? String(attemptLike.id) : '';
  return {
    orderIdSuffix: oid ? safeSuffix(oid, 12) : null,
    paymentCheckoutIdSuffix: oid ? safeSuffix(oid, 12) : null,
    paymentIntentIdSuffix: pi.startsWith('pi_') ? safeSuffix(pi, 12) : null,
    fulfillmentAttemptIdSuffix: aid ? safeSuffix(aid, 12) : null,
  };
}

/**
 * @param {Record<string, unknown>} orderLike
 * @param {Record<string, unknown>} [extra]
 */
export function emitPhase1PaymentSucceeded(orderLike, extra = {}) {
  const refs = buildPhase1SafeRefs(orderLike);
  emitPhase1ObservabilityEvent(PHASE1_OBSERVABILITY_EVENT.PAYMENT_SUCCEEDED, {
    ...refs,
    status: orderLike.orderStatus ?? orderLike.status ?? null,
    ...sanitizePhase1ObservabilityFields(extra),
  });
}

/**
 * @param {Record<string, unknown>} orderLike
 * @param {Record<string, unknown> | null} [attemptLike]
 * @param {Record<string, unknown>} [extra]
 */
export function emitPhase1FulfillmentQueued(orderLike, attemptLike = null, extra = {}) {
  const refs = buildPhase1SafeRefs(orderLike, attemptLike);
  emitPhase1ObservabilityEvent(PHASE1_OBSERVABILITY_EVENT.FULFILLMENT_QUEUED, {
    ...refs,
    provider: extra.provider ?? attemptLike?.provider ?? null,
    status: attemptLike?.status ?? extra.status ?? null,
    ...sanitizePhase1ObservabilityFields(extra),
  });
}

/**
 * @param {Record<string, unknown>} orderLike
 * @param {Record<string, unknown>} [extra]
 */
export function emitPhase1FulfillmentAttempted(orderLike, extra = {}) {
  const refs = buildPhase1SafeRefs(orderLike);
  emitPhase1ObservabilityEvent(PHASE1_OBSERVABILITY_EVENT.FULFILLMENT_ATTEMPTED, {
    ...refs,
    provider: extra.provider ?? null,
    ...sanitizePhase1ObservabilityFields(extra),
  });
}

/**
 * @param {Record<string, unknown>} orderLike
 * @param {Record<string, unknown>} [extra]
 */
export function emitPhase1FulfillmentSucceeded(orderLike, extra = {}) {
  const refs = buildPhase1SafeRefs(orderLike);
  emitPhase1ObservabilityEvent(PHASE1_OBSERVABILITY_EVENT.FULFILLMENT_SUCCEEDED, {
    ...refs,
    provider: extra.provider ?? null,
    ...sanitizePhase1ObservabilityFields(extra),
  });
}

/**
 * @param {Record<string, unknown>} orderLike
 * @param {Record<string, unknown>} [extra]
 * @param {Record<string, unknown> | null} [attemptLike]
 */
export function emitPhase1FulfillmentFailed(orderLike, extra = {}, attemptLike = null) {
  const refs = buildPhase1SafeRefs(orderLike, attemptLike);
  emitPhase1ObservabilityEvent(PHASE1_OBSERVABILITY_EVENT.FULFILLMENT_FAILED, {
    ...refs,
    provider: extra.provider ?? null,
    errorCode: extra.errorCode ?? null,
    ...sanitizePhase1ObservabilityFields(extra),
  });
}

/**
 * @param {{ allowed: boolean, denial?: string, nextAttemptNumber?: number, detail?: unknown }} evaluation
 * @param {Record<string, unknown>} [refs]
 */
export function emitPhase1RetryObservation(evaluation, refs = {}) {
  const safeRefs = sanitizePhase1ObservabilityFields(refs);
  const retryDecision = {
    allowed: evaluation.allowed === true,
    denial: evaluation.allowed ? null : evaluation.denial ?? null,
    nextAttemptNumber:
      evaluation.allowed && 'nextAttemptNumber' in evaluation
        ? evaluation.nextAttemptNumber
        : null,
    detail: evaluation.allowed ? null : evaluation.detail ?? null,
  };
  if (evaluation.allowed) {
    emitPhase1ObservabilityEvent(PHASE1_OBSERVABILITY_EVENT.RETRY_SCHEDULED, {
      ...safeRefs,
      retryDecision,
    });
  } else {
    emitPhase1ObservabilityEvent(PHASE1_OBSERVABILITY_EVENT.RETRY_DENIED, {
      ...safeRefs,
      retryDecision,
    });
  }
}

/**
 * Read-only reconciliation observation + optional critical alert on drift.
 *
 * @param {{ aligned: boolean, driftCodes?: string[], compoundOk?: boolean }} snapshot
 * @param {Record<string, unknown>} [refs]
 */
export function finalizePhase1ReconciliationObservation(snapshot, refs = {}) {
  const safeRefs = sanitizePhase1ObservabilityFields(refs);
  const driftCodes = Array.isArray(snapshot.driftCodes)
    ? snapshot.driftCodes.map((x) => String(x))
    : [];
  if (snapshot.aligned) {
    emitPhase1ObservabilityEvent(PHASE1_OBSERVABILITY_EVENT.RECONCILIATION_ALIGNED, {
      ...safeRefs,
      driftCodes: [],
      compoundOk: snapshot.compoundOk === true,
    });
    return;
  }
  emitPhase1ObservabilityEvent(PHASE1_OBSERVABILITY_EVENT.RECONCILIATION_DRIFT_DETECTED, {
    ...safeRefs,
    driftCodes,
    compoundOk: snapshot.compoundOk === true,
  });
  reportPhase1CriticalAlert(PHASE1_CRITICAL_ALERT_TYPE.RECONCILIATION_DRIFT_DETECTED, {
    ...safeRefs,
    driftCodes,
  });
}

/**
 * @param {Record<string, unknown>} refs
 * @param {Record<string, unknown>} [extra]
 */
export function emitPhase1DuplicateFulfillmentBlocked(refs, extra = {}) {
  emitPhase1ObservabilityEvent(PHASE1_OBSERVABILITY_EVENT.DUPLICATE_FULFILLMENT_BLOCKED, {
    ...sanitizePhase1ObservabilityFields(refs),
    ...sanitizePhase1ObservabilityFields(extra),
  });
  reportPhase1CriticalAlert(PHASE1_CRITICAL_ALERT_TYPE.DUPLICATE_FULFILLMENT_BLOCKED, {
    ...sanitizePhase1ObservabilityFields(refs),
    ...sanitizePhase1ObservabilityFields(extra),
  });
}

/**
 * Charge succeeded at Stripe but fulfillment path marked terminal failure (safe correlation only).
 *
 * @param {Record<string, unknown>} refs
 * @param {Record<string, unknown>} [extra]
 */
export function emitPhase1PaymentSucceededButFulfillmentFailedAlert(refs, extra = {}) {
  reportPhase1CriticalAlert(
    PHASE1_CRITICAL_ALERT_TYPE.PAYMENT_SUCCEEDED_BUT_FULFILLMENT_FAILED,
    {
      ...sanitizePhase1ObservabilityFields(refs),
      ...sanitizePhase1ObservabilityFields(extra),
    },
  );
}
