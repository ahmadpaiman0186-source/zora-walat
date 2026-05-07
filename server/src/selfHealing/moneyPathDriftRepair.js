/**
 * L8 bounded safe repairs — idempotent; audit-logged; no ledger UPDATE/DELETE.
 */

import { prisma as defaultPrisma } from '../db.js';
import { env } from '../config/env.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { validateStripeCheckoutSessionTruth } from '../payment/webhookTruthContract.js';
import { writeOrderAudit } from '../services/orderAuditService.js';
import { postPaymentCapturedLedger } from '../ledger/ledgerService.js';
import { enqueuePhase1FulfillmentJob } from '../queues/phase1FulfillmentProducer.js';
import { getStripeClient } from '../services/stripe.js';
import { canOrderProceedToFulfillment } from '../lib/phase1FulfillmentPaymentGate.js';
import { emitSelfHealingSpan } from './l8SelfHealingObservability.js';
import { DRIFT_TYPE } from './moneyPathDriftScan.js';

/** @typedef {import('@prisma/client').PrismaClient} PrismaClient */
/** @typedef {import('./moneyPathDriftScan.js').MoneyPathDriftInconsistency} MoneyPathDriftInconsistency */

function checkoutSuffix(id, n = 12) {
  const s = String(id ?? '');
  return s.length <= n ? s : s.slice(-n);
}

/**
 * @param {Record<string, unknown>} session
 * @returns {Record<string, unknown>}
 */
export function stripeCheckoutSessionToPlain(session) {
  const m =
    session &&
    typeof session === 'object' &&
    'metadata' in session &&
    session.metadata &&
    typeof session.metadata === 'object'
      ? /** @type {Record<string, unknown>} */ (
          /** @type {{ metadata: object }} */ (session).metadata
        )
      : {};
  return {
    id:
      session &&
      typeof session === 'object' &&
      'id' in session &&
      typeof /** @type {{ id?: unknown }} */ (session).id === 'string'
        ? /** @type {{ id: string }} */ (session).id
        : undefined,
    metadata: { ...m },
    amount_total:
      session &&
      typeof session === 'object' &&
      'amount_total' in session
        ? /** @type {{ amount_total?: unknown }} */ (session).amount_total
        : undefined,
    currency:
      session &&
      typeof session === 'object' &&
      'currency' in session
        ? /** @type {{ currency?: unknown }} */ (session).currency
        : undefined,
    mode:
      session &&
      typeof session === 'object' &&
      'mode' in session
        ? /** @type {{ mode?: unknown }} */ (session).mode
        : undefined,
    payment_status:
      session &&
      typeof session === 'object' &&
      'payment_status' in session
        ? /** @type {{ payment_status?: unknown }} */ (session).payment_status
        : undefined,
  };
}

/**
 * Read-only Stripe session retrieval + webhook-truth evaluation — never persists PAID.
 *
 * @param {PrismaClient} prismaClient
 * @param {MoneyPathDriftInconsistency} inc
 * @param {string | null} traceId
 * @param {{ getStripeClientFn?: typeof getStripeClient }} [deps]
 * @returns {Promise<{ action: string, result: string }>}
 */
export async function repairPaymentDriftReadOnly(
  prismaClient,
  inc,
  traceId,
  deps = {},
) {
  const stripeFn = deps.getStripeClientFn ?? getStripeClient;
  const stripe = stripeFn();

  const row = await prismaClient.paymentCheckout.findUnique({
    where: { id: inc.checkoutId },
    select: {
      id: true,
      userId: true,
      amountUsdCents: true,
      currency: true,
      orderStatus: true,
      stripeCheckoutSessionId: true,
    },
  });

  if (!row?.stripeCheckoutSessionId) {
    const reason = 'no_stripe_checkout_session_id';
    emitSelfHealingSpan('self_healing_skipped', {
      traceId,
      type: inc.type,
      subtype: inc.subtype,
      checkoutId: inc.checkoutId,
      action: 'readonly_stripe_truth_verify',
      result: reason,
    });
    await writeOrderAudit(prismaClient, {
      event: 'self_healing_skipped',
      payload: {
        driftSubtype: inc.subtype,
        reason,
        traceId,
        checkoutIdSuffix: checkoutSuffix(inc.checkoutId),
      },
      ip: null,
    });
    return { action: 'readonly_stripe_truth_verify', result: reason };
  }

  if (!stripe) {
    const reason = 'stripe_client_unavailable';
    emitSelfHealingSpan('self_healing_skipped', {
      traceId,
      type: inc.type,
      subtype: inc.subtype,
      checkoutId: inc.checkoutId,
      action: 'readonly_stripe_truth_verify',
      result: reason,
    });
    await writeOrderAudit(prismaClient, {
      event: 'self_healing_skipped',
      payload: {
        driftSubtype: inc.subtype,
        reason,
        traceId,
        checkoutIdSuffix: checkoutSuffix(inc.checkoutId),
      },
      ip: null,
    });
    return { action: 'readonly_stripe_truth_verify', result: reason };
  }

  let sessionPlain = /** @type {Record<string, unknown>} */ ({});
  try {
    const session = await stripe.checkout.sessions.retrieve(
      row.stripeCheckoutSessionId,
    );
    sessionPlain = stripeCheckoutSessionToPlain(session);
  } catch (e) {
    const reason = `stripe_retrieve_failed:${String(e?.message ?? e).slice(0, 120)}`;
    emitSelfHealingSpan('self_healing_skipped', {
      traceId,
      type: inc.type,
      subtype: inc.subtype,
      checkoutId: inc.checkoutId,
      action: 'readonly_stripe_truth_verify',
      result: reason,
    });
    await writeOrderAudit(prismaClient, {
      event: 'self_healing_skipped',
      payload: {
        driftSubtype: inc.subtype,
        reason,
        traceId,
        checkoutIdSuffix: checkoutSuffix(inc.checkoutId),
      },
      ip: null,
    });
    return { action: 'readonly_stripe_truth_verify', result: reason };
  }

  const truth = validateStripeCheckoutSessionTruth({
    session: sessionPlain,
    order: row,
    stripeEventType: 'checkout.session.completed',
    traceId,
  });

  await writeOrderAudit(prismaClient, {
    event: 'self_healing_payment_drift_readonly_truth_verify',
    payload: {
      traceId,
      validated: Boolean(truth.ok),
      failureClass: truth.failureClass ?? null,
      driftSubtype: inc.subtype,
      checkoutIdSuffix: checkoutSuffix(inc.checkoutId),
    },
    ip: null,
  });

  emitSelfHealingSpan('self_healing_repair_applied', {
    traceId,
    type: inc.type,
    subtype: inc.subtype,
    checkoutId: inc.checkoutId,
    action: 'readonly_stripe_truth_verify',
    result: truth.ok ? 'truth_eval_ok' : String(truth.failureClass ?? 'truth_eval_failed'),
  });

  return {
    action: 'readonly_stripe_truth_verify',
    result: truth.ok ? 'truth_eval_ok' : String(truth.failureClass ?? 'truth_eval_failed'),
  };
}

/**
 * Idempotent append-only ledger capture for PAID pipeline rows with durable webhook id.
 *
 * @param {PrismaClient} prismaClient
 * @param {MoneyPathDriftInconsistency} inc
 * @param {string | null} traceId
 * @param {{ postPaymentCapturedLedgerFn?: typeof postPaymentCapturedLedger }} [deps]
 */
export async function repairLedgerMissingPaymentCapture(
  prismaClient,
  inc,
  traceId,
  deps = {},
) {
  const postFn = deps.postPaymentCapturedLedgerFn ?? postPaymentCapturedLedger;

  const row = await prismaClient.paymentCheckout.findUnique({
    where: { id: inc.checkoutId },
    select: {
      id: true,
      amountUsdCents: true,
      orderStatus: true,
      status: true,
      completedByWebhookEventId: true,
    },
  });

  if (
    !row ||
    row.orderStatus !== ORDER_STATUS.PAID ||
    row.status !== PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED ||
    !row.completedByWebhookEventId
  ) {
    const reason = 'checkout_not_paid_pipeline';
    emitSelfHealingSpan('self_healing_skipped', {
      traceId,
      type: inc.type,
      subtype: inc.subtype,
      checkoutId: inc.checkoutId,
      action: 'post_payment_capture_ledger',
      result: reason,
    });
    return { action: 'post_payment_capture_ledger', result: reason };
  }

  const ev = await prismaClient.stripeWebhookEvent.findUnique({
    where: { id: String(row.completedByWebhookEventId) },
  });
  if (!ev) {
    const reason = 'missing_stripe_webhook_event_row';
    emitSelfHealingSpan('self_healing_skipped', {
      traceId,
      type: inc.type,
      subtype: inc.subtype,
      checkoutId: inc.checkoutId,
      action: 'post_payment_capture_ledger',
      result: reason,
    });
    return { action: 'post_payment_capture_ledger', result: reason };
  }

  let duplicate = false;
  let entryIdSuffix = '';
  /** @type {string | null} */
  let ledgerResult = null;

  await prismaClient.$transaction(async (tx) => {
    const r = await postFn(tx, {
      checkoutId: row.id,
      stripeEventId: String(row.completedByWebhookEventId),
      amountUsdCents: row.amountUsdCents,
    });
    if (r?.skipped) {
      ledgerResult = `skipped:${String(r.reason ?? 'unknown')}`;
      return;
    }
    duplicate = Boolean(r?.duplicate);
    const id = r?.entryId ? String(r.entryId) : '';
    entryIdSuffix = id.length > 12 ? id.slice(-12) : id;
    ledgerResult = duplicate ? 'duplicate_noop' : 'appended';
  });

  if (!ledgerResult) {
    ledgerResult = 'skipped:no_post_result';
  }

  if (ledgerResult.startsWith('skipped')) {
    emitSelfHealingSpan('self_healing_skipped', {
      traceId,
      type: inc.type,
      subtype: inc.subtype,
      checkoutId: inc.checkoutId,
      action: 'post_payment_capture_ledger',
      result: ledgerResult,
    });
    await writeOrderAudit(prismaClient, {
      event: 'self_healing_skipped',
      payload: {
        traceId,
        driftSubtype: inc.subtype,
        reason: ledgerResult,
        checkoutIdSuffix: checkoutSuffix(inc.checkoutId),
      },
      ip: null,
    });
    return { action: 'post_payment_capture_ledger', result: ledgerResult };
  }

  await writeOrderAudit(prismaClient, {
    event: 'self_healing_repair_ledger_payment_capture',
    payload: {
      traceId,
      duplicate,
      entryIdSuffix: entryIdSuffix || null,
      checkoutIdSuffix: checkoutSuffix(inc.checkoutId),
    },
    ip: null,
  });

  emitSelfHealingSpan('self_healing_repair_applied', {
    traceId,
    type: inc.type,
    subtype: inc.subtype,
    checkoutId: inc.checkoutId,
    action: 'post_payment_capture_ledger',
    result: ledgerResult ?? 'unknown',
  });

  return {
    action: 'post_payment_capture_ledger',
    result: ledgerResult ?? 'unknown',
  };
}

/**
 * Queue-only fulfillment dispatch (never inline fallback).
 *
 * @param {PrismaClient} prismaClient
 * @param {MoneyPathDriftInconsistency} inc
 * @param {string | null} traceId
 * @param {{ enqueueFn?: typeof enqueuePhase1FulfillmentJob }} [deps]
 */
export async function repairFulfillmentEnqueuePaidOrder(
  prismaClient,
  inc,
  traceId,
  deps = {},
) {
  const enqueue = deps.enqueueFn ?? enqueuePhase1FulfillmentJob;

  if (!deps.enqueueFn && !env.fulfillmentQueueEnabled) {
    const reason = 'fulfillment_queue_disabled';
    emitSelfHealingSpan('self_healing_skipped', {
      traceId,
      type: inc.type,
      subtype: inc.subtype,
      checkoutId: inc.checkoutId,
      action: 'enqueue_phase1_fulfillment',
      result: reason,
    });
    await writeOrderAudit(prismaClient, {
      event: 'self_healing_skipped',
      payload: {
        driftSubtype: inc.subtype,
        reason,
        traceId,
        checkoutIdSuffix: checkoutSuffix(inc.checkoutId),
      },
      ip: null,
    });
    return { action: 'enqueue_phase1_fulfillment', result: reason };
  }

  const row = await prismaClient.paymentCheckout.findUnique({
    where: { id: inc.checkoutId },
    select: {
      orderStatus: true,
      status: true,
      productType: true,
      currency: true,
      amountUsdCents: true,
      stripePaymentIntentId: true,
      completedByWebhookEventId: true,
      postPaymentIncidentStatus: true,
    },
  });

  const gate = canOrderProceedToFulfillment(row, { lifecycle: 'PAID_ONLY' });
  if (!gate.ok) {
    const reason = `gate_denied:${gate.denial}`;
    emitSelfHealingSpan('self_healing_skipped', {
      traceId,
      type: inc.type,
      subtype: inc.subtype,
      checkoutId: inc.checkoutId,
      action: 'enqueue_phase1_fulfillment',
      result: reason,
    });
    await writeOrderAudit(prismaClient, {
      event: 'self_healing_skipped',
      payload: {
        driftSubtype: inc.subtype,
        reason,
        traceId,
        checkoutIdSuffix: checkoutSuffix(inc.checkoutId),
      },
      ip: null,
    });
    return { action: 'enqueue_phase1_fulfillment', result: reason };
  }

  const enq = await enqueue(inc.checkoutId, traceId);

  if (!enq.ok) {
    const reason = String(enq.reason ?? 'enqueue_failed');
    emitSelfHealingSpan('self_healing_skipped', {
      traceId,
      type: inc.type,
      subtype: inc.subtype,
      checkoutId: inc.checkoutId,
      action: 'enqueue_phase1_fulfillment',
      result: reason,
    });
    await writeOrderAudit(prismaClient, {
      event: 'self_healing_skipped',
      payload: {
        driftSubtype: inc.subtype,
        reason,
        traceId,
        checkoutIdSuffix: checkoutSuffix(inc.checkoutId),
      },
      ip: null,
    });
    return { action: 'enqueue_phase1_fulfillment', result: reason };
  }

  const resStr =
    /** @type {{ deduped?: boolean }} */ (enq).deduped === true
      ? 'deduped_noop'
      : 'enqueued';

  await writeOrderAudit(prismaClient, {
    event: 'self_healing_repair_fulfillment_enqueue',
    payload: {
      traceId,
      outcome: resStr,
      jobIdSuffix:
        typeof enq.jobId === 'string' && enq.jobId.length > 12
          ? enq.jobId.slice(-12)
          : enq.jobId ?? null,
    },
    ip: null,
  });

  emitSelfHealingSpan('self_healing_repair_applied', {
    traceId,
    type: inc.type,
    subtype: inc.subtype,
    checkoutId: inc.checkoutId,
    action: 'enqueue_phase1_fulfillment',
    result: resStr,
  });

  return { action: 'enqueue_phase1_fulfillment', result: resStr };
}

/**
 * @param {MoneyPathDriftInconsistency} inc
 * @param {string | null} traceId
 */
export function emitRepairSkippedUnsupported(inc, traceId) {
  emitSelfHealingSpan('self_healing_skipped', {
    traceId,
    type: inc.type,
    subtype: inc.subtype,
    checkoutId: inc.checkoutId,
    action: 'none',
    result: 'subtype_not_auto_repaired',
  });
}

/**
 * @param {{
 *   prisma?: PrismaClient,
 *   inconsistency: MoneyPathDriftInconsistency,
 *   traceId?: string | null,
 *   deps?: {
 *     getStripeClientFn?: typeof getStripeClient,
 *     postPaymentCapturedLedgerFn?: typeof postPaymentCapturedLedger,
 *     enqueueFn?: typeof enqueuePhase1FulfillmentJob,
 *   },
 * }} p
 * @returns {Promise<{ action: string, result: string }>}
 */
export async function applySafeMoneyPathRepair(p) {
  const prismaClient = p.prisma ?? defaultPrisma;
  const traceId = p.traceId ?? null;
  const inc = p.inconsistency;
  const deps = p.deps ?? {};

  if (inc.type === DRIFT_TYPE.PRICING_DRIFT) {
    emitRepairSkippedUnsupported(inc, traceId);
    await writeOrderAudit(prismaClient, {
      event: 'self_healing_skipped',
      payload: {
        driftType: inc.type,
        driftSubtype: inc.subtype,
        reason: 'pricing_flag_only',
        traceId,
        checkoutIdSuffix: checkoutSuffix(inc.checkoutId),
      },
      ip: null,
    });
    return { action: 'none', result: 'pricing_flag_only' };
  }

  if (inc.type === DRIFT_TYPE.PAYMENT_DRIFT) {
    return repairPaymentDriftReadOnly(prismaClient, inc, traceId, deps);
  }

  if (inc.type === DRIFT_TYPE.LEDGER_DRIFT) {
    if (inc.subtype === 'missing_payment_capture_for_paid') {
      return repairLedgerMissingPaymentCapture(prismaClient, inc, traceId, deps);
    }
    emitRepairSkippedUnsupported(inc, traceId);
    await writeOrderAudit(prismaClient, {
      event: 'self_healing_skipped',
      payload: {
        driftSubtype: inc.subtype,
        reason: 'ledger_reverse_anomaly_manual_review',
        traceId,
        checkoutIdSuffix: checkoutSuffix(inc.checkoutId),
      },
      ip: null,
    });
    return { action: 'none', result: 'ledger_reverse_anomaly_manual_review' };
  }

  if (inc.type === DRIFT_TYPE.FULFILLMENT_DRIFT) {
    if (inc.subtype === 'paid_without_fulfillment_attempt') {
      return repairFulfillmentEnqueuePaidOrder(prismaClient, inc, traceId, deps);
    }
    emitRepairSkippedUnsupported(inc, traceId);
    await writeOrderAudit(prismaClient, {
      event: 'self_healing_skipped',
      payload: {
        driftSubtype: inc.subtype,
        reason: 'fulfillment_orphan_manual_review',
        traceId,
        checkoutIdSuffix: checkoutSuffix(inc.checkoutId),
      },
      ip: null,
    });
    return { action: 'none', result: 'fulfillment_orphan_manual_review' };
  }

  emitRepairSkippedUnsupported(inc, traceId);
  return { action: 'none', result: 'unknown_drift_type' };
}
