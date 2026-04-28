/**
 * Phase 1 operational retry **scheduler foundation** — pure evaluation only.
 * Does not enqueue jobs, call providers, or mutate database state.
 *
 * Callers must pass the **full** `fulfillmentAttempts` list for budget and duplicate checks.
 */

import { ORDER_STATUS } from '../../constants/orderStatus.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../../constants/postPaymentIncidentStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../../constants/fulfillmentAttemptStatus.js';
import { TRANSIENT_RETRY_ATTEMPT_BUDGET } from './retryPolicy.js';

export const OPERATIONAL_RETRY_DENIAL = Object.freeze({
  MISSING_ORDER: 'missing_order',
  /** Payment not captured / checkout not completed. */
  NOT_PAID: 'not_paid',
  ORDER_TERMINAL: 'order_terminal',
  /** No terminal FAILED attempt to retry from (or order state incompatible). */
  NO_FAILURE_CONTEXT: 'no_failure_context',
  NOT_TRANSIENT: 'not_transient',
  BUDGET_EXCEEDED: 'budget_exceeded',
  ACTIVE_ATTEMPT_IN_FLIGHT: 'active_attempt_in_flight',
  ALREADY_SUCCEEDED: 'already_succeeded',
  POST_PAYMENT_INCIDENT_BLOCKS: 'post_payment_incident_blocks',
});

/**
 * @typedef {{
 *   transientRetryBudget?: number,
 *   lastFailureTransientEligible?: boolean,
 * }} OperationalRetryContext
 */

/**
 * Whether a follow-up fulfillment attempt may be scheduled (evaluation only).
 *
 * @param {import('@prisma/client').PaymentCheckout | Record<string, unknown> | null | undefined} order
 * @param {Array<Record<string, unknown>>} fulfillmentAttempts — full history, any order
 * @param {OperationalRetryContext} [ctx]
 * @returns {{ allowed: true, nextAttemptNumber: number } | { allowed: false, denial: string, detail?: Record<string, unknown> }}
 */
export function evaluatePhase1OperationalRetrySchedule(order, fulfillmentAttempts, ctx = {}) {
  const budget = ctx.transientRetryBudget ?? TRANSIENT_RETRY_ATTEMPT_BUDGET;
  const transientEligible = ctx.lastFailureTransientEligible === true;

  if (!order || typeof order !== 'object') {
    return { allowed: false, denial: OPERATIONAL_RETRY_DENIAL.MISSING_ORDER };
  }

  const os = order.orderStatus;
  if (os === ORDER_STATUS.PENDING) {
    return { allowed: false, denial: OPERATIONAL_RETRY_DENIAL.NOT_PAID };
  }
  if (os === ORDER_STATUS.FULFILLED || os === ORDER_STATUS.CANCELLED) {
    return { allowed: false, denial: OPERATIONAL_RETRY_DENIAL.ORDER_TERMINAL };
  }

  const inc = order.postPaymentIncidentStatus;
  if (
    inc === POST_PAYMENT_INCIDENT_STATUS.REFUNDED ||
    inc === POST_PAYMENT_INCIDENT_STATUS.DISPUTED ||
    inc === POST_PAYMENT_INCIDENT_STATUS.CHARGEBACK_LOST
  ) {
    return { allowed: false, denial: OPERATIONAL_RETRY_DENIAL.POST_PAYMENT_INCIDENT_BLOCKS };
  }

  const list = Array.isArray(fulfillmentAttempts) ? [...fulfillmentAttempts] : [];
  list.sort((a, b) => Number(a.attemptNumber) - Number(b.attemptNumber));

  const hasSucceeded = list.some(
    (a) => String(a.status) === FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED,
  );
  if (hasSucceeded) {
    return { allowed: false, denial: OPERATIONAL_RETRY_DENIAL.ALREADY_SUCCEEDED };
  }

  const active = list.filter((a) => {
    const s = String(a.status);
    return (
      s === FULFILLMENT_ATTEMPT_STATUS.QUEUED ||
      s === FULFILLMENT_ATTEMPT_STATUS.PROCESSING
    );
  });
  if (active.length > 0) {
    return { allowed: false, denial: OPERATIONAL_RETRY_DENIAL.ACTIVE_ATTEMPT_IN_FLIGHT };
  }

  const hasFailedAttempt = list.some(
    (a) => String(a.status) === FULFILLMENT_ATTEMPT_STATUS.FAILED,
  );
  if (!hasFailedAttempt) {
    return { allowed: false, denial: OPERATIONAL_RETRY_DENIAL.NO_FAILURE_CONTEXT };
  }

  const retryableOrderShape =
    os === ORDER_STATUS.FAILED ||
    os === ORDER_STATUS.PROCESSING ||
    (os === ORDER_STATUS.PAID && hasFailedAttempt);
  if (!retryableOrderShape) {
    return { allowed: false, denial: OPERATIONAL_RETRY_DENIAL.NO_FAILURE_CONTEXT };
  }

  if (!transientEligible) {
    return { allowed: false, denial: OPERATIONAL_RETRY_DENIAL.NOT_TRANSIENT };
  }

  const maxNum = list.reduce((m, a) => Math.max(m, Number(a.attemptNumber) || 0), 0);
  const nextAttemptNumber = maxNum + 1;
  const maxAllowedAttemptNumber = 1 + budget;
  if (nextAttemptNumber > maxAllowedAttemptNumber) {
    return {
      allowed: false,
      denial: OPERATIONAL_RETRY_DENIAL.BUDGET_EXCEEDED,
      detail: {
        maxAttemptNumber: maxNum,
        transientRetryBudget: budget,
        maxAllowedAttemptNumber,
        nextAttemptNumber,
      },
    };
  }

  return { allowed: true, nextAttemptNumber, denial: undefined };
}

/**
 * Backwards-compatible wrapper. Prefer `evaluatePhase1OperationalRetrySchedule` with full attempts.
 *
 * @param {Record<string, unknown> | null | undefined} order
 * @param {Record<string, unknown> | null | undefined} lastAttempt
 * @param {OperationalRetryContext & { allAttempts?: Array<Record<string, unknown>> }} [ctx]
 */
export function shouldScheduleFollowUpFulfillmentAttempt(order, lastAttempt, ctx = {}) {
  const attempts =
    ctx.allAttempts ??
    (Array.isArray(ctx.attempts) ? ctx.attempts : lastAttempt ? [lastAttempt] : []);
  const r = evaluatePhase1OperationalRetrySchedule(order, attempts, ctx);
  return r.allowed === true;
}
