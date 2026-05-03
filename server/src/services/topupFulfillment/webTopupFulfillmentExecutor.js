import { randomUUID } from 'node:crypto';

import { env } from '../../config/env.js';
import { resolveReloadlyOperatorId } from '../../domain/fulfillment/reloadlyOperatorMapping.js';
import { FULFILLMENT_SERVICE_CODE } from '../../domain/topupOrder/fulfillmentErrors.js';
import { FULFILLMENT_STATUS } from '../../domain/topupOrder/statuses.js';
import { computeFulfillmentNextRetryAt } from '../../domain/topupOrder/webtopFulfillmentAutoRetryPolicy.js';
import {
  fulfillmentFailureRetryable,
  isTerminalFulfillmentFailure,
  persistedFulfillmentErrorCode,
} from '../../domain/topupOrder/webtopFulfillmentFailureSemantics.js';
import { prisma } from '../../db.js';
import {
  safeSuffix,
  webTopupCorrelationFields,
  webTopupLog,
} from '../../lib/webTopupObservability.js';
import { hashNormalizedFulfillmentRequest } from './fulfillmentPayload.js';
import { fulfillmentResultToStatePatch } from './fulfillmentOutcome.js';
import { resolveTopupFulfillmentProvider } from './providerRegistry.js';
import { executeTopupWithReliability } from '../providers/providerRouter.js';
import {
  checkAllowReloadlyWebtopupCall,
  isReloadlyWebtopupDurableCircuitEnabled,
  recordReloadlyWebtopupProviderOutcome,
} from '../reliability/reloadlyWebtopupDurableCircuit.js';
import { enqueueReliabilityRecoveryJob } from '../reliability/recoveryQueue.js';
import { recordProviderLatencySample } from '../reliability/watchdog.js';
import {
  assertTopupProviderCircuitClosed,
  recordTopupProviderCircuitOutcome,
} from './topupProviderCircuit.js';
import { persistWebTopupRiskAssessment } from '../webtopRiskEngine.js';
import { evaluateWebTopupFinancialGuardrails } from './webtopFinancialGuardrails.js';
import { mirrorCanonicalWebTopupOrderById } from '../canonicalTransactionSync.js';

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
      fulfillmentNextRetryAt: patch.fulfillmentNextRetryAt,
    },
  });
  await mirrorCanonicalWebTopupOrderById(prisma, orderId, undefined);
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
  if (!ctx.traceId || !String(ctx.traceId).trim()) {
    ctx.traceId = `wt_${randomUUID().replace(/-/g, '')}`;
  } else {
    ctx.traceId = String(ctx.traceId).trim().slice(0, 128);
  }

  const rowPeek = await prisma.webTopupOrder.findUnique({ where: { id: orderId } });
  if (!rowPeek) {
    throw serviceError(FULFILLMENT_SERVICE_CODE.ORDER_NOT_FOUND, 'Order not found');
  }

  const fin = await evaluateWebTopupFinancialGuardrails(rowPeek, { traceId: ctx.traceId });
  if (!fin.ok) {
    webTopupLog(log, 'warn', 'financial_guardrail_blocked', {
      ...webTopupCorrelationFields(orderId, rowPeek.paymentIntentId, ctx.traceId),
      guardrailCode: fin.code,
      amountCents: rowPeek.amountCents,
      currency: rowPeek.currency,
      paymentStatus: rowPeek.paymentStatus,
      fulfillmentStatus: rowPeek.fulfillmentStatus,
    });
    const failed = await prisma.webTopupOrder.updateMany({
      where: {
        id: orderId,
        fulfillmentStatus: FULFILLMENT_STATUS.QUEUED,
      },
      data: {
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
        fulfillmentErrorCode: fin.code,
        fulfillmentErrorMessageSafe: fin.messageSafe.slice(0, 200),
        fulfillmentFailedAt: new Date(),
        fulfillmentNextRetryAt: null,
      },
    });
    if (failed.count === 1) {
      return { finished: true, reason: 'financial_guardrail_blocked' };
    }
    return { finished: false, reason: 'financial_guardrail_race_or_state' };
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
        ...webTopupCorrelationFields(orderId, rowPeek.paymentIntentId, ctx.traceId),
        reason: 'already_processing',
      });
      return { finished: false, reason: 'already_processing' };
    }
    throw serviceError(FULFILLMENT_SERVICE_CODE.INVALID_STATE, 'Fulfillment state error');
  }

  const row = await prisma.webTopupOrder.findUniqueOrThrow({ where: { id: orderId } });
  webTopupLog(log, 'info', 'fulfillment_started', {
    ...webTopupCorrelationFields(orderId, row.paymentIntentId, ctx.traceId),
    providerId,
    fulfillmentAttemptCount: row.fulfillmentAttemptCount,
  });
  const correlationId =
    ctx.traceId ?? `${orderId.slice(-8)}_${Date.now().toString(36)}`;
  const request = orderRowToFulfillmentRequest(row, correlationId);
  const payloadHash = hashNormalizedFulfillmentRequest(request);

  await prisma.webTopupOrder.update({
    where: { id: orderId },
    data: { lastProviderPayloadHash: payloadHash },
  });

  const useReliability = env.webtopupReliabilityEnabled !== false;
  /** Router path records circuit outcomes internally */
  let routerHandledCircuit = false;

  const t0 = Date.now();
  let reloadlyOperatorIdForLog;
  if (providerId === 'reloadly') {
    const resolved = resolveReloadlyOperatorId(request.operatorKey, env.reloadlyOperatorMap);
    if (resolved.ok) reloadlyOperatorIdForLog = resolved.operatorId;
  }
  webTopupLog(log, 'info', 'fulfillment_provider_called', {
    ...webTopupCorrelationFields(orderId, row.paymentIntentId, ctx.traceId),
    providerId,
    payloadHashPrefix: payloadHash.slice(0, 12),
    ...(providerId === 'reloadly'
      ? {
          rolloutScope: 'AF:airtime',
          ...(reloadlyOperatorIdForLog != null
            ? { reloadlyOperatorId: reloadlyOperatorIdForLog }
            : {}),
        }
      : {}),
  });

  const failsim = applyMockFailsim(providerId);

  /** @type {import('./providers/topupProviderTypes.js').TopupFulfillmentResult} */
  let result;
  if (failsim) {
    result = failsim;
  } else if (useReliability) {
    routerHandledCircuit = true;
    result = await executeTopupWithReliability({
      request,
      primary: provider,
      log,
      traceId: ctx.traceId,
      orderIdSuffix: orderId.slice(-8),
    });
  } else if (providerId === 'reloadly' && isReloadlyWebtopupDurableCircuitEnabled()) {
    routerHandledCircuit = true;
    const gate = await checkAllowReloadlyWebtopupCall({
      log,
      traceId: ctx.traceId,
      orderIdSuffix: orderId.slice(-8),
    });
    if (!gate.allowed) {
      webTopupLog(log, 'warn', 'provider_call_blocked_by_circuit', {
        ...webTopupCorrelationFields(orderId, row.paymentIntentId, ctx.traceId),
        providerId,
        state: gate.state,
        cooldownUntil: gate.cooldownUntil,
        reason: gate.reason,
      });
      result = {
        outcome: 'failed_retryable',
        errorCode: 'provider_circuit_open',
        errorMessageSafe: 'Reloadly circuit is open; outbound call not attempted',
      };
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
      await recordReloadlyWebtopupProviderOutcome({
        success: result.outcome === 'succeeded',
        log,
        traceId: ctx.traceId,
      });
    }
  } else {
    assertTopupProviderCircuitClosed(providerId);
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
  recordProviderLatencySample(providerId, latencyMs);
  webTopupLog(log, 'info', 'fulfillment_provider_latency', {
    ...webTopupCorrelationFields(orderId, row.paymentIntentId, ctx.traceId),
    providerId,
    latencyMs,
    outcome: result.outcome,
  });

  if (!routerHandledCircuit) {
    recordTopupProviderCircuitOutcome(
      providerId,
      result.outcome === 'succeeded',
    );
  }

  if (
    env.webtopupRecoveryEnqueue &&
    result.outcome === 'failed_retryable' &&
    useReliability
  ) {
    const rowA = await prisma.webTopupOrder.findUnique({
      where: { id: orderId },
      select: { fulfillmentAttemptCount: true },
    });
    const attemptNo = Math.max(1, (rowA?.fulfillmentAttemptCount ?? 0) + 1);
    enqueueReliabilityRecoveryJob({
      orderId,
      attemptNo,
      reason: 'failed_retryable',
      traceId: ctx.traceId,
      log,
    }).catch((e) => {
      log?.warn?.({ err: e }, 'reliability_recovery_enqueue_failed');
    });
  }

  const patch = fulfillmentResultToStatePatch(result, payloadHash);
  if (result.outcome === 'failed_retryable') {
    const persisted = persistedFulfillmentErrorCode(result);
    patch.fulfillmentNextRetryAt = computeFulfillmentNextRetryAt(
      row.fulfillmentAttemptCount,
      persisted,
      result.outcome,
    );
    if (patch.fulfillmentNextRetryAt) {
      webTopupLog(log, 'info', 'fulfillment_retry_scheduled', {
        ...webTopupCorrelationFields(orderId, row.paymentIntentId, ctx.traceId),
        provider: providerId,
        attemptCount: row.fulfillmentAttemptCount,
        nextRetryAt: patch.fulfillmentNextRetryAt.toISOString(),
        errorCode: persisted,
      });
    }
  } else {
    patch.fulfillmentNextRetryAt = null;
  }

  if (result.outcome === 'unsupported_route') {
    webTopupLog(log, 'warn', 'fulfillment_provider_unsupported', {
      ...webTopupCorrelationFields(orderId, row.paymentIntentId, ctx.traceId),
      providerId,
    });
  }

  try {
    await saveFulfillmentOutcome(orderId, patch);
  } catch (persistErr) {
    webTopupLog(log, 'error', 'fulfillment_persist_failed', {
      ...webTopupCorrelationFields(orderId, row.paymentIntentId, ctx.traceId),
      providerId,
      errName: persistErr?.name,
      message:
        typeof persistErr?.message === 'string'
          ? persistErr.message.slice(0, 200)
          : undefined,
    });
    throw persistErr;
  }

  if (providerId === 'reloadly' && env.reloadlySandbox === true) {
    const ok = result.outcome === 'succeeded';
    webTopupLog(log, ok ? 'info' : 'warn', ok ? 'sandbox_dispatch_verified' : 'sandbox_dispatch_failed', {
      ...webTopupCorrelationFields(orderId, row.paymentIntentId, ctx.traceId),
      outcome: result.outcome,
      errorCode: result.errorCode,
    });
  }

  if (isTerminalFulfillmentFailure(result)) {
    webTopupLog(log, 'warn', 'fulfillment_failed', {
      ...webTopupCorrelationFields(orderId, row.paymentIntentId, ctx.traceId),
      provider: providerId,
      errorCode: persistedFulfillmentErrorCode(result),
      retryable: fulfillmentFailureRetryable(result),
      outcome: result.outcome,
    });
  }

  switch (result.outcome) {
    case 'succeeded':
      webTopupLog(log, 'info', 'fulfillment_succeeded', {
        ...webTopupCorrelationFields(orderId, row.paymentIntentId, ctx.traceId),
        providerId,
        referenceSuffix: result.providerReference
          ? result.providerReference.slice(-12)
          : undefined,
      });
      break;
    case 'pending_verification':
      webTopupLog(log, 'info', 'fulfillment_pending_verification', {
        ...webTopupCorrelationFields(orderId, row.paymentIntentId, ctx.traceId),
        providerId,
        errorCode: result.errorCode,
        referenceSuffix: result.providerReference
          ? result.providerReference.slice(-12)
          : undefined,
      });
      break;
    case 'failed_retryable':
      webTopupLog(log, 'warn', 'fulfillment_failed_retryable', {
        ...webTopupCorrelationFields(orderId, row.paymentIntentId, ctx.traceId),
        providerId,
        errorCode: result.errorCode,
      });
      break;
    default:
      webTopupLog(log, 'warn', 'fulfillment_failed_terminal', {
        ...webTopupCorrelationFields(orderId, row.paymentIntentId, ctx.traceId),
        providerId,
        outcome: result.outcome,
        errorCode: result.errorCode,
      });
  }

  await persistWebTopupRiskAssessment(orderId, log);

  return { finished: true };
}
