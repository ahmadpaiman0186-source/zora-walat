import { prisma } from '../db.js';
import { env } from '../config/env.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { resolvePhase1OperatorName } from '../constants/phase1OperatorLabels.js';
import { POST_PAYMENT_INCIDENT_STATUS } from '../constants/postPaymentIncidentStatus.js';
import { POST_PAYMENT_INCIDENT_MAP_SOURCE } from '../constants/postPaymentIncidentMapSource.js';
import {
  parseManualReviewFlags,
  derivePhase1StuckSignals,
  derivePhase1CanonicalPhase,
  buildPhase1LifecycleSummary,
} from './canonicalPhase1Lifecycle.js';
import {
  financialAnomalySupportLines,
  buildSupportCorrelationChecklist,
} from '../lib/phase1SupportHints.js';
import {
  computePhase1MarginUsdSurface,
  deriveReconciliationStatus,
} from '../lib/phase1MarginReconciliation.js';
import { canOrderProceedToFulfillment } from '../lib/phase1FulfillmentPaymentGate.js';
import { detectPhase1LifecycleIncoherence } from '../domain/orders/phase1LifecyclePolicy.js';

/**
 * Canonical Phase 1 (MOBILE_TOPUP) order read model for support / ops / finance.
 * Null stays null (no coercion to zero). See docs/PHASE1_CANONICAL_ORDER_DTO.schema.md
 *
 * @typedef {object} PostPaymentIncidentPhase1
 * @property {string} status See `POST_PAYMENT_INCIDENT_STATUS` (`NONE` when unset).
 * @property {boolean} recordedInApp True when status is not `NONE` (admin-recorded).
 * @property {string | null} notes Optional operator notes (`postPaymentIncidentNotes`).
 * @property {string | null} updatedAt ISO timestamp when incident row last updated.
 * @property {string} supportWorkflow Manual-first; Stripe Dashboard remains SoT for money movement.
 * @property {true} lifecycleExtensionReserved Forward-compatible flag.
 */

/**
 * @param {import('@prisma/client').PaymentCheckout} checkout
 * @param {import('@prisma/client').FulfillmentAttempt | null | undefined} latestAttempt
 * @param {{ attemptCount?: number, nowMs?: number, processingTimeoutMs?: number }} [options]
 */
export function toCanonicalPhase1OrderDto(checkout, latestAttempt, options = {}) {
  const snap =
    checkout.pricingSnapshot && typeof checkout.pricingSnapshot === 'object'
      ? checkout.pricingSnapshot
      : null;
  let faceValueUsd = null;
  let faceValueUsdKnown = false;
  if (snap) {
    const fvCents = snap.faceValueUsdCents ?? snap.faceValueCents;
    if (fvCents != null && Number.isFinite(Number(fvCents))) {
      faceValueUsd = Number(fvCents) / 100;
      faceValueUsdKnown = true;
    }
  }

  const truth = checkout.fulfillmentTruthSnapshot;
  let deliveredValueUsd = null;
  let deliveredValueUsdKnown = false;
  if (truth && typeof truth === 'object' && truth !== null) {
    const d = /** @type {Record<string, unknown>} */ (truth);
    const dv = d.deliveredAmountUsd ?? d.deliveredUsd ?? d.amountUsd;
    if (typeof dv === 'number' && Number.isFinite(dv)) {
      deliveredValueUsd = dv;
      deliveredValueUsdKnown = true;
    }
  }

  const codes = Array.isArray(checkout.financialAnomalyCodes)
    ? checkout.financialAnomalyCodes.filter((x) => typeof x === 'string')
    : [];

  const cents = checkout.amountUsdCents;
  const checkoutChargeUsd =
    cents != null && Number.isFinite(Number(cents)) ? Number(cents) / 100 : null;

  const fulfillmentStatus = latestAttempt?.status ?? null;
  const latestAttemptProviderReference = latestAttempt?.providerReference ?? null;
  const latestAttemptProviderKey = latestAttempt?.provider ?? null;
  const latestAttemptNumber = latestAttempt?.attemptNumber ?? null;

  const attemptCount = typeof options.attemptCount === 'number' ? options.attemptCount : 0;
  const manual = parseManualReviewFlags(checkout.metadata);
  const processingTimeoutMs =
    options.processingTimeoutMs ?? env.processingTimeoutMs ?? 600_000;
  const stuckSignals = derivePhase1StuckSignals(
    checkout,
    latestAttempt,
    attemptCount,
    {
      nowMs: options.nowMs,
      processingTimeoutMs,
    },
  );

  const canonicalPhase = derivePhase1CanonicalPhase(checkout, latestAttempt, manual);
  const lifecycleSummary = buildPhase1LifecycleSummary({
    canonicalPhase,
    financialAnomalyCodes: codes,
    stuckSignals,
    manual,
    checkout,
    latestAttempt,
  });

  const allowedIncident = new Set(Object.values(POST_PAYMENT_INCIDENT_STATUS));
  const rawIncident =
    typeof checkout.postPaymentIncidentStatus === 'string'
      ? checkout.postPaymentIncidentStatus.trim()
      : '';
  const incidentStatus = allowedIncident.has(rawIncident)
    ? rawIncident
    : POST_PAYMENT_INCIDENT_STATUS.NONE;

  const rawMapSrc =
    typeof checkout.postPaymentIncidentMapSource === 'string'
      ? checkout.postPaymentIncidentMapSource.trim()
      : '';
  const incidentMapSource = rawMapSrc.length > 0 ? rawMapSrc : null;
  const incidentMappingAuditComplete =
    incidentStatus === POST_PAYMENT_INCIDENT_STATUS.NONE ||
    incidentMapSource != null;

  let disputeSupportMapping = 'not_applicable';
  if (incidentStatus === POST_PAYMENT_INCIDENT_STATUS.DISPUTED) {
    if (incidentMapSource === POST_PAYMENT_INCIDENT_MAP_SOURCE.DISPUTE_CHARGE_LOOKUP) {
      disputeSupportMapping = 'recovered_via_stripe_charge_api';
    } else if (incidentMapSource === POST_PAYMENT_INCIDENT_MAP_SOURCE.DISPUTE_PAYLOAD_PI) {
      disputeSupportMapping = 'direct_from_stripe_dispute_payload';
    } else {
      disputeSupportMapping = 'partial_or_unaudited_map';
    }
  }

  /** @type {PostPaymentIncidentPhase1} */
  const postPaymentIncident = {
    status: incidentStatus,
    recordedInApp: incidentStatus !== POST_PAYMENT_INCIDENT_STATUS.NONE,
    notes:
      typeof checkout.postPaymentIncidentNotes === 'string'
        ? checkout.postPaymentIncidentNotes
        : null,
    updatedAt: checkout.postPaymentIncidentUpdatedAt
      ? checkout.postPaymentIncidentUpdatedAt.toISOString()
      : null,
    supportWorkflow:
      incidentStatus === POST_PAYMENT_INCIDENT_STATUS.NONE
        ? 'stripe_dashboard_and_support_manual'
        : 'admin_recorded_post_payment_incident',
    lifecycleExtensionReserved: true,
    mapSource: incidentMapSource,
    incidentMappingAuditComplete,
    disputeSupportMapping,
  };

  const supportCorrelationChecklist = buildSupportCorrelationChecklist({
    checkoutId: checkout.id,
    stripePaymentIntentId: checkout.stripePaymentIntentId ?? null,
    stripeCheckoutSessionId: checkout.stripeCheckoutSessionId ?? null,
    completedByStripeWebhookEventId: checkout.completedByWebhookEventId ?? null,
  });

  const marginUsd = computePhase1MarginUsdSurface(checkout);
  const reconciliationStatus = deriveReconciliationStatus(checkout, codes);

  const gateWorker = canOrderProceedToFulfillment(checkout, {
    lifecycle: 'PAID_ONLY',
  });
  const gateKick = canOrderProceedToFulfillment(checkout, {
    lifecycle: 'PAID_OR_PROCESSING',
  });

  const lifecycleCoherenceViolations = detectPhase1LifecycleIncoherence(checkout);

  return {
    schemaVersion: 1,
    checkoutId: checkout.id,
    commercialOrderType: 'MOBILE_TOPUP',
    senderCountryCode: checkout.senderCountryCode ?? null,
    recipientPhone: checkout.recipientNational ?? null,
    operatorKey: checkout.operatorKey ?? null,
    operatorName: resolvePhase1OperatorName(checkout.operatorKey),
    productType: checkout.productType ?? 'mobile_topup',
    packageId: checkout.packageId ?? null,
    currency: checkout.currency ?? 'usd',
    idempotencyKey: checkout.idempotencyKey ?? null,
    faceValueUsd,
    faceValueUsdKnown,
    deliveredValueUsd,
    deliveredValueUsdKnown,
    checkoutChargeUsd,
    paymentStatus: checkout.status ?? PAYMENT_CHECKOUT_STATUS.INITIATED,
    lifecycleStatus: checkout.orderStatus ?? ORDER_STATUS.PENDING,
    fulfillmentStatus,
    latestAttemptNumber,
    fulfillmentAttemptCount: attemptCount,
    canonicalPhase,
    lifecycleSummary,
    stuckSignals,
    manualReviewRequired: manual.manualReviewRequired,
    manualReviewReason: manual.manualReviewReason,
    manualReviewClassification: manual.manualReviewClassification,
    stripePaymentIntentId: checkout.stripePaymentIntentId ?? null,
    stripeCheckoutSessionId: checkout.stripeCheckoutSessionId ?? null,
    stripeCustomerId: checkout.stripeCustomerId ?? null,
    completedByStripeWebhookEventId: checkout.completedByWebhookEventId ?? null,
    stripeFeeEstimatedUsdCents: checkout.stripeFeeEstimateUsdCents ?? null,
    stripeFeeActualUsdCents: checkout.stripeFeeActualUsdCents ?? null,
    stripeBalanceTransactionAmountCents:
      checkout.stripeBalanceTransactionAmountCents ?? null,
    providerCostUsdCents: checkout.providerCostUsdCents ?? null,
    providerCostActualUsdCents: checkout.providerCostActualUsdCents ?? null,
    providerCostTruthSource: checkout.providerCostTruthSource ?? null,
    projectedNetMarginBp: checkout.projectedNetMarginBp ?? null,
    actualNetMarginBp: checkout.actualNetMarginBp ?? null,
    refinedActualNetMarginBp: checkout.refinedActualNetMarginBp ?? null,
    expectedMarginUsd: marginUsd.expectedMarginUsd,
    actualMarginUsd: marginUsd.actualMarginUsd,
    marginDeltaUsd: marginUsd.marginDeltaUsd,
    reconciliationStatus,
    /**
     * Authoritative fulfillment gate snapshot from current row (not client state).
     * `workerMayClaimPaidQueued`: internal worker may claim PAID+QUEUED.
     * `clientKickMayInvoke`: `/api/recharge/execute` may schedule (PAID or PROCESSING, payment succeeded).
     */
    fulfillmentPaymentGate: {
      workerMayClaimPaidQueued: gateWorker.ok,
      clientKickMayInvoke: gateKick.ok,
      activeDenialCode: gateKick.ok ? null : gateKick.denial,
      activeDenialDetail: gateKick.ok ? null : gateKick.detail ?? null,
    },
    /** Empty when `orderStatus` ↔ `status` pair matches Phase 1 policy. */
    lifecycleCoherenceViolations,
    financialAnomalyCodes: codes,
    /** Ticket-ready strings; same order as `financialAnomalyCodes` where applicable. */
    financialAnomalySupportLines: financialAnomalySupportLines(codes),
    /** Threshold (ms) used when computing `stuckSignals` for this DTO. */
    processingTimeoutMsApplied: processingTimeoutMs,
    /** APIs + Stripe ids for support correlation (no secrets). */
    supportCorrelationChecklist,
    fulfillmentProviderReference: checkout.fulfillmentProviderReference ?? null,
    fulfillmentProviderKey: checkout.fulfillmentProviderKey ?? null,
    latestAttemptProviderReference,
    latestAttemptProviderKey,
    financialTruthComputedAt: checkout.financialTruthComputedAt
      ? checkout.financialTruthComputedAt.toISOString()
      : null,
    paidAt: checkout.paidAt ? checkout.paidAt.toISOString() : null,
    failedAt: checkout.failedAt ? checkout.failedAt.toISOString() : null,
    cancelledAt: checkout.cancelledAt ? checkout.cancelledAt.toISOString() : null,
    failureReason: checkout.failureReason ?? null,
    postPaymentIncident,
    createdAt: checkout.createdAt.toISOString(),
    updatedAt: checkout.updatedAt.toISOString(),
  };
}

const checkoutSelect = {
  id: true,
  idempotencyKey: true,
  senderCountryCode: true,
  recipientNational: true,
  operatorKey: true,
  productType: true,
  packageId: true,
  currency: true,
  pricingSnapshot: true,
  fulfillmentTruthSnapshot: true,
  amountUsdCents: true,
  status: true,
  orderStatus: true,
  metadata: true,
  stripePaymentIntentId: true,
  stripeCheckoutSessionId: true,
  stripeCustomerId: true,
  completedByWebhookEventId: true,
  stripeFeeEstimateUsdCents: true,
  stripeFeeActualUsdCents: true,
  stripeBalanceTransactionAmountCents: true,
  providerCostUsdCents: true,
  providerCostActualUsdCents: true,
  providerCostTruthSource: true,
  projectedNetMarginBp: true,
  actualNetMarginBp: true,
  refinedActualNetMarginBp: true,
  financialAnomalyCodes: true,
  fulfillmentProviderReference: true,
  fulfillmentProviderKey: true,
  financialTruthComputedAt: true,
  paidAt: true,
  failedAt: true,
  cancelledAt: true,
  failureReason: true,
  postPaymentIncidentStatus: true,
  postPaymentIncidentNotes: true,
  postPaymentIncidentUpdatedAt: true,
  postPaymentIncidentMapSource: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * @param {string} checkoutId
 * @param {string} userId
 * @param {{ prisma?: import('@prisma/client').PrismaClient }} [options]
 * @returns {Promise<object | null>}
 */
export async function getCanonicalPhase1OrderForUser(checkoutId, userId, options = {}) {
  const db = options.prisma ?? prisma;
  const row = await db.paymentCheckout.findFirst({
    where: { id: checkoutId, userId },
    select: {
      ...checkoutSelect,
      _count: { select: { fulfillmentAttempts: true } },
      fulfillmentAttempts: {
        orderBy: { attemptNumber: 'desc' },
        take: 1,
        select: {
          status: true,
          provider: true,
          providerReference: true,
          attemptNumber: true,
          startedAt: true,
        },
      },
    },
  });
  if (!row) return null;

  const attempts = row.fulfillmentAttempts;
  const latest = Array.isArray(attempts) && attempts.length > 0 ? attempts[0] : null;

  const { fulfillmentAttempts: _a, _count, ...checkout } = row;
  const attemptCount = _count?.fulfillmentAttempts ?? 0;

  return toCanonicalPhase1OrderDto(checkout, latest, { attemptCount });
}

/**
 * Staff / support read model (no userId scoping).
 *
 * @param {string} checkoutId
 * @param {{ prisma?: import('@prisma/client').PrismaClient }} [options]
 * @returns {Promise<object | null>}
 */
export async function getCanonicalPhase1OrderForStaff(checkoutId, options = {}) {
  const db = options.prisma ?? prisma;
  const row = await db.paymentCheckout.findFirst({
    where: { id: checkoutId },
    select: {
      ...checkoutSelect,
      userId: true,
      _count: { select: { fulfillmentAttempts: true } },
      fulfillmentAttempts: {
        orderBy: { attemptNumber: 'desc' },
        take: 1,
        select: {
          status: true,
          provider: true,
          providerReference: true,
          attemptNumber: true,
          startedAt: true,
        },
      },
    },
  });
  if (!row) return null;

  const attempts = row.fulfillmentAttempts;
  const latest = Array.isArray(attempts) && attempts.length > 0 ? attempts[0] : null;

  const { fulfillmentAttempts: _a, _count, userId, ...checkout } = row;
  const attemptCount = _count?.fulfillmentAttempts ?? 0;

  const dto = toCanonicalPhase1OrderDto(checkout, latest, { attemptCount });
  return { ...dto, userId: userId ?? null };
}
