import { env } from '../../config/env.js';
import { FULFILLMENT_SERVICE_CODE } from '../../domain/topupOrder/fulfillmentErrors.js';
import { FULFILLMENT_STATUS } from '../../domain/topupOrder/statuses.js';
import { prisma } from '../../db.js';
import { safeSuffix, webTopupLog } from '../../lib/webTopupObservability.js';
import { hashNormalizedFulfillmentRequest } from './fulfillmentPayload.js';
import { fulfillmentResultToStatePatch } from './fulfillmentOutcome.js';
import { resolveTopupFulfillmentProvider } from './providerRegistry.js';
import {
  assertTopupProviderCircuitClosed,
  recordTopupProviderCircuitOutcome,
} from './topupProviderCircuit.js';
import { persistWebTopupRiskAssessment } from '../webtopRiskEngine.js';

/** @typedef {import('./providers/topupProviderTypes.js').TopupFulfillmentRequest} TopupFulfillmentRequest */

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
 * @param {import('@prisma/client').WebTopupOrder} row
 * @param {string} [correlationId]
 * @returns {TopupFulfillmentRequest}
 */
function orderRowToFulfillmentRequest(row, correlationId) {
  return {
    orderId: row.id,
    destinationCountry: row.destinationCountry,
    productType: /** @type {'airtime' | 'data' | 'calling'} */ (row.productType),
    operatorKey: row.operatorKey,
    operatorLabel: row.operatorLabel,
    phoneNationalDigits: row.phoneNumber,
    productId: row.productId,
    productName: row.productName,
    amountCents: row.amountCents,
    currency: row.currency,
    correlationId,
  };
}

async function saveFulfillmentOutcome(orderId, patch) {
  await prisma.webTopupOrder.update({
    where: { id: orderId },
    data: {
      fulfillmentStatus: patch.fulfillmentStatus,
      fulfillmentReference: patch.fulfillmentReference,
      fulfillmentCompletedAt: patch.fulfillmentCompletedAt,
      fulfillmentFailedAt: patch.fulfillmentFailedAt,
      fulfillmentErrorCode: patch.fulfillmentErrorCode,
      fulfillmentErrorMessageSafe: patch.fulfillmentErrorMessageSafe,
      lastProviderPayloadHash: patch.lastProviderPayloadHash,
    },
  });
}

function applyMockFailsim(providerId) {
  if (String(providerId) !== 'mock') return null;
  const sim = env.webtopupFailsim;
  if (!sim) return null;
  if (sim === 'timeout' || sim === 'retry') {
    return {
      outcome: /** @type {const} */ ('failed_retryable'),
      errorCode: 'FAILSIM_TIMEOUT',
      errorMessageSafe: 'Simulated timeout (WEBTOPUP_FAILSIM)',
    };
  }
  if (sim === 'terminal') {
    return {
      outcome: /** @type {const} */ ('failed_terminal'),
      errorCode: 'FAILSIM_TERMINAL',
      errorMessageSafe: 'Simulated terminal failure (WEBTOPUP_FAILSIM)',
    };
  }
  if (sim === 'unsupported') {
    return {
      outcome: /** @type {const} */ ('unsupported_route'),
      errorCode: 'FAILSIM_UNSUPPORTED',
      errorMessageSafe: 'Simulated unsupported route (WEBTOPUP_FAILSIM)',
    };
  }
  return null;
}

/**
 * QUEUED → PROCESSING → provider → terminal state. Does not perform PENDING→QUEUED claim.
 * @param {string} orderId
 * @param {import('pino').Logger | undefined} log
 * @param {{ traceId?: string }} [ctx]
 * @returns {Promise<{ finished: boolean, reason?: string }>}
 */
export async function executeWebTopupFulfillmentProviderPhase(orderId, log, ctx = {}) {
  const rowPeek = await prisma.webTopupOrder.findUnique({ where: { id: orderId } });
  if (!rowPeek) {
    throw serviceError(FULFILLMENT_SERVICE_CODE.ORDER_NOT_FOUND, 'Order not found');
  }

  const providerId = String(rowPeek.fulfillmentProvider ?? env.webTopupFulfillmentProvider)
    .trim()
    .toLowerCase();
  const provider = resolveTopupFulfillmentProvider(providerId);
  if (!provider) {
    throw serviceError(
      FULFILLMENT_SERVICE_CODE.PROVIDER_NOT_CONFIGURED,
      'Fulfillment provider not available',
    );
  }

  const proc = await prisma.webTopupOrder.updateMany({
    where: {
      id: orderId,
      fulfillmentStatus: FULFILLMENT_STATUS.QUEUED,
    },
    data: { fulfillmentStatus: FULFILLMENT_STATUS.PROCESSING },
  });

  if (proc.count !== 1) {
    const cur = await prisma.webTopupOrder.findUnique({
      where: { id: orderId },
      select: { fulfillmentStatus: true },
    });
    if (cur?.fulfillmentStatus === FULFILLMENT_STATUS.PROCESSING) {
      webTopupLog(log, 'warn', 'fulfillment_dispatch_rejected', {
        orderIdSuffix: orderId.slice(-8),
        reason: 'already_processing',
        traceId: ctx.traceId,
      });
      return;
    }
    throw serviceError(FULFILLMENT_SERVICE_CODE.INVALID_STATE, 'Fulfillment state error');
  }

  webTopupLog(log, 'info', 'fulfillment_processing', {
    orderIdSuffix: orderId.slice(-8),
    providerId,
    traceId: ctx.traceId,
  });

  const row = await prisma.webTopupOrder.findUniqueOrThrow({ where: { id: orderId } });
  const correlationId =
    ctx.traceId ?? `${orderId.slice(-8)}_${Date.now().toString(36)}`;
  const request = orderRowToFulfillmentRequest(row, correlationId);
  const payloadHash = hashNormalizedFulfillmentRequest(request);

  await prisma.webTopupOrder.update({
    where: { id: orderId },
    data: { lastProviderPayloadHash: payloadHash },
  });

  assertTopupProviderCircuitClosed(providerId);

  const t0 = Date.now();
  webTopupLog(log, 'info', 'fulfillment_provider_called', {
    orderIdSuffix: orderId.slice(-8),
    providerId,
    payloadHashPrefix: payloadHash.slice(0, 12),
    traceId: ctx.traceId,
    ...(providerId === 'reloadly' ? { rolloutScope: 'AF:airtime' } : {}),
  });

  const failsim = applyMockFailsim(providerId);

  /** @type {import('./providers/topupProviderTypes.js').TopupFulfillmentResult} */
  let result;
  if (failsim) {
    result = failsim;
  } else {
    try {
      result = await provider.sendTopup(request);
    } catch {
      result = {
        outcome: 'failed_retryable',
        errorCode: 'PROVIDER_EXCEPTION',
        errorMessageSafe: 'Provider threw unexpectedly',
      };
    }
  }

  const latencyMs = Date.now() - t0;
  webTopupLog(log, 'info', 'fulfillment_provider_latency', {
    orderIdSuffix: orderId.slice(-8),
    providerId,
    latencyMs,
    outcome: result.outcome,
    traceId: ctx.traceId,
  });

  recordTopupProviderCircuitOutcome(
    providerId,
    result.outcome === 'succeeded',
  );

  const patch = fulfillmentResultToStatePatch(result, payloadHash);

  if (result.outcome === 'unsupported_route') {
    webTopupLog(log, 'warn', 'fulfillment_provider_unsupported', {
      orderIdSuffix: orderId.slice(-8),
      providerId,
      traceId: ctx.traceId,
    });
  }

  await saveFulfillmentOutcome(orderId, patch);

  if (providerId === 'reloadly' && env.reloadlySandbox === true) {
    const ok = result.outcome === 'succeeded';
    webTopupLog(log, ok ? 'info' : 'warn', ok ? 'sandbox_dispatch_verified' : 'sandbox_dispatch_failed', {
      orderIdSuffix: orderId.slice(-8),
      outcome: result.outcome,
      errorCode: result.errorCode,
      traceId: ctx.traceId,
    });
  }

  switch (result.outcome) {
    case 'succeeded':
      webTopupLog(log, 'info', 'fulfillment_succeeded', {
        orderIdSuffix: orderId.slice(-8),
        providerId,
        traceId: ctx.traceId,
        referenceSuffix: result.providerReference
          ? result.providerReference.slice(-12)
          : undefined,
      });
      break;
    case 'pending_verification':
      webTopupLog(log, 'info', 'fulfillment_pending_verification', {
        orderIdSuffix: orderId.slice(-8),
        providerId,
        traceId: ctx.traceId,
        errorCode: result.errorCode,
        referenceSuffix: result.providerReference
          ? result.providerReference.slice(-12)
          : undefined,
      });
      break;
    case 'failed_retryable':
      webTopupLog(log, 'warn', 'fulfillment_failed_retryable', {
        orderIdSuffix: orderId.slice(-8),
        providerId,
        errorCode: result.errorCode,
        traceId: ctx.traceId,
      });
      break;
    default:
      webTopupLog(log, 'warn', 'fulfillment_failed_terminal', {
        orderIdSuffix: orderId.slice(-8),
        providerId,
        outcome: result.outcome,
        errorCode: result.errorCode,
        traceId: ctx.traceId,
      });
  }

  await persistWebTopupRiskAssessment(orderId, log);

  return { finished: true };
}
