import { randomUUID } from 'node:crypto';

import { FULFILLMENT_STATUS, PAYMENT_STATUS } from '../../domain/topupOrder/statuses.js';
import { FULFILLMENT_SERVICE_CODE } from '../../domain/topupOrder/fulfillmentErrors.js';
import { env } from '../../config/env.js';
import { prisma } from '../../db.js';
import {
  safeSuffix,
  webTopupCorrelationFields,
  webTopupLog,
} from '../../lib/webTopupObservability.js';
import { recordRetry } from '../../lib/opsMetrics.js';
import { isValidTopupOrderId } from '../topupOrder/topupOrderService.js';
import {
  assertEligibleForInitialDispatch,
  assertEligibleForRetryDispatch,
  isFulfillmentDispatchBlocked,
} from './fulfillmentEligibility.js';
import { resolveTopupFulfillmentProvider } from './providerRegistry.js';
import { assertProviderMatchesWebTopupScope } from './webTopupFulfillmentScope.js';
import {
  buildFulfillmentRunbookForOrder,
  evaluateOperatorMappingForReloadlyWebOrder,
} from './webTopupFulfillmentRunbook.js';
import { assertFulfillmentDispatchAllowed } from '../fulfillmentPolicy.js';
import {
  describeFinancialGuardrailForAdmin,
  evaluateWebTopupFinancialGuardrails,
} from './webtopFinancialGuardrails.js';
import { evaluateWebtopOrderSla } from '../../lib/webtopSlaPolicy.js';
import { buildWebtopUserFacingOrderFields } from '../../lib/webtopUserFacingStatus.js';
import {
  resolveWebTopupFulfillmentIdempotency,
  completeWebTopupFulfillmentIdempotency,
  failWebTopupFulfillmentIdempotency,
} from './webtopFulfillmentIdempotency.js';
import { enqueueWebTopupFulfillmentJob } from './webtopFulfillmentJob.js';
import { executeWebTopupFulfillmentProviderPhase } from './webTopupFulfillmentExecutor.js';

function serviceError(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

function assertDestinationSupported(capabilities, country) {
  const cc = capabilities.destinationCountries;
  if (cc.includes('*')) return true;
  return cc.includes(String(country ?? '').toUpperCase());
}

/**
 * @param {string} orderId
 * @param {import('pino').Logger | undefined} log
 * @param {{ emitLog?: boolean; includeRunbook?: boolean }} [opts]
 */
export async function getWebTopupFulfillmentDiagnostics(orderId, log, opts = {}) {
  const emitLog = opts.emitLog !== false;
  const includeRunbook = opts.includeRunbook !== false;
  if (!isValidTopupOrderId(orderId)) {
    return { ok: false, error: FULFILLMENT_SERVICE_CODE.ORDER_NOT_FOUND };
  }
  const row = await prisma.webTopupOrder.findUnique({ where: { id: orderId } });
  if (!row) {
    return { ok: false, error: FULFILLMENT_SERVICE_CODE.ORDER_NOT_FOUND };
  }

  if (emitLog) {
    webTopupLog(log, 'info', 'fulfillment_diagnostics_checked', {
      orderIdSuffix: orderId.slice(-8),
      fulfillmentStatus: row.fulfillmentStatus,
      paymentIntentIdSuffix: safeSuffix(row.paymentIntentId, 10),
    });
  }

  /** @type {Record<string, unknown>} */
  const out = {
    ok: true,
    orderIdSuffix: row.id.slice(-8),
    paymentStatus: row.paymentStatus,
    fulfillmentStatus: row.fulfillmentStatus,
    fulfillmentProvider: row.fulfillmentProvider,
    fulfillmentAttemptCount: row.fulfillmentAttemptCount,
    fulfillmentRequestedAt: row.fulfillmentRequestedAt?.toISOString() ?? null,
    fulfillmentCompletedAt: row.fulfillmentCompletedAt?.toISOString() ?? null,
    fulfillmentFailedAt: row.fulfillmentFailedAt?.toISOString() ?? null,
    fulfillmentNextRetryAt: row.fulfillmentNextRetryAt?.toISOString() ?? null,
    fulfillmentReferenceSuffix: row.fulfillmentReference
      ? row.fulfillmentReference.slice(-12)
      : null,
    fulfillmentErrorCode: row.fulfillmentErrorCode,
    fulfillmentErrorMessageSafe: row.fulfillmentErrorMessageSafe,
    lastProviderPayloadHashPrefix: row.lastProviderPayloadHash
      ? row.lastProviderPayloadHash.slice(0, 12)
      : null,
  };

  if (includeRunbook) {
    const runbook = buildFulfillmentRunbookForOrder(row);
    out.runbook = runbook;
    out.summary = runbook.dispatch.initialEligible
      ? 'Order can be dispatched (initial) if no race with another operator.'
      : runbook.dispatch.reasonsIfBlocked[0] ??
        'Dispatch blocked — see runbook.dispatch and runbook.sandbox.';
  }

  out.financialGuardrail = describeFinancialGuardrailForAdmin(row.fulfillmentErrorCode);

  return out;
}

/**
 * Prepare retry: FAILED + retryable → PENDING (clears last error fields).
 * With `force: true` (admin): any FAILED → PENDING; PENDING no-op; QUEUED/PROCESSING → PENDING reset.
 * @param {string} orderId
 * @param {import('pino').Logger | undefined} log
 * @param {{ force?: boolean }} [opts]
 */
export async function prepareWebTopupFulfillmentRetry(orderId, log, opts = {}) {
  const force = opts.force === true;

  if (!isValidTopupOrderId(orderId)) {
    throw serviceError(FULFILLMENT_SERVICE_CODE.ORDER_NOT_FOUND, 'Order not found');
  }

  const providerId = String(env.webTopupFulfillmentProvider ?? 'mock')
    .trim()
    .toLowerCase();
  assertFulfillmentDispatchAllowed(providerId);

  webTopupLog(log, 'info', 'fulfillment_retry_requested', {
    orderIdSuffix: orderId.slice(-8),
    force: force || undefined,
  });

  const row = await prisma.webTopupOrder.findUnique({ where: { id: orderId } });
  if (!row) {
    throw serviceError(FULFILLMENT_SERVICE_CODE.ORDER_NOT_FOUND, 'Order not found');
  }

  if (row.paymentStatus !== PAYMENT_STATUS.PAID) {
    webTopupLog(log, 'warn', 'fulfillment_dispatch_rejected', {
      orderIdSuffix: orderId.slice(-8),
      reason: FULFILLMENT_SERVICE_CODE.NOT_PAID,
      mode: 'retry_prepare',
    });
    throw serviceError(FULFILLMENT_SERVICE_CODE.NOT_PAID, 'Order not paid');
  }

  if (!force) {
    const el = assertEligibleForRetryDispatch(row);
    if (!el.ok) {
      webTopupLog(log, 'warn', 'fulfillment_dispatch_rejected', {
        orderIdSuffix: orderId.slice(-8),
        reason: el.code,
        mode: 'retry_prepare',
      });
      throw serviceError(el.code, 'Not eligible for retry');
    }
  } else if (row.fulfillmentStatus === FULFILLMENT_STATUS.DELIVERED) {
    throw serviceError(
      FULFILLMENT_SERVICE_CODE.INVALID_STATE,
      'Already delivered — cannot force retry',
    );
  }

  const clearPending = {
    fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
    fulfillmentErrorCode: null,
    fulfillmentErrorMessageSafe: null,
    fulfillmentFailedAt: null,
    fulfillmentNextRetryAt: null,
  };

  if (row.fulfillmentStatus === FULFILLMENT_STATUS.PENDING && force) {
    /* no-op — ready for dispatch */
  } else if (row.fulfillmentStatus === FULFILLMENT_STATUS.RETRYING) {
    const n = await prisma.webTopupOrder.updateMany({
      where: {
        id: orderId,
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.RETRYING,
      },
      data: clearPending,
    });
    if (n.count !== 1) {
      throw serviceError(
        FULFILLMENT_SERVICE_CODE.INVALID_STATE,
        'Could not prepare retry',
      );
    }
  } else if (row.fulfillmentStatus === FULFILLMENT_STATUS.FAILED) {
    const n = await prisma.webTopupOrder.updateMany({
      where: {
        id: orderId,
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
      },
      data: clearPending,
    });
    if (n.count !== 1) {
      throw serviceError(
        FULFILLMENT_SERVICE_CODE.INVALID_STATE,
        'Could not prepare retry',
      );
    }
  } else if (
    force &&
    (row.fulfillmentStatus === FULFILLMENT_STATUS.QUEUED ||
      row.fulfillmentStatus === FULFILLMENT_STATUS.PROCESSING)
  ) {
    const n = await prisma.webTopupOrder.updateMany({
      where: {
        id: orderId,
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: {
          in: [FULFILLMENT_STATUS.QUEUED, FULFILLMENT_STATUS.PROCESSING],
        },
      },
      data: clearPending,
    });
    if (n.count !== 1) {
      throw serviceError(
        FULFILLMENT_SERVICE_CODE.INVALID_STATE,
        'Could not reset stuck fulfillment for retry',
      );
    }
  } else if (!force) {
    throw serviceError(FULFILLMENT_SERVICE_CODE.INVALID_STATE, 'Not eligible for retry');
  } else {
    throw serviceError(
      FULFILLMENT_SERVICE_CODE.INVALID_STATE,
      'Cannot force retry from this fulfillment state',
    );
  }

  webTopupLog(log, 'info', 'fulfillment_retry_completed', {
    orderIdSuffix: orderId.slice(-8),
    force: force || undefined,
  });
}

/**
 * Dispatch fulfillment for a paid web top-up order.
 * Sync by default; set WEBTOPUP_FULFILLMENT_ASYNC=true to enqueue a worker job after QUEUED.
 * Optional `Idempotency-Key` via opts prevents duplicate provider intent (safe replay).
 *
 * @param {string} orderId
 * @param {import('pino').Logger | undefined} log
 * @param {{ idempotencyKey?: string | null; traceId?: string | null }} [opts]
 */
export async function dispatchWebTopupFulfillment(orderId, log, opts = {}) {
  if (!isValidTopupOrderId(orderId)) {
    throw serviceError(FULFILLMENT_SERVICE_CODE.ORDER_NOT_FOUND, 'Order not found');
  }

  const providerId = String(env.webTopupFulfillmentProvider ?? 'mock')
    .trim()
    .toLowerCase();
  assertFulfillmentDispatchAllowed(providerId);

  const traceId =
    opts.traceId && typeof opts.traceId === 'string' && opts.traceId.trim()
      ? opts.traceId.trim().slice(0, 128)
      : `wt_${randomUUID().replace(/-/g, '')}`;

  const row = await prisma.webTopupOrder.findUnique({ where: { id: orderId } });
  if (!row) {
    throw serviceError(FULFILLMENT_SERVICE_CODE.ORDER_NOT_FOUND, 'Order not found');
  }

  webTopupLog(log, 'info', 'fulfillment_dispatch_requested', {
    ...webTopupCorrelationFields(orderId, row.paymentIntentId, traceId),
  });

  const el = assertEligibleForInitialDispatch(row);
  if (!el.ok) {
    webTopupLog(log, 'warn', 'fulfillment_dispatch_rejected', {
      orderIdSuffix: orderId.slice(-8),
      reason: el.code,
    });
    throw serviceError(el.code, 'Not eligible for fulfillment');
  }

  const fin = await evaluateWebTopupFinancialGuardrails(row, { traceId });
  if (!fin.ok) {
    webTopupLog(log, 'warn', 'financial_guardrail_blocked', {
      ...webTopupCorrelationFields(orderId, row.paymentIntentId, traceId),
      guardrailCode: fin.code,
      amountCents: row.amountCents,
      currency: row.currency,
      paymentStatus: row.paymentStatus,
      fulfillmentStatus: row.fulfillmentStatus,
    });
    const err = serviceError(FULFILLMENT_SERVICE_CODE.FINANCIAL_GUARDRAIL, fin.messageSafe);
    err.guardrailCode = fin.code;
    throw err;
  }

  if (isFulfillmentDispatchBlocked(row.fulfillmentStatus)) {
    webTopupLog(log, 'warn', 'fulfillment_dispatch_rejected', {
      orderIdSuffix: orderId.slice(-8),
      reason: FULFILLMENT_SERVICE_CODE.DUPLICATE_DISPATCH,
      fulfillmentStatus: row.fulfillmentStatus,
    });
    throw serviceError(
      FULFILLMENT_SERVICE_CODE.DUPLICATE_DISPATCH,
      'Fulfillment already in progress or completed',
    );
  }

  const provider = resolveTopupFulfillmentProvider(providerId);
  if (!provider) {
    webTopupLog(log, 'error', 'fulfillment_dispatch_rejected', {
      orderIdSuffix: orderId.slice(-8),
      reason: FULFILLMENT_SERVICE_CODE.PROVIDER_NOT_CONFIGURED,
      providerId,
    });
    throw serviceError(
      FULFILLMENT_SERVICE_CODE.PROVIDER_NOT_CONFIGURED,
      'Fulfillment provider not available',
    );
  }

  const scope = assertProviderMatchesWebTopupScope(providerId, row);
  if (!scope.ok) {
    webTopupLog(log, 'warn', 'fulfillment_provider_unsupported', {
      orderIdSuffix: orderId.slice(-8),
      providerId,
      scopeReason: scope.code,
      destinationCountry: row.destinationCountry,
      productType: row.productType,
    });
    throw serviceError(
      FULFILLMENT_SERVICE_CODE.PROVIDER_UNSUPPORTED,
      'Order is outside the enabled Reloadly rollout scope (AF airtime only)',
    );
  }

  if (providerId === 'reloadly') {
    webTopupLog(log, 'info', 'provider_scope_validated', {
      orderIdSuffix: orderId.slice(-8),
      destinationCountry: row.destinationCountry,
      productType: row.productType,
    });
    const om = evaluateOperatorMappingForReloadlyWebOrder(row);
    if (!om.ready) {
      webTopupLog(log, 'warn', 'operator_mapping_missing', {
        orderIdSuffix: orderId.slice(-8),
        mappingStatus: om.status,
        detailCode: om.detailCode,
      });
      throw serviceError(
        FULFILLMENT_SERVICE_CODE.OPERATOR_MAPPING_MISSING,
        om.explanation || 'Reloadly operator mapping is not ready for this order',
      );
    }
    webTopupLog(log, 'info', 'operator_mapping_validated', {
      orderIdSuffix: orderId.slice(-8),
      operatorKeyHint: om.operatorKeyHint,
    });
  }

  const caps = provider.getCapabilities();
  if (!assertDestinationSupported(caps, row.destinationCountry)) {
    webTopupLog(log, 'warn', 'fulfillment_provider_unsupported', {
      orderIdSuffix: orderId.slice(-8),
      destinationCountry: row.destinationCountry,
      providerId,
    });
    throw serviceError(
      FULFILLMENT_SERVICE_CODE.PROVIDER_UNSUPPORTED,
      'Route not supported by provider',
    );
  }

  const idem = await resolveWebTopupFulfillmentIdempotency(
    orderId,
    opts.idempotencyKey ?? null,
  );
  if (idem.mode === 'replay') {
    return getWebTopupFulfillmentDiagnostics(orderId, log, {
      emitLog: false,
      includeRunbook: true,
    });
  }
  if (idem.mode === 'conflict') {
    throw serviceError(
      FULFILLMENT_SERVICE_CODE.IDEMPOTENCY_CONFLICT,
      'This Idempotency-Key is already in use for an active fulfillment attempt',
    );
  }

  const attemptNo = row.fulfillmentAttemptCount + 1;

  const claim = await prisma.webTopupOrder.updateMany({
    where: {
      id: orderId,
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
    },
    data: {
      fulfillmentStatus: FULFILLMENT_STATUS.QUEUED,
      fulfillmentAttemptCount: { increment: 1 },
      fulfillmentRequestedAt: new Date(),
      fulfillmentProvider: providerId,
      fulfillmentErrorCode: null,
      fulfillmentErrorMessageSafe: null,
      fulfillmentFailedAt: null,
      fulfillmentCompletedAt: null,
      fulfillmentNextRetryAt: null,
    },
  });

  if (claim.count !== 1) {
    await failWebTopupFulfillmentIdempotency(orderId, idem.key);
    webTopupLog(log, 'warn', 'fulfillment_dispatch_rejected', {
      orderIdSuffix: orderId.slice(-8),
      reason: FULFILLMENT_SERVICE_CODE.DUPLICATE_DISPATCH,
    });
    throw serviceError(
      FULFILLMENT_SERVICE_CODE.DUPLICATE_DISPATCH,
      'Could not claim order for fulfillment',
    );
  }

  webTopupLog(log, 'info', 'fulfillment_queued', {
    ...webTopupCorrelationFields(orderId, row.paymentIntentId, traceId),
    providerId,
    attemptNo,
  });

  if (env.webtopupFulfillmentAsync) {
    const job = await enqueueWebTopupFulfillmentJob(orderId, attemptNo, {
      clientIdempotencyKey: idem.key || null,
    });
    webTopupLog(log, 'info', 'fulfillment_async_enqueued', {
      orderIdSuffix: orderId.slice(-8),
      jobId: job?.id,
      traceId,
    });
    return {
      ok: true,
      asyncAccepted: true,
      jobId: job?.id ?? null,
      orderIdSuffix: orderId.slice(-8),
      fulfillmentStatus: FULFILLMENT_STATUS.QUEUED,
      dedupeKey: `twf:${orderId}:${attemptNo}`,
      traceId,
    };
  }

  try {
    const phase = await executeWebTopupFulfillmentProviderPhase(orderId, log, {
      traceId,
    });
    if (phase && phase.finished === false) {
      throw serviceError(
        FULFILLMENT_SERVICE_CODE.INVALID_STATE,
        'Fulfillment could not run provider phase (order not in expected state)',
      );
    }
    const fin = await prisma.webTopupOrder.findUnique({ where: { id: orderId } });
    await completeWebTopupFulfillmentIdempotency(orderId, idem.key, {
      attemptNumber: attemptNo,
      fulfillmentStatus: fin?.fulfillmentStatus ?? null,
      fulfillmentErrorCode: fin?.fulfillmentErrorCode ?? null,
    });
  } catch (e) {
    await failWebTopupFulfillmentIdempotency(orderId, idem.key);
    throw e;
  }

  return getWebTopupFulfillmentDiagnostics(orderId, log, {
    emitLog: false,
    includeRunbook: true,
  });
}

/**
 * @param {string} orderId
 * @param {import('pino').Logger | undefined} log
 */
export async function retryWebTopupFulfillment(orderId, log, opts = {}) {
  recordRetry('webtop_fulfillment_retry');
  await prepareWebTopupFulfillmentRetry(orderId, log, { force: opts.force });
  return dispatchWebTopupFulfillment(orderId, log, opts);
}

/**
 * @param {import('@prisma/client').WebTopupOrder} row
 * @returns {Record<string, unknown>}
 */
function serializeWebTopupOrderAdmin(row) {
  return {
    id: row.id,
    sessionKey: row.sessionKey,
    userId: row.userId,
    idempotencyKey: row.idempotencyKey,
    payloadHash: row.payloadHash,
    originCountry: row.originCountry,
    destinationCountry: row.destinationCountry,
    productType: row.productType,
    operatorKey: row.operatorKey,
    operatorLabel: row.operatorLabel,
    phoneNumber: row.phoneNumber,
    productId: row.productId,
    productName: row.productName,
    selectedAmountLabel: row.selectedAmountLabel,
    amountCents: row.amountCents,
    currency: row.currency,
    paymentIntentId: row.paymentIntentId,
    paymentStatus: row.paymentStatus,
    fulfillmentStatus: row.fulfillmentStatus,
    fulfillmentProvider: row.fulfillmentProvider,
    fulfillmentAttemptCount: row.fulfillmentAttemptCount,
    fulfillmentRequestedAt: row.fulfillmentRequestedAt?.toISOString() ?? null,
    fulfillmentCompletedAt: row.fulfillmentCompletedAt?.toISOString() ?? null,
    fulfillmentFailedAt: row.fulfillmentFailedAt?.toISOString() ?? null,
    fulfillmentNextRetryAt: row.fulfillmentNextRetryAt?.toISOString() ?? null,
    fulfillmentReference: row.fulfillmentReference,
    fulfillmentErrorCode: row.fulfillmentErrorCode,
    fulfillmentErrorMessageSafe: row.fulfillmentErrorMessageSafe,
    lastProviderPayloadHash: row.lastProviderPayloadHash,
    updateTokenHashPresent: Boolean(row.updateTokenHash),
    completedByStripeEventId: row.completedByStripeEventId,
    fraudSignals: row.fraudSignals,
    phoneAnalyticsHash: row.phoneAnalyticsHash,
    riskScore: row.riskScore,
    riskLevel: row.riskLevel,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    financialGuardrail: describeFinancialGuardrailForAdmin(row.fulfillmentErrorCode),
    sla: evaluateWebtopOrderSla(row, new Date()),
    uxPublicFieldsEnabled: env.webtopupUxPublicFieldsEnabled,
    ...buildWebtopUserFacingOrderFields(row),
  };
}

/**
 * Mark order delivered without provider (admin override). Does not call Reloadly.
 * @param {string} orderId
 * @param {import('pino').Logger | undefined} log
 * @param {{ fulfillmentReference?: string | null }} [opts]
 */
export async function adminForceDeliverWebTopupOrder(orderId, log, opts = {}) {
  if (!isValidTopupOrderId(orderId)) {
    throw serviceError(FULFILLMENT_SERVICE_CODE.ORDER_NOT_FOUND, 'Order not found');
  }
  const refRaw = opts.fulfillmentReference;
  const ref =
    typeof refRaw === 'string' && refRaw.trim()
      ? refRaw.trim().slice(0, 200)
      : `admin_manual_${Date.now().toString(36)}`;

  const row = await prisma.webTopupOrder.findUnique({ where: { id: orderId } });
  if (!row) {
    throw serviceError(FULFILLMENT_SERVICE_CODE.ORDER_NOT_FOUND, 'Order not found');
  }
  if (row.paymentStatus !== PAYMENT_STATUS.PAID) {
    throw serviceError(FULFILLMENT_SERVICE_CODE.NOT_PAID, 'Order not paid');
  }
  if (row.fulfillmentStatus === FULFILLMENT_STATUS.DELIVERED) {
    return {
      ok: true,
      idempotent: true,
      order: serializeWebTopupOrderAdmin(row),
    };
  }

  await prisma.webTopupOrder.update({
    where: { id: orderId },
    data: {
      fulfillmentStatus: FULFILLMENT_STATUS.DELIVERED,
      fulfillmentCompletedAt: new Date(),
      fulfillmentFailedAt: null,
      fulfillmentErrorCode: null,
      fulfillmentErrorMessageSafe: null,
      fulfillmentNextRetryAt: null,
      fulfillmentReference: ref,
    },
  });

  const next = await prisma.webTopupOrder.findUnique({ where: { id: orderId } });
  return {
    ok: true,
    idempotent: false,
    order: next ? serializeWebTopupOrderAdmin(next) : null,
  };
}

/**
 * Full order row for admin (no update token hash; flags presence only).
 * @param {string} orderId
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function getWebTopupOrderAdminDetails(orderId) {
  if (!isValidTopupOrderId(orderId)) {
    return null;
  }
  const row = await prisma.webTopupOrder.findUnique({ where: { id: orderId } });
  if (!row) return null;
  return serializeWebTopupOrderAdmin(row);
}

/**
 * After Stripe webhook commits `paymentStatus=paid` + `fulfillmentStatus=pending`, run the same
 * dispatch path as admin/manual (`dispatchWebTopupFulfillment`). Deferred with `setImmediate` so
 * webhook DB transaction completes first; duplicate Stripe replays do not schedule (handler only
 * returns orderId on first pending→paid transition).
 *
 * @param {string} orderId
 * @param {import('pino').Logger | undefined} log
 * @param {{ traceId?: string | null }} [opts]
 */
export function scheduleWebTopupFulfillmentAfterPaid(orderId, log, opts = {}) {
  const traceId =
    opts.traceId && typeof opts.traceId === 'string'
      ? opts.traceId.slice(0, 64)
      : null;
  setImmediate(() => {
    void dispatchWebTopupFulfillment(orderId, log, { traceId }).catch((err) => {
      webTopupLog(log, 'error', 'webtop_fulfillment_auto_dispatch_failed', {
        orderIdSuffix: orderId.slice(-8),
        traceId: traceId ?? undefined,
        errName: err?.name,
        errCode: err?.code,
        message:
          typeof err?.message === 'string' ? err.message.slice(0, 200) : undefined,
      });
    });
  });
}
