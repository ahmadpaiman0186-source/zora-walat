import { AIRTIME_OUTCOME } from '../domain/fulfillment/airtimeFulfillmentResult.js';
import { validateAirtimeAdapterResult } from '../domain/fulfillment/providerContract.js';
import { runDeliveryAdapter } from '../domain/delivery/deliveryAdapter.js';
import { bumpCounter } from '../lib/opsMetrics.js';
import { buildProviderExecutionCorrelationId } from '../lib/providerExecutionCorrelation.js';
import { logDeliveryEvent } from './deliveryLogger.js';

function providerExecutionLogBase(orderId, attemptId, providerCorrelationId, traceId) {
  return {
    providerExecution: true,
    orderIdSuffix: String(orderId).slice(-12),
    attemptIdSuffix: attemptId ? String(attemptId).slice(-12) : null,
    providerCorrelationId: providerCorrelationId || null,
    traceId: traceId ?? null,
    t: new Date().toISOString(),
  };
}

/**
 * Delivery execution boundary: payment is already captured; this runs provider I/O only.
 * Structured logs for ops; persistence remains in fulfillmentProcessingService.
 *
 * @param {import('@prisma/client').PaymentCheckout} order
 * @param {{
 *   attemptId?: string,
 *   attemptNumber?: number,
 *   traceId?: string | null,
 *   log?: import('pino').Logger,
 *   bullmqAttemptsMade?: number,
 *   forceProviderInquiryBeforePost?: boolean,
 *   attemptStartedAt?: Date | string | null,
 * }} [fulfillmentCtx]
 */
export async function executeDelivery(order, fulfillmentCtx = {}) {
  const orderId = order.id;
  const attemptId = fulfillmentCtx.attemptId;
  const providerCorrelationId =
    attemptId && typeof attemptId === 'string'
      ? buildProviderExecutionCorrelationId(attemptId, orderId)
      : '';

  console.log(
    JSON.stringify({
      ...providerExecutionLogBase(orderId, attemptId, providerCorrelationId, fulfillmentCtx.traceId),
      event: 'providerRequestSent',
    }),
  );

  logDeliveryEvent({
    orderId,
    phase: 'delivery_provider_invoke',
    result: 'pending',
    failureReason: null,
    detail: 'adapter_start',
  });

  let result;
  try {
    result = await runDeliveryAdapter(order, {
      ...fulfillmentCtx,
      ...(providerCorrelationId ? { providerCorrelationId } : {}),
    });
  } catch (e) {
    console.log(
      JSON.stringify({
        ...providerExecutionLogBase(
          orderId,
          attemptId,
          providerCorrelationId,
          fulfillmentCtx.traceId,
        ),
        event: 'providerExecutionFailed',
        err: String(e?.message ?? e).slice(0, 400),
      }),
    );
    throw e;
  }

  const mergeSummary = (s) => ({
    ...(typeof s === 'object' && s !== null && !Array.isArray(s) ? s : {}),
    ...(providerCorrelationId ? { providerCorrelationId } : {}),
  });
  result = {
    ...result,
    requestSummary: mergeSummary(result.requestSummary),
    responseSummary: mergeSummary(result.responseSummary),
  };

  const contractCheck = validateAirtimeAdapterResult(result);
  if (!contractCheck.valid) {
    bumpCounter('fulfillment_provider_contract_violation_pre_normalize');
    console.warn(
      JSON.stringify({
        deliveryContract: true,
        event: 'provider_contract_violation_pre_normalize',
        orderIdSuffix: String(orderId).slice(-12),
        issues: contractCheck.issues,
        traceId: fulfillmentCtx.traceId ?? null,
        t: new Date().toISOString(),
      }),
    );
  }

  const ok = result.outcome === AIRTIME_OUTCOME.SUCCESS;
  const verifying =
    result.outcome === AIRTIME_OUTCOME.PENDING_VERIFICATION ||
    result.outcome === AIRTIME_OUTCOME.AMBIGUOUS;

  console.log(
    JSON.stringify({
      ...providerExecutionLogBase(orderId, attemptId, providerCorrelationId, fulfillmentCtx.traceId),
      event: 'providerResponseReceived',
      outcome: result.outcome,
      providerReference: result.providerReference ?? null,
      providerKey: result.providerKey ?? null,
      failureCode: result.failureCode ?? null,
      errorKind: result.errorKind ?? null,
    }),
  );

  logDeliveryEvent({
    orderId,
    phase: 'delivery_provider_result',
    result: ok ? 'ok' : verifying ? 'pending' : 'failure',
    failureReason: ok
      ? null
      : verifying
        ? String(result.outcome).slice(0, 120)
        : String(result.failureCode ?? result.errorKind ?? 'unknown').slice(0, 120),
    detail: ok
      ? null
      : verifying
        ? String(result.failureMessage ?? result.outcome ?? '').slice(0, 80)
        : String(result.failureMessage ?? '').slice(0, 80),
  });

  return result;
}
