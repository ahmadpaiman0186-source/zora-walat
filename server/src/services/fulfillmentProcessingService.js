import { prisma } from '../db.js';
import { env } from '../config/env.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import {
  assertTransition,
  isTerminalOrderStatus,
  OrderTransitionError,
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
import { normalizeFulfillmentProviderResult } from '../domain/fulfillment/providerResultNormalization.js';
import {
  AUTO_RETRY_ENABLED,
  RETRY_POLICY_VERSION,
  isRetryableFulfillmentFailure,
  transientRetryHintFromProviderResult,
} from '../domain/fulfillment/retryPolicy.js';
import { grantLoyaltyPointsForDeliveredOrderInTx } from './loyaltyPointsService.js';
import {
  emitFulfillmentTerminalSideEffects,
  schedulePushSideEffect,
} from './pushNotifications/userNotificationPipeline.js';
import { scheduleReferralEvaluationAfterDelivery } from './referral/referralLifecycleService.js';
import { runWithTrace, getTraceId } from '../lib/requestContext.js';
import { runWithCorrelation, mergeOrderAttemptIntoCorrelation } from '../lib/correlationContext.js';
import { randomUUID } from 'node:crypto';
import { mergeManualRequiredMetadata } from '../lib/manualRequiredMetadata.js';
import { logFulfillmentIntegrityEvent } from './fulfillmentLikelySuccessService.js';
import { logManualRequiredAlert } from '../lib/manualRequiredAlerts.js';
import {
  recordFulfillmentRunStarted,
  recordFulfillmentManualInterventionPath,
  recordFulfillmentMoneyPathDurationMs,
} from '../lib/opsMetrics.js';
import { MONEY_PATH_EVENT } from '../domain/payments/moneyPathEvents.js';
import { emitMoneyPathLog } from '../infrastructure/logging/moneyPathLog.js';
import { emitPhase1OperationalEvent } from '../lib/phase1OperationalEvents.js';
import { buildProviderExecutionCorrelationId } from '../lib/providerExecutionCorrelation.js';
import { logOpsEvent } from '../lib/opsLog.js';
import {
  buildMarginSnapshotForDeliveredOrder,
  extractProviderCostUsdCentsFromResponse,
  recordMarginIntelAfterSnapshot,
  MARGIN_PROVIDER_COST_SOURCE,
} from '../lib/marginIntelligence.js';
import {
  buildFulfillmentTruthSnapshot,
  scheduleFinancialTruthRecompute,
} from './financialTruthService.js';
import { detectFailureConfidence } from '../domain/fulfillment/failureConfidence.js';
import { FAILURE_CONFIDENCE } from '../constants/failureConfidence.js';
import { isDbOrchestrationFragileError } from '../lib/dbOrchestrationError.js';
import {
  emitReloadlyFulfillmentEvent,
  reloadlyFulfillmentBaseFields,
} from '../lib/reloadlyFulfillmentObservability.js';
import { canOrderProceedToFulfillment } from '../lib/phase1FulfillmentPaymentGate.js';
import { emitFortressIdempotencyNoop } from '../lib/transactionFortressIdempotency.js';
import {
  classifyTransactionFailure,
} from '../constants/transactionFailureClass.js';
import { transactionRetryDirective } from '../lib/transactionRetryPolicy.js';
import { operationalClassFromTransactionFailure } from '../lib/operationalErrorClass.js';
import { validatePaymentCheckoutStatusTransition } from '../domain/orders/phase1LifecyclePolicy.js';
import { enqueuePhase1FulfillmentJob } from '../queues/phase1FulfillmentProducer.js';
import { fulfillmentDbLimit } from '../lib/fulfillmentDbLimiter.js';
import {
  assertCanonicalTransition,
  CANONICAL_ORDER_STATUS,
} from '../domain/orders/canonicalOrderLifecycle.js';
import {
  assertPhase1FulfillmentQueuePreconditions,
  validateFulfillmentAttemptStatusTransition,
} from '../domain/orders/phase1TransactionStateMachine.js';
import {
  buildPhase1SafeRefs,
  emitPhase1DuplicateFulfillmentBlocked,
  emitPhase1FulfillmentFailed,
  emitPhase1PaymentSucceededButFulfillmentFailedAlert,
} from '../infrastructure/logging/phase1Observability.js';
import { emitOrderTransitionLog } from '../lib/orderTransitionLog.js';

function safeJson(obj) {
  try {
    return JSON.stringify(obj ?? {});
  } catch {
    return '{}';
  }
}

function fulfillmentAttemptJsonSuggestsReloadlyTimeoutOrRateLimit(summary) {
  if (summary == null) return false;
  let obj = summary;
  if (typeof summary === 'string') {
    try {
      obj = JSON.parse(summary);
    } catch {
      return false;
    }
  }
  if (!obj || typeof obj !== 'object') return false;
  if (obj.failureCode === 'reloadly_topup_timeout') return true;
  if (obj.failureCode === 'reloadly_topup_rate_limited') return true;
  const httpStatus = obj.httpStatus;
  if (httpStatus === 429 || httpStatus === '429') return true;
  return false;
}

/**
 * Create a queued fulfillment attempt (idempotent if attempt #1 already exists).
 * Called inside the Stripe webhook transaction after order → PAID.
 *
 * PostgreSQL aborts the whole transaction on a unique violation unless the failing
 * statement is isolated (savepoint). A naive create + catch(P2002) + findFirst breaks
 * with 25P02. We: (1) findFirst to skip duplicate inserts in the same tx; (2) wrap
 * create in SAVEPOINT so concurrent insert races recover cleanly.
 *
 * @param {{ info?: Function, warn?: Function }} [log] — optional webhook/process logger
 */
export async function ensureQueuedFulfillmentAttempt(tx, orderId, log) {
  const orderRow = await tx.paymentCheckout.findUnique({
    where: { id: orderId },
  });
  if (!orderRow) {
    throw new OrderTransitionError(
      'Cannot queue fulfillment: PaymentCheckout row missing',
      'missing_order',
    );
  }
  const pre = assertPhase1FulfillmentQueuePreconditions(orderRow);
  if (!pre.ok) {
    throw new OrderTransitionError(
      `Cannot queue fulfillment: ${pre.reason}${pre.detail != null ? ` (${String(pre.detail)})` : ''}`,
      'fulfillment_queue_precondition_failed',
    );
  }

  const already = await tx.fulfillmentAttempt.findFirst({
    where: { orderId, attemptNumber: 1 },
  });
  if (already) {
    emitFortressIdempotencyNoop('FULFILLMENT_ATTEMPT_ONE_ALREADY_PRESENT', {
      orderIdSuffix: String(orderId).slice(-12),
      attemptIdSuffix: String(already.id).slice(-12),
    });
    emitPhase1DuplicateFulfillmentBlocked(
      buildPhase1SafeRefs({
        id: orderId,
        stripePaymentIntentId: orderRow.stripePaymentIntentId,
      }),
      { via: 'already_present' },
    );
    log?.info?.(
      {
        fulfillmentQueuedAttemptIdempotent: true,
        orderIdSuffix: String(orderId).slice(-12),
        attemptIdSuffix: String(already.id).slice(-12),
        attemptNumber: 1,
      },
      'fulfillment attempt #1 already present (idempotent)',
    );
    return already;
  }

  await tx.$executeRawUnsafe('SAVEPOINT ensure_queued_fulfillment_attempt');

  try {
    const created = await tx.fulfillmentAttempt.create({
      data: {
        orderId,
        attemptNumber: 1,
        status: FULFILLMENT_ATTEMPT_STATUS.QUEUED,
        provider: resolveAirtimeProviderName(),
        requestSummary: JSON.stringify({ phase: 'queued', orderId }),
      },
    });
    await tx.$executeRawUnsafe('RELEASE SAVEPOINT ensure_queued_fulfillment_attempt');
    log?.info?.(
      {
        fulfillmentQueuedAttemptCreated: true,
        orderIdSuffix: String(orderId).slice(-12),
        attemptIdSuffix: String(created.id).slice(-12),
        attemptNumber: 1,
        provider: created.provider ?? null,
      },
      'fulfillment attempt #1 queued after payment',
    );
    return created;
  } catch (error) {
    await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT ensure_queued_fulfillment_attempt');
    if (error?.code !== 'P2002') {
      throw error;
    }
    const existing = await tx.fulfillmentAttempt.findFirst({
      where: { orderId, attemptNumber: 1 },
    });
    if (!existing) {
      throw error;
    }
    emitFortressIdempotencyNoop('FULFILLMENT_ATTEMPT_ONE_ALREADY_PRESENT', {
      orderIdSuffix: String(orderId).slice(-12),
      attemptIdSuffix: String(existing.id).slice(-12),
    });
    emitPhase1DuplicateFulfillmentBlocked(
      buildPhase1SafeRefs({
        id: orderId,
        stripePaymentIntentId: orderRow.stripePaymentIntentId,
      }),
      { via: 'p2002_savepoint_recovery' },
    );
    log?.info?.(
      {
        fulfillmentQueuedAttemptIdempotent: true,
        orderIdSuffix: String(orderId).slice(-12),
        attemptIdSuffix: String(existing.id).slice(-12),
        attemptNumber: 1,
        via: 'p2002_savepoint_recovery',
      },
      'fulfillment attempt #1 already present (idempotent)',
    );
    return existing;
  }
}

/**
 * Claim PAID + QUEUED attempt → PROCESSING + order PAID → PROCESSING, then airtime provider adapter.
 * Safe under concurrency: `updateMany` claim is atomic; duplicate workers get count 0.
 * @param {string} orderId
 * @param {{ traceId?: string | null, bullmqAttemptsMade?: number }} [opts]
 */
export async function processFulfillmentForOrder(orderId, opts = {}) {
  const traceId = opts.traceId ?? getTraceId() ?? randomUUID();
  const requestId = opts.requestId ?? randomUUID();
  const bullmqAttemptsMade =
    opts.bullmqAttemptsMade != null && Number.isFinite(Number(opts.bullmqAttemptsMade))
      ? Number(opts.bullmqAttemptsMade)
      : 0;
  return runWithTrace(traceId, () =>
    runWithCorrelation(
      {
        traceId,
        requestId,
        orderId: String(orderId),
        attemptId: null,
        surface: 'worker',
      },
      () =>
        fulfillmentDbLimit(() =>
          processFulfillmentForOrderInner(orderId, { bullmqAttemptsMade }),
        ),
    ),
  );
}

async function processFulfillmentForOrderInner(orderId, innerOpts = {}) {
  const bullmqAttemptsMade =
    innerOpts.bullmqAttemptsMade != null && Number.isFinite(Number(innerOpts.bullmqAttemptsMade))
      ? Number(innerOpts.bullmqAttemptsMade)
      : 0;
  /** Hot path: one pre-read for terminal fast-exit; claim + completion remain authoritative in transactions. */
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
  if (process.env.NODE_ENV !== 'test') {
    const tid = getTraceId();
    console.log(
      JSON.stringify({
        fulfillmentOrchestration: true,
        t: new Date().toISOString(),
        event: 'fulfillment_claim_attempt',
        orderIdSuffix: String(orderId).slice(-12),
        bullmqAttempt: bullmqAttemptsMade,
        traceIdSuffix: tid ? String(tid).slice(-10) : null,
      }),
    );
  }

  const phase1 = await prisma.$transaction(async (tx) => {
    const order = await tx.paymentCheckout.findUnique({
      where: { id: orderId },
    });
    if (!order || order.orderStatus !== ORDER_STATUS.PAID) {
      return null;
    }

    const gate = canOrderProceedToFulfillment(order, { lifecycle: 'PAID_ONLY' });
    if (!gate.ok) {
      emitFortressIdempotencyNoop('FULFILLMENT_GATE_BLOCKS_CLAIM', {
        orderIdSuffix: String(orderId).slice(-12),
        denial: gate.denial,
        detail: gate.detail ?? null,
      });
      return null;
    }

    const attempt = await tx.fulfillmentAttempt.findFirst({
      where: {
        orderId,
        status: FULFILLMENT_ATTEMPT_STATUS.QUEUED,
      },
      orderBy: { attemptNumber: 'asc' },
    });
    if (!attempt) {
      return null;
    }

    const queuedToProcessing = validateFulfillmentAttemptStatusTransition(
      attempt.status,
      FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
    );
    if (!queuedToProcessing.ok) {
      throw new OrderTransitionError(
        `Fulfillment attempt transition denied: ${queuedToProcessing.detail ?? queuedToProcessing.denial}`,
        'invalid_fulfillment_attempt_transition',
      );
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
    const payClaim = validatePaymentCheckoutStatusTransition(
      order.status,
      PAYMENT_CHECKOUT_STATUS.RECHARGE_PENDING,
    );
    if (!payClaim.ok) {
      emitFortressIdempotencyNoop('PAYMENT_ROW_TRANSITION_DENIED_AT_CLAIM', {
        orderIdSuffix: String(orderId).slice(-12),
        denial: payClaim.denial,
        detail: payClaim.detail ?? null,
      });
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

    return { attemptId: attempt.id, attemptNumber: attempt.attemptNumber };
  });

  if (!phase1) {
    return;
  }

  {
    const q2s = assertCanonicalTransition(
      CANONICAL_ORDER_STATUS.QUEUED,
      CANONICAL_ORDER_STATUS.SENT,
    );
    if (q2s.ok) {
      emitOrderTransitionLog(undefined, {
        orderId,
        from: CANONICAL_ORDER_STATUS.QUEUED,
        to: CANONICAL_ORDER_STATUS.SENT,
      });
    }
  }

  mergeOrderAttemptIntoCorrelation({
    orderId,
    attemptId: phase1.attemptId,
  });

  logOpsEvent({
    domain: 'fulfillment',
    event: 'fulfillment_attempt_claimed',
    outcome: 'processing',
    orderId,
    traceId: getTraceId(),
    extra: {
      attemptNumber: phase1.attemptNumber,
      attemptIdSuffix: String(phase1.attemptId).slice(-12),
    },
  });
  emitPhase1OperationalEvent('fulfillment_attempt_started', {
    traceId: getTraceId() ?? null,
    orderIdSuffix: String(orderId).slice(-12),
    attemptNumber: phase1.attemptNumber,
  });

  const orderRow = await prisma.paymentCheckout.findUnique({
    where: { id: orderId },
  });
  if (!orderRow || orderRow.orderStatus !== ORDER_STATUS.PROCESSING) {
    return;
  }

  const attemptPeek = await prisma.fulfillmentAttempt.findUnique({
    where: { id: phase1.attemptId },
    select: { responseSummary: true, startedAt: true },
  });
  const forceProviderInquiryBeforePost =
    String(env.airtimeProvider ?? '').toLowerCase() === 'reloadly' &&
    fulfillmentAttemptJsonSuggestsReloadlyTimeoutOrRateLimit(attemptPeek?.responseSummary);

  /** Delivery I/O runs outside DB transactions (timeouts / HTTP). */
  let providerResult;
  let providerOutcome = AIRTIME_OUTCOME.FAILURE;
  const tDelivery = Date.now();
  try {
    providerResult = await executeDelivery(orderRow, {
      attemptId: phase1.attemptId,
      attemptNumber: phase1.attemptNumber,
      traceId: getTraceId(),
      bullmqAttemptsMade,
      forceProviderInquiryBeforePost,
      attemptStartedAt: attemptPeek?.startedAt ?? null,
    });
    providerOutcome = providerResult.outcome;
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      (err.code === 'PROVIDER_CIRCUIT_OPEN' || err.code === 'PROVIDER_RATE_LIMIT_REGIME')
    ) {
      recordFulfillmentMoneyPathDurationMs(Date.now() - tDelivery);
      throw err;
    }
    const { errorKind, failureCode } = classifyProviderError(err);
    const failureClass = classifyTransactionFailure(err, { surface: 'provider' });
    const retry = transactionRetryDirective(failureClass, { attempt: 0 });
    logDeliveryEvent({
      orderId,
      phase: 'provider_io',
      result: 'exception',
      failureReason: failureCode,
      detail: 'transaction_failure_classified',
      meta: {
        transactionFailureClass: failureClass,
        retryMaySchedule: retry.mayScheduleRetry,
        retryReason: retry.reason,
        retrySuggestedBackoffMs: retry.suggestedBackoffMs,
      },
    });
    const providerCorrelationId = buildProviderExecutionCorrelationId(
      phase1.attemptId,
      orderId,
    );
    providerResult = {
      outcome: AIRTIME_OUTCOME.FAILURE,
      providerKey: resolveAirtimeProviderName(),
      failureCode,
      failureMessage: String(err?.message ?? err).slice(0, 300),
      errorKind,
      requestSummary: providerCorrelationId ? { providerCorrelationId } : {},
      responseSummary: {
        diagnostic: safeErrorDiagnostics(err),
        ...(providerCorrelationId ? { providerCorrelationId } : {}),
      },
    };
    providerOutcome = AIRTIME_OUTCOME.FAILURE;
  }
  recordFulfillmentMoneyPathDurationMs(Date.now() - tDelivery);

  providerResult = normalizeFulfillmentProviderResult(providerResult, {
    orderId,
  });
  providerOutcome =
    providerResult.outcome != null && providerResult.outcome !== ''
      ? providerResult.outcome
      : AIRTIME_OUTCOME.FAILURE;

  let canonicalPostFulfillmentTransition = null;

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

        const providerCostFromApi = extractProviderCostUsdCentsFromResponse(
          providerResult.responseSummary,
        );
        const providerKeyLower = String(providerResult.providerKey ?? '').toLowerCase();
        let providerCostTruthSource = 'locked_estimate';
        if (providerCostFromApi != null) {
          providerCostTruthSource = 'provider_api';
        } else if (providerKeyLower === 'reloadly') {
          providerCostTruthSource = 'unverified';
        }
        const fulfillmentTruthSnapshot = buildFulfillmentTruthSnapshot(
          order,
          providerResult,
        );

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
            providerCostActualUsdCents: providerCostFromApi ?? null,
            providerCostTruthSource,
            fulfillmentProviderReference: providerResult.providerReference ?? null,
            fulfillmentProviderKey: providerResult.providerKey ?? null,
            fulfillmentTruthSnapshot,
          },
        });
        if (done.count === 0) {
          return null;
        }

        const toSucceeded = validateFulfillmentAttemptStatusTransition(
          att.status,
          FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED,
        );
        if (!toSucceeded.ok) {
          throw new OrderTransitionError(
            `Fulfillment attempt transition denied: ${toSucceeded.detail ?? toSucceeded.denial}`,
            'invalid_fulfillment_attempt_transition',
          );
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

        if (env.loyaltyAutoGrantOnDelivery) {
          await grantLoyaltyPointsForDeliveredOrderInTx(tx, {
            id: order.id,
            userId: order.userId,
            amountUsdCents: order.amountUsdCents,
          });
        } else {
          await writeOrderAudit(tx, {
            event: 'loyalty_grant_suppressed',
            payload: {
              orderId,
              reason: 'LOYALTY_AUTO_GRANT_ON_DELIVERY=false',
            },
            ip: null,
          });
        }

        canonicalPostFulfillmentTransition = {
          orderId,
          from: CANONICAL_ORDER_STATUS.SENT,
          to: CANONICAL_ORDER_STATUS.DELIVERED,
        };

        return {
          orderId,
          snapshot,
          usedApiCost:
            snapshot.marginProviderCostSource ===
            MARGIN_PROVIDER_COST_SOURCE.PROVIDER_API,
        };
      }

      if (
        providerResult.outcome === AIRTIME_OUTCOME.PENDING_VERIFICATION ||
        providerResult.outcome === AIRTIME_OUTCOME.AMBIGUOUS
      ) {
        await tx.fulfillmentAttempt.update({
          where: { id: att.id },
          data: {
            status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
            provider: providerResult.providerKey ?? att.provider,
            providerReference: providerResult.providerReference ?? null,
            requestSummary: reqStr,
            responseSummary: resStr,
          },
        });
        const classKey =
          providerResult.outcome === AIRTIME_OUTCOME.AMBIGUOUS
            ? 'reloadly_ambiguous_provider_response'
            : 'reloadly_pending_provider_verification';
        const newMeta = mergeManualRequiredMetadata(order.metadata, {
          reason: classKey,
          traceId,
          classification: 'provider_truth_uncertain',
        });
        await tx.paymentCheckout.updateMany({
          where: { id: orderId, orderStatus: ORDER_STATUS.PROCESSING },
          data: { metadata: newMeta },
        });
        await writeOrderAudit(tx, {
          event: 'delivery_verifying',
          payload: {
            orderId,
            attemptId: att.id,
            outcome: providerResult.outcome,
          },
          ip: null,
        });
        recordFulfillmentManualInterventionPath('provider_truth_uncertain');
        return null;
      }

      if (providerResult.outcome === AIRTIME_OUTCOME.UNAVAILABLE) {
        const resObj =
          providerResult.responseSummary && typeof providerResult.responseSummary === 'object'
            ? { ...providerResult.responseSummary }
            : {};
        resObj.normalizedOutcome = 'provider_unavailable';
        await tx.fulfillmentAttempt.update({
          where: { id: att.id },
          data: {
            status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
            provider: providerResult.providerKey ?? att.provider,
            providerReference: providerResult.providerReference ?? null,
            requestSummary: reqStr,
            responseSummary: safeJson(resObj),
          },
        });
        const newMeta = mergeManualRequiredMetadata(order.metadata, {
          reason: 'provider_unavailable',
          traceId: getTraceId(),
          classification: 'provider_not_ready_or_misconfigured',
          failureCode: providerResult.failureCode ?? null,
        });
        await tx.paymentCheckout.updateMany({
          where: { id: orderId, orderStatus: ORDER_STATUS.PROCESSING },
          data: { metadata: newMeta },
        });
        await writeOrderAudit(tx, {
          event: 'delivery_provider_unavailable',
          payload: {
            orderId,
            attemptId: att.id,
            failureCode: providerResult.failureCode ?? null,
          },
          ip: null,
        });
        recordFulfillmentManualInterventionPath('provider_unavailable');
        return null;
      }

      if (providerResult.outcome === AIRTIME_OUTCOME.FAILURE) {
        const attemptsSnap = await tx.fulfillmentAttempt.findMany({
          where: { orderId },
          orderBy: { attemptNumber: 'asc' },
        });
        const failConf = detectFailureConfidence(order, attemptsSnap, providerResult);
        if (failConf !== FAILURE_CONFIDENCE.STRONG_FAILURE) {
          const resObj =
            providerResult.responseSummary && typeof providerResult.responseSummary === 'object'
              ? { ...providerResult.responseSummary }
              : {};
          resObj.normalizedOutcome = 'failure_unconfirmed';
          resObj.proofClassification = 'insufficient_negative_proof';
          resObj.failureConfidence = failConf;
          await tx.fulfillmentAttempt.update({
            where: { id: att.id },
            data: {
              status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
              provider: providerResult.providerKey ?? att.provider,
              providerReference: providerResult.providerReference ?? null,
              requestSummary: reqStr,
              responseSummary: safeJson(resObj),
            },
          });
          const newMeta = mergeManualRequiredMetadata(order.metadata, {
            reason: 'reloadly_failure_low_confidence',
            traceId: getTraceId(),
            classification: 'failure_confidence_insufficient',
            failureConfidence: failConf,
          });
          await tx.paymentCheckout.updateMany({
            where: { id: orderId, orderStatus: ORDER_STATUS.PROCESSING },
            data: { metadata: newMeta },
          });
          await writeOrderAudit(tx, {
            event: 'delivery_failure_blocked',
            payload: {
              orderId,
              attemptId: att.id,
              failureConfidence: failConf,
            },
            ip: null,
          });
          emitReloadlyFulfillmentEvent(undefined, 'warn', 'reloadly_failure_blocked_due_to_ambiguity', {
            ...reloadlyFulfillmentBaseFields(orderId, {
              traceId: getTraceId(),
              attemptNumber: phase1.attemptNumber,
              providerReference: providerResult.providerReference ?? null,
              normalizedOutcome: 'failure_unconfirmed',
              decisionPath: 'fulfillment_completion_tx',
              proofClassification: 'insufficient_negative_proof',
            }),
          });
          return null;
        }

        const toFailed = validateFulfillmentAttemptStatusTransition(
          att.status,
          FULFILLMENT_ATTEMPT_STATUS.FAILED,
        );
        if (!toFailed.ok) {
          throw new OrderTransitionError(
            `Fulfillment attempt transition denied: ${toFailed.detail ?? toFailed.denial}`,
            'invalid_fulfillment_attempt_transition',
          );
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
            transientRetryHint: transientRetryHintFromProviderResult(providerResult),
          },
          ip: null,
        });
        emitPhase1FulfillmentFailed(
          {
            id: orderId,
            stripePaymentIntentId: order.stripePaymentIntentId,
          },
          {
            provider: providerResult.providerKey ?? att.provider ?? null,
            errorCode:
              providerResult.failureCode ??
              providerResult.errorKind ??
              'airtime_provider_failure',
          },
          att,
        );
        if (
          typeof order.stripePaymentIntentId === 'string' &&
          order.stripePaymentIntentId.startsWith('pi_')
        ) {
          emitPhase1PaymentSucceededButFulfillmentFailedAlert({
            ...buildPhase1SafeRefs(
              {
                id: orderId,
                stripePaymentIntentId: order.stripePaymentIntentId,
              },
              att,
            ),
            provider: providerResult.providerKey ?? att.provider ?? null,
            errorCode:
              providerResult.failureCode ??
              providerResult.errorKind ??
              'airtime_provider_failure',
          });
        }
        canonicalPostFulfillmentTransition = {
          orderId,
          from: CANONICAL_ORDER_STATUS.SENT,
          to: CANONICAL_ORDER_STATUS.FAILED,
          reason:
            providerResult.failureCode ??
            providerResult.errorKind ??
            'airtime_provider_failure',
        };
        return null;
      }

      {
        const resObj =
          providerResult.responseSummary && typeof providerResult.responseSummary === 'object'
            ? { ...providerResult.responseSummary }
            : {};
        resObj.normalizedOutcome = 'unknown_provider_outcome';
        resObj.rawOutcome =
          providerResult.outcome != null ? String(providerResult.outcome) : null;
        await tx.fulfillmentAttempt.update({
          where: { id: att.id },
          data: {
            status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
            provider: providerResult.providerKey ?? att.provider,
            providerReference: providerResult.providerReference ?? null,
            requestSummary: reqStr,
            responseSummary: safeJson(resObj),
          },
        });
        const newMeta = mergeManualRequiredMetadata(order.metadata, {
          reason: 'unknown_provider_outcome',
          traceId: getTraceId(),
          classification: 'provider_response_shape_unexpected',
        });
        await tx.paymentCheckout.updateMany({
          where: { id: orderId, orderStatus: ORDER_STATUS.PROCESSING },
          data: { metadata: newMeta },
        });
        await writeOrderAudit(tx, {
          event: 'delivery_unknown_outcome',
          payload: {
            orderId,
            attemptId: att.id,
            outcome: providerResult.outcome ?? null,
          },
          ip: null,
        });
        recordFulfillmentManualInterventionPath('unknown_provider_outcome');
        return null;
      }
    });

    if (canonicalPostFulfillmentTransition) {
      const step = assertCanonicalTransition(
        canonicalPostFulfillmentTransition.from,
        canonicalPostFulfillmentTransition.to,
      );
      if (!step.ok) {
        console.error(
          JSON.stringify({
            event: 'canonical_transition_denied',
            orderId: canonicalPostFulfillmentTransition.orderId,
            denial: step,
          }),
        );
      } else {
        emitOrderTransitionLog(undefined, canonicalPostFulfillmentTransition);
      }
      canonicalPostFulfillmentTransition = null;
    }

    if (marginTelemetry) {
      recordMarginIntelAfterSnapshot(
        marginTelemetry.orderId,
        marginTelemetry.snapshot,
        marginTelemetry.usedApiCost,
        env.marginLowRouteBp,
      );
      /** Test-only: simulates post-commit follow-up failure (integration proofs). */
      if (process.env.ZW_TEST_INJECT_POST_COMMIT_FOLLOWUP_THROW === 'true') {
        throw new Error('zw_test_post_commit_followup');
      }
      scheduleReferralEvaluationAfterDelivery(orderId, getTraceId());
      scheduleFinancialTruthRecompute(orderId);
      logOpsEvent({
        domain: 'fulfillment',
        event: 'fulfillment_delivered',
        outcome: 'ok',
        orderId: marginTelemetry.orderId,
        traceId: getTraceId(),
      });
    }

    schedulePushSideEffect(() => emitFulfillmentTerminalSideEffects(orderId), getTraceId());
  } catch (err) {
    console.error('[fulfillment] completion phase failed', orderId, err);
    const traceId = getTraceId();

    if (providerOutcome === AIRTIME_OUTCOME.SUCCESS) {
      const orderSnap = await prisma.paymentCheckout.findUnique({
        where: { id: orderId },
        select: { orderStatus: true, metadata: true },
      });

      /**
       * Delivery row already committed (FULFILLED) but margin/referral/financial hooks failed after commit.
       * Not silent: audit + integrity event — operators reconcile side effects; money row is not "undone".
       */
      if (orderSnap?.orderStatus === ORDER_STATUS.FULFILLED) {
        await writeOrderAudit(prisma, {
          event: 'delivery_post_commit_followup_failed',
          payload: {
            orderId,
            attemptId: phase1.attemptId,
            errorClass: err?.name ?? 'Error',
            message: String(err?.message ?? err).slice(0, 500),
          },
          ip: null,
        });
        logFulfillmentIntegrityEvent('fulfillment_post_commit_followup_failed', {
          orderId,
          traceId,
          severity: 'ERROR',
          extra: {
            attemptIdSuffix: String(phase1.attemptId).slice(-8),
            note:
              'FULFILLED committed; post-commit follow-up (margin intel / referral / financial recompute) failed',
          },
        });
        logManualRequiredAlert({
          event: 'manual_required_detected',
          severity: 'WARN',
          traceId,
          orderId,
          extra: { classification: 'post_commit_followup_failed' },
        });
        return;
      }

      await prisma.$transaction(async (tx) => {
        const orderNow = await tx.paymentCheckout.findUnique({
          where: { id: orderId },
          select: { metadata: true, orderStatus: true },
        });
        if (!orderNow || orderNow.orderStatus !== ORDER_STATUS.PROCESSING) {
          return;
        }
        const newMeta = mergeManualRequiredMetadata(orderNow.metadata, {
          reason: 'post_provider_success_db_orchestration_failed',
          traceId,
          classification: 'orchestration_post_provider_success',
        });
        await tx.paymentCheckout.updateMany({
          where: { id: orderId, orderStatus: ORDER_STATUS.PROCESSING },
          data: { metadata: newMeta },
        });
        await writeOrderAudit(tx, {
          event: 'delivery_orchestration_failed',
          payload: {
            orderId,
            attemptId: phase1.attemptId,
            mode: 'manual_required_after_provider_success',
            errorClass: err?.name ?? 'Error',
          },
          ip: null,
        });
      });
      logFulfillmentIntegrityEvent('fulfillment_orchestration_failed_after_provider_success', {
        orderId,
        traceId,
        severity: 'ERROR',
        extra: { attemptIdSuffix: String(phase1.attemptId).slice(-8) },
      });
      logManualRequiredAlert({
        event: 'manual_required_detected',
        severity: 'CRITICAL',
        traceId,
        orderId,
        extra: { classification: 'orchestration_post_provider_success' },
      });
      return;
    }

    const attemptsForConf = await prisma.fulfillmentAttempt.findMany({
      where: { orderId },
      orderBy: { attemptNumber: 'asc' },
    });
    const failConf = detectFailureConfidence(
      null,
      attemptsForConf,
      providerResult,
    );
    const fragile = isDbOrchestrationFragileError(err);
    const allowTerminalFail =
      failConf === FAILURE_CONFIDENCE.STRONG_FAILURE && !fragile;

    if (!allowTerminalFail) {
      await prisma.$transaction(async (tx) => {
        const orderNow = await tx.paymentCheckout.findUnique({
          where: { id: orderId },
          select: { metadata: true, orderStatus: true },
        });
        if (!orderNow || orderNow.orderStatus !== ORDER_STATUS.PROCESSING) {
          return;
        }
        const newMeta = mergeManualRequiredMetadata(orderNow.metadata, {
          reason: 'failure_confidence_insufficient_or_db_fragile',
          traceId,
          classification: 'failure_orchestration_low_confidence',
        });
        await tx.paymentCheckout.updateMany({
          where: { id: orderId, orderStatus: ORDER_STATUS.PROCESSING },
          data: { metadata: newMeta },
        });
        await writeOrderAudit(tx, {
          event: 'delivery_orchestration_failed',
          payload: {
            orderId,
            attemptId: phase1.attemptId,
            mode: 'manual_required_low_failure_confidence',
            failureConfidence: failConf,
            dbFragile: fragile,
          },
          ip: null,
        });
      });
      logFulfillmentIntegrityEvent('fulfillment_orchestration_failure_low_confidence', {
        orderId,
        traceId,
        severity: 'WARN',
        extra: { failureConfidence: failConf, dbFragile: fragile },
      });
      logManualRequiredAlert({
        event: 'manual_required_detected',
        severity: 'WARN',
        traceId,
        orderId,
        extra: { classification: 'failure_orchestration_low_confidence' },
      });
      return;
    }

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
        payload: {
          orderId,
          attemptId: att.id,
          mode: 'terminal_fail_after_provider_failure',
          failureConfidence: failConf,
        },
        ip: null,
      });
    });

    const postOrchestrationFailSnap = await prisma.paymentCheckout.findUnique({
      where: { id: orderId },
      select: { orderStatus: true },
    });
    if (postOrchestrationFailSnap?.orderStatus === ORDER_STATUS.FAILED) {
      emitOrderTransitionLog(undefined, {
        orderId,
        from: CANONICAL_ORDER_STATUS.SENT,
        to: CANONICAL_ORDER_STATUS.FAILED,
        reason: 'fulfillment_processing_error',
      });
    }

    schedulePushSideEffect(() => emitFulfillmentTerminalSideEffects(orderId), getTraceId());
  }
}

/**
 * Drain queued attempts (e.g. cron or recovery if async scheduling missed).
 *
 * Retries: `AUTO_RETRY_ENABLED` is false (`retryPolicy.js`). Safe follow-up eligibility is evaluated by
 * `evaluatePhase1OperationalRetrySchedule` / `shouldScheduleFollowUpFulfillmentAttempt` in
 * `domain/fulfillment/phase1OperationalRetry.js`. New attempts must not duplicate paid/fulfilled work
 * (unique constraints + terminal state checks).
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
    if (env.fulfillmentQueueEnabled) {
      const enq = await enqueuePhase1FulfillmentJob(r.orderId, null);
      if (enq.ok) continue;
    }
    await processFulfillmentForOrder(r.orderId);
  }
}

/**
 * @param {string} orderId
 * @param {string | null | undefined} traceId from HTTP/webhook request when known
 *
 * **Single fulfillment I/O path:** when the queue is off, enqueue fails, or enqueue returns
 * `ok: false`, the next step is exactly one `processFulfillmentForOrder` call — same function the
 * BullMQ worker invokes. No parallel remediation engine; recovery (`processingRecoveryService`)
 * relies on this for bounded re-dispatch after `revert_paid` / `retry_new_attempt`.
 */
export function scheduleFulfillmentProcessing(orderId, traceId) {
  const im = setImmediate(() => {
    (async () => {
      const row = await prisma.paymentCheckout.findUnique({
        where: { id: orderId },
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
        emitFortressIdempotencyNoop('FULFILLMENT_SCHEDULE_SKIPPED_GATE', {
          orderIdSuffix: String(orderId).slice(-12),
          denial: gate.denial,
        });
        emitPhase1OperationalEvent('fulfillment_schedule_skipped', {
          traceId: traceId ?? null,
          orderIdSuffix: String(orderId).slice(-12),
          denial: gate.denial,
        });
        return;
      }
      if (env.fulfillmentQueueEnabled) {
        const enq = await enqueuePhase1FulfillmentJob(orderId, traceId);
        if (enq.ok) {
          emitPhase1OperationalEvent('fulfillment_enqueued', {
            traceId: traceId ?? null,
            orderIdSuffix: String(orderId).slice(-12),
            queueJobId: enq.jobId,
          });
          emitMoneyPathLog(MONEY_PATH_EVENT.FULFILLMENT_QUEUED, {
            traceId: traceId ?? null,
            orderIdSuffix: String(orderId).slice(-12),
            via: 'bullmq',
            deduped: Boolean(enq.deduped),
          });
          return;
        }
        emitPhase1OperationalEvent('fulfillment_enqueue_failed_inline_fallback', {
          traceId: traceId ?? null,
          orderIdSuffix: String(orderId).slice(-12),
          reason: enq.reason,
        });
      }
      emitMoneyPathLog(MONEY_PATH_EVENT.FULFILLMENT_DISPATCH_START, {
        traceId: traceId ?? null,
        orderIdSuffix: String(orderId).slice(-12),
        via: 'inline_schedule',
      });
      await processFulfillmentForOrder(orderId, { traceId });
      emitMoneyPathLog(MONEY_PATH_EVENT.FULFILLMENT_SUCCESS, {
        traceId: traceId ?? null,
        orderIdSuffix: String(orderId).slice(-12),
        via: 'inline_schedule',
      });
    })().catch((err) => {
      const failureClass = classifyTransactionFailure(err, {
        surface: 'fulfillment_schedule',
      });
      const retryDirective = transactionRetryDirective(failureClass, { attempt: 0 });
      const operationalClass = operationalClassFromTransactionFailure(failureClass);
      emitMoneyPathLog(MONEY_PATH_EVENT.FULFILLMENT_FAILURE, {
        traceId: traceId ?? null,
        orderIdSuffix: String(orderId).slice(-12),
        surface: 'fulfillment_schedule',
        message: String(err?.message ?? err).slice(0, 200),
      });
      emitMoneyPathLog(MONEY_PATH_EVENT.RETRY_DECISION, {
        traceId: traceId ?? null,
        surface: 'fulfillment_schedule',
        orderIdSuffix: String(orderId).slice(-12),
        transactionFailureClass: failureClass,
        retryMaySchedule: retryDirective.mayScheduleRetry,
        retryReason: retryDirective.reason,
      });
      emitPhase1OperationalEvent('fulfillment_schedule_async_failed', {
        traceId: traceId ?? null,
        orderIdSuffix: String(orderId).slice(-12),
        errName: err?.name,
        errMessage: String(err?.message ?? err).slice(0, 300),
        transactionFailureClass: failureClass,
        operationalClass,
        retryMaySchedule: retryDirective.mayScheduleRetry,
        retryReason: retryDirective.reason,
      });
      logOpsEvent({
        domain: 'fulfillment_schedule',
        event: 'async_schedule_failed',
        outcome: 'error',
        orderId,
        traceId,
        extra: {
          transactionFailureClass: failureClass,
          operationalClass,
        },
      });
    });
  });
  if (
    String(process.env.ZW_INTEGRATION_TEST ?? '').trim() === '1' &&
    im &&
    typeof im.unref === 'function'
  ) {
    im.unref();
  }
}

/** Explicit entry point for paid → processing → provider → terminal state. */
export async function markProcessing(orderId, opts = {}) {
  return processFulfillmentForOrder(orderId, opts);
}
