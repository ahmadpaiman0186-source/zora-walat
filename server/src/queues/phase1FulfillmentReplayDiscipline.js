/**
 * BullMQ Phase 1 fulfillment queue: failed-job / replay discipline.
 *
 * ## Current model
 * - Job id === PaymentCheckout.id (dedupe key).
 * - Transient failures rethrow → BullMQ retries with **exponential backoff** (`FULFILLMENT_JOB_BACKOFF_MS`, `FULFILLMENT_JOB_MAX_ATTEMPTS` on the primary queue).
 * - Non-transient failures → `UnrecoverableError` (no retry).
 * - Exhausted retries: Redis list DLQ (`phase1FulfillmentDlqService`) **+** BullMQ queue `phase1-fulfillment-dlq-v1` snapshot job; primary job remains in Bull failed set with attempts metadata.
 *
 * ## Safe manual replay (operator)
 * 1. Confirm `paymentCheckout.status` is PAYMENT_SUCCEEDED (or recharge-terminal paid signals).
 * 2. Confirm `orderStatus` is PAID or PROCESSING — not FULFILLED / CANCELLED unless re-driving a stuck edge case with staff approval.
 * 3. If `metadata.manualRequired === true`, do not replay until manual review clears.
 * 4. Prefer `enqueuePhase1FulfillmentJob(orderId)` / admin kick — **never** run provider I/O twice without checking latest FulfillmentAttempt.
 * 5. Correlate using: `orderId`, Bull `jobId` (same as orderId), `traceId` on job payload, Stripe PI id on checkout.
 *
 * ## Unsafe
 * - Replaying when latest attempt is SUCCEEDED but order row not FULFILLED (data defect — fix row first).
 * - Forcing success in DB without provider evidence.
 */
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';

/**
 * @param {object} p
 * @param {string} p.orderStatus
 * @param {string} p.paymentCheckoutStatus
 * @param {boolean} [p.manualRequired]
 */
export function isPhase1FulfillmentQueueReplayLikelySafe(p) {
  const manual = p.manualRequired === true;
  if (manual) return false;
  const os = p.orderStatus;
  if (
    os === ORDER_STATUS.FULFILLED ||
    os === ORDER_STATUS.CANCELLED ||
    os === ORDER_STATUS.FAILED
  ) {
    return false;
  }
  const paid =
    p.paymentCheckoutStatus === PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED ||
    p.paymentCheckoutStatus === PAYMENT_CHECKOUT_STATUS.RECHARGE_PENDING ||
    p.paymentCheckoutStatus === PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED ||
    p.paymentCheckoutStatus === PAYMENT_CHECKOUT_STATUS.RECHARGE_FAILED;
  if (!paid) return false;
  return os === ORDER_STATUS.PAID || os === ORDER_STATUS.PROCESSING;
}

/**
 * Operator-facing fingerprint for logs/tickets when a job hits the `failed` listener.
 * @param {object} p
 * @param {string | undefined} p.jobId
 * @param {string | undefined} p.orderId
 * @param {number | undefined} p.attemptsMade
 * @param {number | undefined} p.maxAttempts
 * @param {string | undefined} p.traceId
 * @param {boolean | null} p.finalAttempt
 */
export function formatPhase1FulfillmentFailedJobFingerprint(p) {
  return {
    kind: 'phase1_fulfillment_bullmq_failed',
    jobId: p.jobId ?? null,
    orderIdSuffix: p.orderId ? String(p.orderId).slice(-12) : null,
    attemptsMade: p.attemptsMade ?? null,
    maxAttempts: p.maxAttempts ?? null,
    finalAttempt: p.finalAttempt ?? null,
    traceId: p.traceId ?? null,
  };
}
