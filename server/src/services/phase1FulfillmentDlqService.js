/**
 * Phase 1 fulfillment dead-letter trail in Redis (operator visibility; BullMQ still retains failed job meta).
 * Replay requires admin JWT + persisted operator reason + DB validation (no auto re-drive).
 */
import { withRedis } from './redisClient.js';
import { env } from '../config/env.js';
import { prisma } from '../db.js';
import { parseManualReviewFlags } from './canonicalPhase1Lifecycle.js';
import { isPhase1FulfillmentQueueReplayLikelySafe } from '../queues/phase1FulfillmentReplayDiscipline.js';
import { enqueuePhase1FulfillmentJob } from '../queues/phase1FulfillmentProducer.js';
import { bumpCounter } from '../lib/opsMetrics.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import { writeOrderAudit } from './orderAuditService.js';

export const PHASE1_FULFILLMENT_DLQ_KEY = 'zora:dlq:phase1_fulfillment:v1';
const DLQ_MAX = 500;

/**
 * @param {object} entry
 * @param {string} entry.orderId
 * @param {string | null} [entry.jobId]
 * @param {string | null} [entry.traceId]
 * @param {number} [entry.attemptsMade]
 * @param {number} [entry.maxAttempts]
 * @param {string} [entry.errorDigest]
 * @param {string} [entry.failureClass]
 * @param {string} [entry.intelligenceClass]
 * @param {string} [entry.event] bullmq_failed_final | stalled | …
 */
export async function recordPhase1FulfillmentDlqEntry(entry) {
  const payload = {
    v: 1,
    t: new Date().toISOString(),
    ...entry,
  };
  const line = JSON.stringify(payload);
  const r = await withRedis(async (c) => {
    await c.lPush(PHASE1_FULFILLMENT_DLQ_KEY, line);
    await c.lTrim(PHASE1_FULFILLMENT_DLQ_KEY, 0, DLQ_MAX - 1);
  });
  if (r.ok) {
    bumpCounter('phase1_fulfillment_dlq_record_total');
  }
  if (!r.ok && env.nodeEnv !== 'test') {
    console.warn(
      JSON.stringify({
        dlq: true,
        event: 'dlq_write_failed',
        error: r.error,
        orderIdSuffix: entry.orderId ? String(entry.orderId).slice(-12) : null,
      }),
    );
  }
}

/**
 * @param {number} [take]
 * @returns {Promise<object[]>}
 */
export async function listPhase1FulfillmentDlqEntries(take = 100) {
  const r = await withRedis((c) =>
    c.lRange(PHASE1_FULFILLMENT_DLQ_KEY, 0, Math.max(0, take - 1)),
  );
  if (!r.ok) return [];
  const lines = /** @type {string[]} */ (r.value ?? []);
  const out = [];
  for (const line of lines) {
    try {
      out.push(JSON.parse(line));
    } catch {
      out.push({ parseError: true, raw: line.slice(0, 200) });
    }
  }
  return out;
}

/**
 * Pre-execution check for DLQ / manual queue replay (DB + lifecycle).
 * @param {string} orderId
 */
export async function buildPhase1FulfillmentDlqPreExecutionCheck(orderId) {
  const row = await prisma.paymentCheckout.findUnique({ where: { id: orderId } });
  if (!row) {
    return {
      orderExists: false,
      blocked: true,
      blockCode: 'not_found',
      checks: ['Checkout row not found.'],
      queueReplayLikelySafe: false,
    };
  }

  const attempts = await prisma.fulfillmentAttempt.findMany({
    where: { orderId },
    orderBy: { attemptNumber: 'desc' },
    take: 6,
    select: {
      id: true,
      attemptNumber: true,
      status: true,
      providerReference: true,
      failureReason: true,
    },
  });

  /** @type {string[]} */
  const checks = [];
  let blocked = false;
  let blockCode = null;

  const succeeded = attempts.find((a) => a.status === FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED);
  if (succeeded) {
    blocked = true;
    blockCode = 'fulfillment_attempt_already_succeeded';
    checks.push('A fulfillment attempt is already SUCCEEDED — replay may duplicate provider I/O.');
  }

  if (row.orderStatus === ORDER_STATUS.FULFILLED) {
    blocked = true;
    blockCode = blockCode ?? 'order_already_fulfilled';
    checks.push('orderStatus is FULFILLED.');
  }

  if (row.status === PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED) {
    blocked = true;
    blockCode = blockCode ?? 'recharge_already_completed';
    checks.push('Payment status is RECHARGE_COMPLETED.');
  }

  const manual = parseManualReviewFlags(row.metadata);
  const queueReplayLikelySafe = isPhase1FulfillmentQueueReplayLikelySafe({
    orderStatus: row.orderStatus,
    paymentCheckoutStatus: row.status,
    manualRequired: manual.manualReviewRequired,
  });
  if (!queueReplayLikelySafe) {
    blocked = true;
    blockCode = blockCode ?? 'queue_replay_lifecycle_unsafe';
    checks.push(
      'Lifecycle guard: terminal order/payment state, manual review flag, or payment not in a paid-safe state.',
    );
  }

  const latest = attempts[0] ?? null;

  return {
    orderExists: true,
    blocked,
    blockCode,
    checks,
    orderId: row.id,
    orderStatus: row.orderStatus,
    paymentStatus: row.status,
    manualReviewRequired: manual.manualReviewRequired === true,
    latestAttempt: latest,
    queueReplayLikelySafe,
  };
}

/**
 * Validates checkout row and enqueues fulfillment job (idempotent dedupe inside producer).
 * @param {{
 *   orderId: string,
 *   operatorReason: string,
 *   traceId?: string | null,
 *   dryRun?: boolean,
 * }} p
 */
export async function guardedReplayPhase1FulfillmentFromDlq(p) {
  const orderId = String(p.orderId ?? '').trim();
  const reason = String(p.operatorReason ?? '').trim();
  const dryRun = p.dryRun === true;
  if (!orderId || (!dryRun && reason.length < env.manualRequiredActionReasonMinLen)) {
    return {
      ok: false,
      code: 'invalid_arguments',
      message: 'orderId and operatorReason (min length) required',
    };
  }

  const preExecutionCheck = await buildPhase1FulfillmentDlqPreExecutionCheck(orderId);

  if (dryRun) {
    const wouldEnqueue =
      preExecutionCheck.orderExists === true &&
      !preExecutionCheck.blocked &&
      preExecutionCheck.queueReplayLikelySafe === true;
    return {
      ok: wouldEnqueue,
      dryRun: true,
      wouldEnqueue,
      preExecutionCheck,
    };
  }

  if (!preExecutionCheck.orderExists) {
    return { ok: false, code: 'not_found', message: 'checkout not found', preExecutionCheck };
  }

  if (preExecutionCheck.blocked || !preExecutionCheck.queueReplayLikelySafe) {
    return {
      ok: false,
      code: preExecutionCheck.blockCode ?? 'replay_guard_blocked',
      message:
        'Replay blocked by pre-execution check — inspect checkout, attempts, and provider evidence first.',
      preExecutionCheck,
    };
  }

  const enq = await enqueuePhase1FulfillmentJob(orderId, p.traceId ?? null);
  if (!enq.ok) {
    return {
      ok: false,
      code: 'enqueue_failed',
      message: enq.reason ?? 'enqueue_failed',
      preExecutionCheck,
    };
  }

  await writeOrderAudit(prisma, {
    event: 'phase1_fulfillment_dlq_replay',
    payload: {
      orderId,
      jobId: enq.jobId,
      deduped: enq.deduped === true,
      operatorReason: reason.slice(0, 2000),
    },
    ip: null,
  });

  return {
    ok: true,
    checkoutId: orderId,
    jobId: enq.jobId,
    deduped: enq.deduped === true,
    operatorReason: reason,
    preExecutionCheck,
  };
}
