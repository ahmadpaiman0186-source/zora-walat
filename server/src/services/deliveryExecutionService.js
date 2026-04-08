import { AIRTIME_OUTCOME } from '../domain/fulfillment/airtimeFulfillmentResult.js';
import { validateAirtimeAdapterResult } from '../domain/fulfillment/providerContract.js';
import { runDeliveryAdapter } from '../domain/delivery/deliveryAdapter.js';
import { bumpCounter } from '../lib/opsMetrics.js';
import { logDeliveryEvent } from './deliveryLogger.js';

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
  logDeliveryEvent({
    orderId,
    phase: 'delivery_provider_invoke',
    result: 'pending',
    failureReason: null,
    detail: 'adapter_start',
  });

  const result = await runDeliveryAdapter(order, fulfillmentCtx);

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
