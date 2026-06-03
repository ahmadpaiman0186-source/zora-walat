import { Router } from 'express';

import { env } from '../config/env.js';
import { getStripeClient } from '../services/stripe.js';
import { prisma, Prisma } from '../db.js';
import { isLikelyPaymentCheckoutId } from '../lib/paymentCheckoutId.js';
import { writeOrderAudit } from '../services/orderAuditService.js';
import { scheduleFulfillmentProcessing } from '../services/fulfillmentProcessingService.js';
import {
  emitPaymentSuccessSideEffect,
  schedulePushSideEffect,
} from '../services/pushNotifications/userNotificationPipeline.js';
import {
  handleWebTopupPaymentIntentFailed,
  handleWebTopupPaymentIntentSucceeded,
} from '../services/topupOrder/webtopupWebhookHandlers.js';
import { scheduleWebTopupFulfillmentAfterPaid } from '../services/topupFulfillment/webTopupFulfillmentService.js';
import { safeSuffix, webTopupLog } from '../lib/webTopupObservability.js';
import {
  recordPaymentCheckoutOutcome,
  bumpCounter,
  recordRetry,
  recordMoneyPathOpsSignal,
} from '../lib/opsMetrics.js';
import {
  isStripeWebhookEventShadowAck,
  setStripeWebhookEventShadowAck,
} from '../services/moneyPathRedisRegistry.js';
import {
  evaluateRollingAlerts,
  emitProviderDegradationAlert,
} from '../lib/opsAlerts.js';
import { classifyFailure } from '../reliability/failureClassifier.js';
import { emitReliabilityFailureDetected } from '../reliability/reliabilityL7Log.js';
import { logOpsEvent } from '../lib/opsLog.js';
import { schedulePaymentCheckoutStripeFeeCapture } from '../services/paymentCheckoutStripeFeeService.js';
import {
  applyPhase1CheckoutSessionCompleted,
  paymentCheckoutPendingForPhase1CheckoutSessionPaidReplay,
  resolvePhase1CheckoutCorrelationTraceId,
} from '../services/phase1StripeCheckoutSessionCompleted.js';
import { applyPhase1CheckoutSessionExpired } from '../services/phase1StripeCheckoutSessionExpired.js';
import { logStripeWebhookLifecycle } from '../lib/stripeWebhookLifecycleLog.js';
import {
  applyPhase1ChargeRefunded,
  applyPhase1DisputeCreated,
  DisputeChargeLookupError,
  resolvePhase1DisputePaymentIntentForWebhook,
} from '../services/phase1StripeChargeIncidents.js';
import { MONEY_PATH_EVENT } from '../domain/payments/moneyPathEvents.js';
import { emitMoneyPathLog } from '../infrastructure/logging/moneyPathLog.js';
import { emitPhase1OperationalEvent } from '../lib/phase1OperationalEvents.js';
import { classifyTransactionFailure } from '../constants/transactionFailureClass.js';
import { transactionRetryDirective } from '../lib/transactionRetryPolicy.js';
import { enrichReliabilityDecisionWithSeverity } from '../services/reliability/failureSeverity.js';
import { recordReliabilityDecision } from '../services/reliability/watchdog.js';
import { API_CONTRACT_CODE } from '../constants/apiContractCodes.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';
import {
  recordMissionWebhookInvalidSig,
  recordMissionWebhookReceived,
} from '../infrastructure/observability/phase1MissionObservability.js';
import { emitL7MoneyPathSpan } from '../infrastructure/logging/l7MoneyPathObservability.js';

const router = Router();

/**
 * Suffix-only correlation refs from the verified Stripe event (read-only; no DB).
 * @param {import('stripe').Stripe.Event} event
 * @returns {Record<string, unknown> | null}
 */
function buildStripeWebhookVerifiedL7Refs(event) {
  const stripeEventType = event?.type;
  if (!stripeEventType || !event?.data?.object) return null;
  const stripeEventIdSuffix = safeSuffix(event.id, 8);
  const obj = event.data.object;

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.expired'
  ) {
    const raw = obj.metadata?.internalCheckoutId;
    if (raw && isLikelyPaymentCheckoutId(String(raw))) {
      return {
        stripeEventType,
        stripeEventIdSuffix,
        checkoutIdSuffix: safeSuffix(String(raw), 10),
        stripeSessionIdSuffix:
          typeof obj.id === 'string' ? safeSuffix(obj.id, 12) : null,
      };
    }
    return null;
  }

  if (
    event.type === 'payment_intent.succeeded' ||
    event.type === 'payment_intent.payment_failed'
  ) {
    const piId = typeof obj.id === 'string' && obj.id.startsWith('pi_') ? obj.id : null;
    if (!piId) return null;
    return {
      stripeEventType,
      stripeEventIdSuffix,
      paymentIntentIdSuffix: safeSuffix(piId, 12),
    };
  }

  if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
    const piRaw = obj.payment_intent;
    const piId =
      typeof piRaw === 'string'
        ? piRaw
        : piRaw && typeof piRaw === 'object' && typeof piRaw.id === 'string'
          ? piRaw.id
          : null;
    if (typeof piId === 'string' && piId.startsWith('pi_')) {
      return {
        stripeEventType,
        stripeEventIdSuffix,
        paymentIntentIdSuffix: safeSuffix(piId, 12),
      };
    }
    const chId = typeof obj.id === 'string' ? obj.id : null;
    if (!chId) return null;
    return {
      stripeEventType,
      stripeEventIdSuffix,
      chargeIdSuffix: safeSuffix(chId, 12),
    };
  }

  return null;
}

/**
 * Stripe webhook — raw body required for `constructEvent`.
 * Production: `STRIPE_WEBHOOK_SECRET` is required at process startup (see `src/index.js`).
 */
router.post('/', async (req, res) => {
  emitMoneyPathLog(MONEY_PATH_EVENT.WEBHOOK_HTTP_RECEIVED, {
    traceId: req.traceId ?? null,
  });
  logStripeWebhookLifecycle('webhook_received', {
    traceId: req.traceId ?? null,
    path: 'express',
  });

  const stripe = getStripeClient();
  const secret = env.stripeWebhookSecret;
  if (!stripe || !secret) {
    console.error(
      '❌ WEBHOOK ERROR: Stripe client or STRIPE_WEBHOOK_SECRET not configured. Run: stripe listen --forward-to http://127.0.0.1:8787/webhooks/stripe — then paste whsec_ into server/.env as STRIPE_WEBHOOK_SECRET, save the file, restart the server.',
    );
    req.log?.warn(
      { securityEvent: 'webhook_not_configured' },
      'security',
    );
    return res
      .status(503)
      .json(
        clientErrorBody(
          'Service unavailable',
          API_CONTRACT_CODE.INTERNAL_ERROR,
        ),
      );
  }

  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    console.error('❌ WEBHOOK ERROR:', 'Missing or invalid Stripe-Signature header');
    return res
      .status(400)
      .json(
        clientErrorBody('Invalid request', API_CONTRACT_CODE.VALIDATION_ERROR),
      );
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
    /** Dev-only: grep-friendly signature-verification proof (Stripe event ids only). */
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[stripe_webhook_proof]',
        JSON.stringify({ eventType: event.type, eventId: event.id }),
      );
    }
    emitMoneyPathLog(MONEY_PATH_EVENT.WEBHOOK_VERIFIED, {
      traceId: req.traceId ?? null,
      stripeEventType: event.type,
      stripeEventIdSuffix: safeSuffix(event.id, 8),
    });
    logStripeWebhookLifecycle('signature_verified', {
      success: true,
      stripeEventType: event.type,
      stripeEventIdSuffix: safeSuffix(event.id, 8),
      traceId: req.traceId ?? null,
    });
    recordMissionWebhookReceived(req.traceId ?? null, safeSuffix(event.id, 8));
  } catch (err) {
    const body = req.body;
    const bodyLen = Buffer.isBuffer(body)
      ? body.length
      : typeof body === 'string'
        ? body.length
        : body == null
          ? 0
          : null;
    recordMissionWebhookInvalidSig(req.traceId ?? null);
    const l7Sig = classifyFailure({
      signal: 'stripe_webhook_signature_invalid',
      source: 'stripe_webhook',
    });
    emitReliabilityFailureDetected({
      traceId: req.traceId ?? null,
      failureClass: l7Sig.failureClass,
      severity: l7Sig.severity,
      safeRecoveryAction: l7Sig.safeRecoveryAction,
      orderIdSuffix: null,
    });
    logStripeWebhookLifecycle('signature_verified', {
      success: false,
      reason: 'construct_event_failed',
      traceId: req.traceId ?? null,
    });
    emitMoneyPathLog(MONEY_PATH_EVENT.WEBHOOK_VERIFY_FAILED, {
      traceId: req.traceId ?? null,
      stripeWebhookSignatureInvalid: true,
      bodyKind: Buffer.isBuffer(body)
        ? 'Buffer'
        : body == null
          ? 'missing'
          : typeof body,
      bodyLength: bodyLen,
      message: String(err?.message ?? err).slice(0, 200),
    });
    req.log?.warn(
      { securityEvent: 'stripe_webhook_signature_invalid' },
      'security',
    );
    return res.status(400).send(`Webhook Error: ${err?.message ?? 'Invalid signature'}`);
  }

  const stripeEventIdSuffix = safeSuffix(event.id, 8);
  webTopupLog(req.log, 'info', 'webhook_received', {
    stripeEventType: event.type,
    stripeEventIdSuffix,
    traceId: req.traceId ?? null,
  });

  if (await isStripeWebhookEventShadowAck(event.id)) {
    let shadowFastAck = true;
    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object;
      const raw =
        session && typeof session === 'object'
          ? session.metadata?.internalCheckoutId
          : null;
      if (raw && isLikelyPaymentCheckoutId(String(raw))) {
        const row = await prisma.paymentCheckout.findUnique({
          where: { id: String(raw) },
          select: { userId: true, orderStatus: true, status: true },
        });
        if (paymentCheckoutPendingForPhase1CheckoutSessionPaidReplay(row)) {
          shadowFastAck = false;
          recordMoneyPathOpsSignal('stripe_webhook_shadow_suppressed_pending_checkout');
          webTopupLog(req.log, 'warn', 'webhook_shadow_ack_suppressed_pending_checkout', {
            reason: 'replay_checkout_session_completed_for_paid_transition',
            stripeEventType: event.type,
            stripeEventIdSuffix,
            orderIdSuffix: safeSuffix(String(raw), 10),
            traceId: req.traceId ?? null,
          });
        }
      }
    }
    if (shadowFastAck) {
      recordMoneyPathOpsSignal('stripe_webhook_shadow_fast_ack');
      recordRetry('webhook_event_duplicate_redis_shadow');
      logStripeWebhookLifecycle('duplicate_event_blocked', {
        stripeEventType: event.type,
        stripeEventIdSuffix,
        reason: 'redis_shadow_ack',
      });
      webTopupLog(req.log, 'info', 'webhook_duplicate_ignored', {
        reason: 'redis_shadow_ack',
        stripeEventType: event.type,
        stripeEventIdSuffix,
      });
      logStripeWebhookLifecycle('ack_returned', {
        stripeEventType: event.type,
        stripeEventIdSuffix,
        path: 'express_shadow_ack',
      });
      return res.json({ received: true });
    }
  }

  let orderIdToScheduleFulfillment = null;
  /** Checkout-created trace from Stripe session metadata (`zwTraceId`) when present. */
  let phase1TraceForFulfillmentDispatch = req.traceId ?? null;
  /** First `payment_intent.succeeded` transition to paid for a WebTopupOrder — auto-dispatch after tx. */
  let webTopupOrderIdToAutoFulfill = null;
  /** Set when `checkout.session.completed` fails validation vs Stripe totals (possible misconfig or tamper). */
  let checkoutAmountMismatchOrderId = null;
  /** PaymentIntent ids for async actual-fee reconciliation (non-blocking). */
  const paymentIntentIdsForFeeCapture = [];

  /** Pre-transaction Stripe HTTP for dispute→PI mapping only (`resolvePhase1DisputePaymentIntentForWebhook`). */
  let disputePaymentIntentResolution = null;

  try {
    let l7WebhookTraceId = req.traceId ?? null;
    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object;
      if (session && typeof session === 'object') {
        l7WebhookTraceId =
          resolvePhase1CheckoutCorrelationTraceId(session, req.traceId ?? null) ??
          req.traceId ??
          null;
      }
    }
    const l7WebhookRefs = buildStripeWebhookVerifiedL7Refs(event);
    if (l7WebhookRefs) {
      emitL7MoneyPathSpan({
        surface: 'webhook',
        stage: 'stripe_event_verified_correlated',
        outcome: 'ok',
        traceId: l7WebhookTraceId,
        refs: l7WebhookRefs,
      });
    }

    webTopupLog(req.log, 'info', 'webhook_processing_started', {
      stripeEventType: event.type,
      stripeEventIdSuffix,
      traceId: req.traceId ?? null,
    });

    if (event.type === 'charge.dispute.created') {
      const disputeObj = event.data?.object;
      try {
        disputePaymentIntentResolution = await resolvePhase1DisputePaymentIntentForWebhook(
          stripe,
          disputeObj,
          req.log,
        );
      } catch (e) {
        if (e instanceof DisputeChargeLookupError) {
          webTopupLog(req.log, 'warn', 'dispute_charge_lookup_failed_pre_tx', {
            stripeEventType: event.type,
            stripeEventIdSuffix,
            traceId: req.traceId ?? null,
          });
          return res.status(503).json(
            clientErrorBody(
              'Service unavailable',
              API_CONTRACT_CODE.INTERNAL_ERROR,
            ),
          );
        }
        throw e;
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.stripeWebhookEvent.create({ data: { id: event.id } });
      logStripeWebhookLifecycle('event_persisted', {
        stripeEventType: event.type,
        stripeEventIdSuffix,
        traceId: req.traceId ?? null,
      });

      await writeOrderAudit(tx, {
        event: 'stripe_webhook_received',
        payload: {
          eventType: event.type,
          eventIdSuffix: String(event.id).slice(-8),
          traceId: req.traceId ?? null,
        },
        ip: null,
      });

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        phase1TraceForFulfillmentDispatch =
          resolvePhase1CheckoutCorrelationTraceId(session, req.traceId ?? null) ??
          req.traceId ??
          null;
        const r = await applyPhase1CheckoutSessionCompleted(tx, {
          eventId: event.id,
          session,
          log: req.log,
          traceId: phase1TraceForFulfillmentDispatch,
          requestId:
            phase1TraceForFulfillmentDispatch ??
            (typeof req.headers['x-request-id'] === 'string'
              ? req.headers['x-request-id']
              : null),
          stripeEventType: event.type,
        });
        if (r.orderIdToScheduleFulfillment) {
          orderIdToScheduleFulfillment = r.orderIdToScheduleFulfillment;
        }
        if (r.checkoutAmountMismatchOrderId) {
          checkoutAmountMismatchOrderId = r.checkoutAmountMismatchOrderId;
        }
        for (const pi of r.paymentIntentIdsForFeeCapture) {
          paymentIntentIdsForFeeCapture.push(pi);
        }
        return;
      }

      if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object;
        const webTopupPi = await handleWebTopupPaymentIntentSucceeded(
          tx,
          event,
          pi,
          req.log,
          { traceId: req.traceId ?? null },
        );
        if (webTopupPi?.scheduleWebTopupFulfillment) {
          webTopupOrderIdToAutoFulfill = webTopupPi.scheduleWebTopupFulfillment;
        }
        const piId =
          pi && typeof pi.id === 'string' && pi.id.startsWith('pi_')
            ? pi.id
            : null;
        const topupMeta = pi?.metadata?.topup_order_id;
        const isWebTopupOrderMeta =
          typeof topupMeta === 'string' && /^tw_ord_[0-9a-f-]{36}$/i.test(topupMeta);
        if (piId && !isWebTopupOrderMeta) {
          paymentIntentIdsForFeeCapture.push(piId);
        }
        return;
      }

      if (event.type === 'payment_intent.payment_failed') {
        const pi = event.data.object;
        await handleWebTopupPaymentIntentFailed(tx, pi, req.log);
        return;
      }

      if (event.type === 'checkout.session.expired') {
        const session = event.data.object;
        await applyPhase1CheckoutSessionExpired(tx, {
          session,
          traceId: req.traceId ?? null,
          log: req.log,
        });
        return;
      }

      if (event.type === 'charge.refunded') {
        const charge = event.data.object;
        await applyPhase1ChargeRefunded(tx, charge, event.id);
        return;
      }

      if (event.type === 'charge.dispute.created') {
        const dispute = event.data.object;
        await applyPhase1DisputeCreated(tx, dispute, event.id, {
          log: req.log,
          disputePaymentIntentResolution,
        });
        return;
      }
    });

    bumpCounter('webhook_transaction_committed_total');
    void setStripeWebhookEventShadowAck(event.id).then((r) => {
      if (r?.ok === true) {
        recordMoneyPathOpsSignal('stripe_webhook_shadow_set_ok');
      } else {
        recordMoneyPathOpsSignal('stripe_webhook_shadow_set_unavailable');
      }
    });
    logStripeWebhookLifecycle('processing_completed', {
      stripeEventType: event.type,
      stripeEventIdSuffix,
      traceId: req.traceId ?? null,
    });
    webTopupLog(req.log, 'info', 'webhook_processing_completed', {
      stripeEventType: event.type,
      stripeEventIdSuffix,
      traceId: req.traceId ?? null,
    });
    emitPhase1OperationalEvent('webhook_processed', {
      stripeEventType: event.type,
      traceId: req.traceId ?? null,
      stripeEventIdSuffix,
    });
    webTopupLog(req.log, 'info', 'webhook_processed', {
      stripeEventType: event.type,
      stripeEventIdSuffix,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      recordRetry('webhook_event_duplicate');
      recordMoneyPathOpsSignal('stripe_webhook_db_idempotent_replay');
      void setStripeWebhookEventShadowAck(event.id).then((r) => {
        if (r?.ok === true) recordMoneyPathOpsSignal('stripe_webhook_shadow_repaired_after_p2002');
      });
      emitPhase1OperationalEvent('webhook_duplicate_replay', {
        stripeEventType: event.type,
        traceId: req.traceId ?? null,
        stripeEventIdSuffix,
      });
      logStripeWebhookLifecycle('duplicate_event_blocked', {
        stripeEventType: event.type,
        stripeEventIdSuffix,
        reason: 'db_unique_violation',
      });
      webTopupLog(req.log, 'info', 'webhook_duplicate_ignored', {
        reason: 'db_unique_violation',
        stripeEventType: event.type,
        stripeEventIdSuffix,
        prismaCode: 'P2002',
      });
      /**
       * First delivery may commit PAID + queued fulfillment attempt then crash before
       * post-commit `scheduleFulfillmentProcessing`. Replay hits P2002 on `StripeWebhookEvent`
       * and must still nudge dispatch — `scheduleFulfillmentProcessing` is gated and safe
       * for duplicates (terminal orders / already processing are no-ops).
       */
      if (
        event.type === 'checkout.session.completed' &&
        !env.phase1WebhookSkipFulfillmentDispatch
      ) {
        const session = event.data?.object;
        const raw =
          session && typeof session === 'object'
            ? session.metadata?.internalCheckoutId
            : null;
        if (raw && isLikelyPaymentCheckoutId(String(raw))) {
          const sess = event.data?.object;
          const replayTrace =
            sess && typeof sess === 'object'
              ? resolvePhase1CheckoutCorrelationTraceId(sess, req.traceId ?? null) ??
                req.traceId ??
                null
              : req.traceId ?? null;
          const rowForReplay = await prisma.paymentCheckout.findUnique({
            where: { id: String(raw) },
          });
          if (paymentCheckoutPendingForPhase1CheckoutSessionPaidReplay(rowForReplay)) {
            try {
              const r = await prisma.$transaction(async (tx) =>
                applyPhase1CheckoutSessionCompleted(tx, {
                  eventId: event.id,
                  session: sess,
                  log: req.log,
                  traceId: replayTrace,
                  requestId:
                    replayTrace ??
                    (typeof req.headers['x-request-id'] === 'string'
                      ? req.headers['x-request-id']
                      : null),
                  stripeEventType: event.type,
                }),
              );
              for (const pi of r.paymentIntentIdsForFeeCapture) {
                paymentIntentIdsForFeeCapture.push(pi);
              }
              if (r.orderIdToScheduleFulfillment) {
                orderIdToScheduleFulfillment = r.orderIdToScheduleFulfillment;
                phase1TraceForFulfillmentDispatch = replayTrace;
              }
              webTopupLog(req.log, 'info', 'checkout_session_completed_p2002_replay_recovered', {
                reason: 'stripe_webhook_event_row_exists_checkout_still_pending',
                orderIdSuffix: safeSuffix(String(raw), 10),
                stripeEventIdSuffix,
                traceId: replayTrace ?? null,
              });
            } catch (replayErr) {
              req.log?.error?.(
                {
                  event: 'checkout_session_completed_p2002_replay_failed',
                  errName: replayErr?.name,
                  message:
                    typeof replayErr?.message === 'string'
                      ? replayErr.message.slice(0, 200)
                      : undefined,
                },
                'stripe_webhook',
              );
            }
          }
          scheduleFulfillmentProcessing(String(raw), replayTrace);
        }
      }
    } else {
      bumpCounter('stripe_webhook_transaction_failed');
      const failureClass = classifyTransactionFailure(e, {
        surface: 'stripe_webhook',
        stripeEventType: event.type,
      });
      const retryDirective = transactionRetryDirective(failureClass, { attempt: 0 });
      recordReliabilityDecision(
        enrichReliabilityDecisionWithSeverity(
          {
            layer: 'stripe_webhook',
            traceId: req.traceId ?? null,
            outcome: 'transaction_failed',
            stripeEventType: event.type,
            stripeEventIdSuffix,
            transactionFailureClass: failureClass,
            retryMaySchedule: retryDirective.mayScheduleRetry,
            prismaCode: e?.code ?? null,
          },
          e,
          { inDbTransaction: true },
        ),
      );
      emitMoneyPathLog(MONEY_PATH_EVENT.RETRY_DECISION, {
        traceId: req.traceId ?? null,
        surface: 'stripe_webhook',
        stripeEventType: event.type,
        stripeEventIdSuffix,
        transactionFailureClass: failureClass,
        retryMaySchedule: retryDirective.mayScheduleRetry,
        retryReason: retryDirective.reason,
      });
      emitPhase1OperationalEvent('webhook_transaction_failed', {
        stripeEventType: event.type,
        traceId: req.traceId ?? null,
        stripeEventIdSuffix,
        errName: e?.name,
        prismaCode: e?.code,
        transactionFailureClass: failureClass,
        retryMaySchedule: retryDirective.mayScheduleRetry,
        retryReason: retryDirective.reason,
        retrySuggestedBackoffMs: retryDirective.suggestedBackoffMs,
      });
      logOpsEvent({
        domain: 'stripe_webhook',
        event: 'webhook_transaction',
        outcome: 'error',
        traceId: req.traceId,
        extra: {
          stripeEventType: event.type,
          stripeEventIdSuffix,
          errName: e?.name,
          prismaCode: e?.code,
        },
      });
      webTopupLog(req.log, 'error', 'webhook_processing_failed', {
        stripeEventType: event.type,
        stripeEventIdSuffix,
        phase: 'db_transaction',
        errName: e?.name,
        errCode: e?.code,
        message: typeof e?.message === 'string' ? e.message.slice(0, 200) : undefined,
      });
      webTopupLog(req.log, 'error', 'webhook_failed', {
        stripeEventType: event.type,
        stripeEventIdSuffix,
        errName: e?.name,
        errCode: e?.code,
        message: typeof e?.message === 'string' ? e.message.slice(0, 200) : undefined,
      });
      logStripeWebhookLifecycle('processing_failed', {
        stripeEventType: event.type,
        stripeEventIdSuffix,
        traceId: req.traceId ?? null,
      });
      logStripeWebhookLifecycle('ack_returned', {
        stripeEventType: event.type,
        stripeEventIdSuffix,
        path: 'express_error_ack',
      });
      return res.status(200).json({ received: true });
    }
  }

  try {
    for (const piFeeId of new Set(paymentIntentIdsForFeeCapture)) {
      schedulePaymentCheckoutStripeFeeCapture(piFeeId, req.log);
    }

    if (webTopupOrderIdToAutoFulfill) {
      scheduleWebTopupFulfillmentAfterPaid(webTopupOrderIdToAutoFulfill, req.log, {
        traceId: req.traceId ?? null,
      });
      webTopupLog(req.log, 'info', 'webtop_fulfillment_auto_scheduled', {
        orderIdSuffix: webTopupOrderIdToAutoFulfill.slice(-8),
        traceId: req.traceId ?? null,
      });
    }

    if (orderIdToScheduleFulfillment) {
      recordPaymentCheckoutOutcome(true);
      bumpCounter('checkout_paid_phase1_total');
      emitPhase1OperationalEvent('checkout_paid', {
        traceId: phase1TraceForFulfillmentDispatch ?? null,
        orderIdSuffix: safeSuffix(orderIdToScheduleFulfillment, 10),
      });
      logOpsEvent({
        domain: 'stripe_webhook',
        event: 'checkout.session.completed',
        outcome: 'paid',
        orderId: orderIdToScheduleFulfillment,
        traceId: phase1TraceForFulfillmentDispatch,
      });
      evaluateRollingAlerts();
      if (!env.phase1WebhookSkipFulfillmentDispatch) {
        scheduleFulfillmentProcessing(
          orderIdToScheduleFulfillment,
          phase1TraceForFulfillmentDispatch,
        );
      } else {
        webTopupLog(req.log, 'info', 'phase1_webhook_fulfillment_dispatch_skipped', {
          traceId: phase1TraceForFulfillmentDispatch ?? null,
          requestId:
            phase1TraceForFulfillmentDispatch ??
            (typeof req.headers['x-request-id'] === 'string'
              ? req.headers['x-request-id']
              : null),
          stripeEventType: event.type,
          orderIdSuffix: safeSuffix(orderIdToScheduleFulfillment, 10),
          reason: 'PHASE1_WEBHOOK_SKIP_FULFILLMENT_DISPATCH',
        });
        emitPhase1OperationalEvent('checkout_paid_fulfillment_dispatch_skipped', {
          traceId: phase1TraceForFulfillmentDispatch ?? null,
          orderIdSuffix: safeSuffix(orderIdToScheduleFulfillment, 10),
        });
      }
      schedulePushSideEffect(
        () => emitPaymentSuccessSideEffect(orderIdToScheduleFulfillment),
        phase1TraceForFulfillmentDispatch,
      );
    } else if (checkoutAmountMismatchOrderId) {
      recordPaymentCheckoutOutcome(false);
      emitProviderDegradationAlert('stripe_amount_currency_mismatch', {
        orderIdSuffix: safeSuffix(checkoutAmountMismatchOrderId, 12),
      });
      logOpsEvent({
        domain: 'stripe_webhook',
        event: 'checkout.session.completed',
        outcome: 'amount_mismatch',
        orderId: checkoutAmountMismatchOrderId,
        traceId: req.traceId,
      });
      evaluateRollingAlerts();
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const piId =
        pi && typeof pi.id === 'string' && pi.id.startsWith('pi_') ? pi.id : null;
      emitMoneyPathLog(MONEY_PATH_EVENT.PAYMENT_CONFIRMED, {
        traceId: req.traceId ?? null,
        stripeEventIdSuffix: safeSuffix(event.id, 8),
        paymentIntentIdSuffix: piId ? piId.slice(-12) : null,
      });
    }

    logStripeWebhookLifecycle('ack_returned', {
      stripeEventType: event.type,
      stripeEventIdSuffix,
      traceId: req.traceId ?? null,
      path: 'express',
    });
    return res.json({ received: true });
  } catch (postErr) {
    webTopupLog(req.log, 'error', 'webhook_processing_failed', {
      stripeEventType: event.type,
      stripeEventIdSuffix,
      phase: 'post_commit',
      errName: postErr?.name,
      errCode: postErr?.code,
      message:
        typeof postErr?.message === 'string'
          ? postErr.message.slice(0, 200)
          : undefined,
    });
    return res.status(200).json({ received: true });
  }
});

export default router;
