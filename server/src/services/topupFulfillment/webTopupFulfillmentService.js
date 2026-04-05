import { FULFILLMENT_STATUS, PAYMENT_STATUS } from '../../domain/topupOrder/statuses.js';
import { FULFILLMENT_DB_ERROR, FULFILLMENT_SERVICE_CODE } from '../../domain/topupOrder/fulfillmentErrors.js';
import { env } from '../../config/env.js';
import { prisma } from '../../db.js';
import { safeSuffix, webTopupLog } from '../../lib/webTopupObservability.js';
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

  return out;
}

/**
 * Prepare retry: FAILED + retryable → PENDING (clears last error fields).
 * @param {string} orderId
 * @param {import('pino').Logger | undefined} log
 */
export async function prepareWebTopupFulfillmentRetry(orderId, log) {
  if (!isValidTopupOrderId(orderId)) {
    throw serviceError(FULFILLMENT_SERVICE_CODE.ORDER_NOT_FOUND, 'Order not found');
  }

  const providerId = String(env.webTopupFulfillmentProvider ?? 'mock')
    .trim()
    .toLowerCase();
  assertFulfillmentDispatchAllowed(providerId);

  webTopupLog(log, 'info', 'fulfillment_retry_requested', {
    orderIdSuffix: orderId.slice(-8),
  });

  const row = await prisma.webTopupOrder.findUnique({ where: { id: orderId } });
  if (!row) {
    throw serviceError(FULFILLMENT_SERVICE_CODE.ORDER_NOT_FOUND, 'Order not found');
  }

  const el = assertEligibleForRetryDispatch(row);
  if (!el.ok) {
    webTopupLog(log, 'warn', 'fulfillment_dispatch_rejected', {
      orderIdSuffix: orderId.slice(-8),
      reason: el.code,
      mode: 'retry_prepare',
    });
    throw serviceError(el.code, 'Not eligible for retry');
  }

  if (row.fulfillmentStatus === FULFILLMENT_STATUS.RETRYING) {
    const n = await prisma.webTopupOrder.updateMany({
      where: {
        id: orderId,
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.RETRYING,
      },
      data: {
        fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
        fulfillmentErrorCode: null,
        fulfillmentErrorMessageSafe: null,
        fulfillmentFailedAt: null,
      },
    });
    if (n.count !== 1) {
      throw serviceError(
        FULFILLMENT_SERVICE_CODE.INVALID_STATE,
        'Could not prepare retry',
      );
    }
  } else if (
    row.fulfillmentStatus === FULFILLMENT_STATUS.FAILED &&
    row.fulfillmentErrorCode === FULFILLMENT_DB_ERROR.RETRYABLE
  ) {
    const n = await prisma.webTopupOrder.updateMany({
      where: {
        id: orderId,
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
        fulfillmentErrorCode: FULFILLMENT_DB_ERROR.RETRYABLE,
      },
      data: {
        fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
        fulfillmentErrorCode: null,
        fulfillmentErrorMessageSafe: null,
        fulfillmentFailedAt: null,
      },
    });
    if (n.count !== 1) {
      throw serviceError(
        FULFILLMENT_SERVICE_CODE.INVALID_STATE,
        'Could not prepare retry',
      );
    }
  }

  webTopupLog(log, 'info', 'fulfillment_retry_completed', {
    orderIdSuffix: orderId.slice(-8),
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
    opts.traceId && typeof opts.traceId === 'string'
      ? opts.traceId.slice(0, 64)
      : `${orderId.slice(-8)}_${Date.now().toString(36)}`;

  webTopupLog(log, 'info', 'fulfillment_dispatch_requested', {
    orderIdSuffix: orderId.slice(-8),
    traceId,
  });

  const row = await prisma.webTopupOrder.findUnique({ where: { id: orderId } });
  if (!row) {
    throw serviceError(FULFILLMENT_SERVICE_CODE.ORDER_NOT_FOUND, 'Order not found');
  }

  const el = assertEligibleForInitialDispatch(row);
  if (!el.ok) {
    webTopupLog(log, 'warn', 'fulfillment_dispatch_rejected', {
      orderIdSuffix: orderId.slice(-8),
      reason: el.code,
    });
    throw serviceError(el.code, 'Not eligible for fulfillment');
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
    orderIdSuffix: orderId.slice(-8),
    providerId,
    attemptNo,
    traceId,
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
  await prepareWebTopupFulfillmentRetry(orderId, log);
  return dispatchWebTopupFulfillment(orderId, log, opts);
}
