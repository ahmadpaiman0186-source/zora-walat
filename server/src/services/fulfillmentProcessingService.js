import { prisma } from '../db.js';
import { env } from '../config/env.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import {
  assertTransition,
  isTerminalOrderStatus,
} from '../domain/orders/orderLifecycle.js';
import { writeOrderAudit } from './orderAuditService.js';
import { resolveAirtimeProviderName } from '../domain/fulfillment/executeAirtimeFulfillment.js';
import { executeDelivery } from './deliveryExecutionService.js';
import { logDeliveryEvent } from './deliveryLogger.js';
import {
  AIRTIME_ERROR_KIND,
  AIRTIME_OUTCOME,
} from '../domain/fulfillment/airtimeFulfillmentResult.js';
import {
  classifyProviderError,
  safeErrorDiagnostics,
} from '../domain/fulfillment/classifyProviderError.js';
import {
  AUTO_RETRY_ENABLED,
  RETRY_POLICY_VERSION,
  isRetryableFulfillmentFailure,
} from '../domain/fulfillment/retryPolicy.js';
import { grantLoyaltyPointsForDeliveredOrderInTx } from './loyaltyPointsService.js';
import {
  emitFulfillmentTerminalSideEffects,
  schedulePushSideEffect,
} from './pushNotifications/userNotificationPipeline.js';
import { runWithTrace, getTraceId } from '../lib/requestContext.js';
import {
  recordFulfillmentRunStarted,
} from '../lib/opsMetrics.js';
import {
  buildMarginSnapshotForDeliveredOrder,
  recordMarginIntelAfterSnapshot,
  MARGIN_PROVIDER_COST_SOURCE,
} from '../lib/marginIntelligence.js';

function safeJson(obj) {
  try {
    return JSON.stringify(obj ?? {});
  } catch {
    return '{}';
  }
}

/**
 * Create a queued fulfillment attempt (idempotent if attempt #1 already exists).
 * Called inside the Stripe webhook transaction after order → PAID.
 */
export async function ensureQueuedFulfillmentAttempt(tx, orderId) {
  const existing = await tx.fulfillmentAttempt.findFirst({
    where: { orderId, attemptNumber: 1 },
  });
  if (existing) {
    return existing;
  }
  return tx.fulfillmentAttempt.create({
    data: {
      orderId,
      attemptNumber: 1,
      status: FULFILLMENT_ATTEMPT_STATUS.QUEUED,
      provider: resolveAirtimeProviderName(),
      requestSummary: JSON.stringify({ phase: 'queued' }),
    },
  });
}

/**
 * Claim PAID + QUEUED attempt → PROCESSING + order PAID → PROCESSING, then airtime provider adapter.
 * Safe under concurrency: `updateMany` claim is atomic; duplicate workers get count 0.
 * @param {string} orderId
 * @param {{ traceId?: string | null }} [opts]
 */
export async function processFulfillmentForOrder(orderId, opts = {}) {
  const traceId = opts.traceId ?? getTraceId();
  return runWithTrace(traceId, () => processFulfillmentForOrderInner(orderId));
}

async function processFulfillmentForOrderInner(orderId) {
  const peek = await prisma.paymentCheckout.findUnique({
    where: { id: orderId },
    select: { orderStatus: true },
  });
  if (!peek) {
    logDeliveryEvent({
      orderId,
      phase: 'orchestration',
      result: 'skipped',
      failureReason: null,
      detail: 'order_not_found',
    });
    return;
  }
  if (isTerminalOrderStatus(peek.orderStatus)) {
    logDeliveryEvent({
      orderId,
      phase: 'orchestration',
      result: 'noop',
      failureReason: null,
      detail: `terminal_${peek.orderStatus}`,
    });
    return;
  }

  recordFulfillmentRunStarted();

  const phase1 = await prisma.$transaction(async (tx) => {
    const order = await tx.paymentCheckout.findUnique({
      where: { id: orderId },
    });
    if (!order || order.orderStatus !== ORDER_STATUS.PAID) {
      return null;
    }

    const attempt = await tx.fulfillmentAttempt.findFirst({
      where: {
        orderId,
        attemptNumber: 1,
        status: FULFILLMENT_ATTEMPT_STATUS.QUEUED,
      },
    });
    if (!attempt) {
      return null;
    }

    const claim = await tx.fulfillmentAttempt.updateMany({
      where: {
        id: attempt.id,
        status: FULFILLMENT_ATTEMPT_STATUS.QUEUED,
      },
      data: {
        status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
        startedAt: new Date(),
      },
    });
    if (claim.count === 0) {
      return null;
    }

    assertTransition(order.orderStatus, ORDER_STATUS.PROCESSING);
    const orderUpdate = await tx.paymentCheckout.updateMany({
      where: {
        id: orderId,
        orderStatus: ORDER_STATUS.PAID,
      },
      data: {
        orderStatus: ORDER_STATUS.PROCESSING,
        status: PAYMENT_CHECKOUT_STATUS.RECHARGE_PENDING,
      },
    });
    if (orderUpdate.count === 0) {
      await tx.fulfillmentAttempt.updateMany({
        where: {
          id: attempt.id,
          status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
        },
        data: {
          status: FULFILLMENT_ATTEMPT_STATUS.QUEUED,
          startedAt: null,
        },
      });
      return null;
    }

    await writeOrderAudit(tx, {
      event: 'delivery_started',
      payload: { orderId, attemptId: attempt.id, phase: 'processing' },
      ip: null,
    });

    return { attemptId: attempt.id };
  });

  if (!phase1) {
    return;
  }

  const orderRow = await prisma.paymentCheckout.findUnique({
    where: { id: orderId },
  });
  if (!orderRow || orderRow.orderStatus !== ORDER_STATUS.PROCESSING) {
    return;
  }

  /** Delivery I/O runs outside DB transactions (timeouts / HTTP). */
  let providerResult;
  try {
    providerResult = await executeDelivery(orderRow);
  } catch (err) {
    const { errorKind, failureCode } = classifyProviderError(err);
    providerResult = {
      outcome: AIRTIME_OUTCOME.FAILURE,
      providerKey: resolveAirtimeProviderName(),
      failureCode,
      failureMessage: String(err?.message ?? err).slice(0, 300),
      errorKind,
      requestSummary: {},
      responseSummary: { diagnostic: safeErrorDiagnostics(err) },
    };
  }

  try {
    const marginTelemetry = await prisma.$transaction(async (tx) => {
      const order = await tx.paymentCheckout.findUnique({
        where: { id: orderId },
      });
      if (!order || order.orderStatus !== ORDER_STATUS.PROCESSING) {
        return null;
      }

      const att = await tx.fulfillmentAttempt.findFirst({
        where: {
          id: phase1.attemptId,
          orderId,
          status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
        },
      });
      if (!att) {
        return null;
      }

      const reqStr = safeJson(providerResult.requestSummary);
      const resStr = safeJson(providerResult.responseSummary);

      if (providerResult.outcome === AIRTIME_OUTCOME.SUCCESS) {
        assertTransition(ORDER_STATUS.PROCESSING, ORDER_STATUS.DELIVERED);

        const snapshot = buildMarginSnapshotForDeliveredOrder(order, providerResult, {
          pricingStripeFeeBps: env.pricingStripeFeeBps,
          pricingStripeFixedCents: env.pricingStripeFixedCents,
          pricingAmountOnlyProviderBps: env.pricingAmountOnlyProviderBps,
        });

        const done = await tx.paymentCheckout.updateMany({
          where: {
            id: orderId,
            orderStatus: ORDER_STATUS.PROCESSING,
            marginNetUsdCents: null,
          },
          data: {
            orderStatus: ORDER_STATUS.DELIVERED,
            status: PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED,
            marginSellUsdCents: snapshot.marginSellUsdCents,
            marginProviderCostUsdCents: snapshot.marginProviderCostUsdCents,
            marginProviderCostSource: snapshot.marginProviderCostSource,
            marginPaymentFeeUsdCents: snapshot.marginPaymentFeeUsdCents,
            marginNetUsdCents: snapshot.marginNetUsdCents,
            marginPercentBp: snapshot.marginPercentBp,
            marginCalculatedAt: new Date(),
          },
        });
        if (done.count === 0) {
          return null;
        }

        await tx.fulfillmentAttempt.update({
          where: { id: att.id },
          data: {
            status: FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED,
            provider: providerResult.providerKey ?? att.provider,
            providerReference: providerResult.providerReference ?? null,
            requestSummary: reqStr,
            responseSummary: resStr,
            completedAt: new Date(),
          },
        });

        await writeOrderAudit(tx, {
          event: 'delivery_succeeded',
          payload: {
            orderId,
            attemptId: att.id,
            providerReference: providerResult.providerReference ?? null,
          },
          ip: null,
        });

        await grantLoyaltyPointsForDeliveredOrderInTx(tx, {
          id: order.id,
          userId: order.userId,
          amountUsdCents: order.amountUsdCents,
        });

        return {
          orderId,
          snapshot,
          usedApiCost:
            snapshot.marginProviderCostSource ===
            MARGIN_PROVIDER_COST_SOURCE.PROVIDER_API,
        };
      }

      await tx.fulfillmentAttempt.update({
        where: { id: att.id },
        data: {
          status: FULFILLMENT_ATTEMPT_STATUS.FAILED,
          provider: providerResult.providerKey ?? att.provider,
          providerReference: providerResult.providerReference ?? null,
          requestSummary: reqStr,
          responseSummary: resStr,
          failureReason:
            providerResult.failureCode ??
            providerResult.errorKind ??
            'airtime_provider_failure',
          failedAt: new Date(),
        },
      });
      await tx.paymentCheckout.updateMany({
        where: {
          id: orderId,
          orderStatus: ORDER_STATUS.PROCESSING,
        },
        data: {
          orderStatus: ORDER_STATUS.FAILED,
          status: PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED,
          failedAt: new Date(),
          failureReason:
            providerResult.failureCode ?? 'airtime_provider_failure',
        },
      });
      await writeOrderAudit(tx, {
        event: 'delivery_failed',
        payload: {
          orderId,
          attemptId: att.id,
          errorKind: providerResult.errorKind ?? null,
          retryPolicyVersion: RETRY_POLICY_VERSION,
          retryable: isRetryableFulfillmentFailure(providerResult),
          autoRetryEnabled: AUTO_RETRY_ENABLED,
        },
        ip: null,
      });
      return null;
    });

    if (marginTelemetry) {
      recordMarginIntelAfterSnapshot(
        marginTelemetry.orderId,
        marginTelemetry.snapshot,
        marginTelemetry.usedApiCost,
        env.marginLowRouteBp,
      );
    }

    schedulePushSideEffect(() => emitFulfillmentTerminalSideEffects(orderId), getTraceId());
  } catch (err) {
    console.error('[fulfillment] completion phase failed', orderId, err);
    await prisma.$transaction(async (tx) => {
      const att = await tx.fulfillmentAttempt.findFirst({
        where: {
          id: phase1.attemptId,
          orderId,
          status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
        },
      });
      if (!att) {
        return;
      }
      await tx.fulfillmentAttempt.update({
        where: { id: att.id },
        data: {
          status: FULFILLMENT_ATTEMPT_STATUS.FAILED,
          failedAt: new Date(),
          failureReason: 'fulfillment_completion_error',
        },
      });
      await tx.paymentCheckout.updateMany({
        where: {
          id: orderId,
          orderStatus: ORDER_STATUS.PROCESSING,
        },
        data: {
          orderStatus: ORDER_STATUS.FAILED,
          status: PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED,
          failedAt: new Date(),
          failureReason: 'fulfillment_processing_error',
        },
      });
      await writeOrderAudit(tx, {
        event: 'delivery_orchestration_failed',
        payload: { orderId, attemptId: att.id },
        ip: null,
      });
    });

    schedulePushSideEffect(() => emitFulfillmentTerminalSideEffects(orderId), getTraceId());
  }
}

/**
 * Drain queued attempts (e.g. cron or recovery if async scheduling missed).
 *
 * Retries: see `domain/fulfillment/retryPolicy.js` — `AUTO_RETRY_ENABLED` is false;
 * `shouldScheduleFollowUpFulfillmentAttempt` is a stub. New attempts must not
 * duplicate paid/fulfilled work (unique constraints + terminal state checks).
 */
export async function processPendingPaidOrders({ limit = 10 } = {}) {
  const rows = await prisma.fulfillmentAttempt.findMany({
    where: { status: FULFILLMENT_ATTEMPT_STATUS.QUEUED },
    select: { orderId: true },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
  const seen = new Set();
  for (const r of rows) {
    if (seen.has(r.orderId)) continue;
    seen.add(r.orderId);
    await processFulfillmentForOrder(r.orderId);
  }
}

/**
 * @param {string} orderId
 * @param {string | null | undefined} traceId from HTTP/webhook request when known
 */
export function scheduleFulfillmentProcessing(orderId, traceId) {
  setImmediate(() => {
    processFulfillmentForOrder(orderId, { traceId }).catch((err) => {
      console.error('[fulfillment] processFulfillmentForOrder failed', orderId, err);
    });
  });
}

/** Explicit entry point for paid → processing → provider → terminal state. */
export async function markProcessing(orderId, opts = {}) {
  return processFulfillmentForOrder(orderId, opts);
}
