import { AIRTIME_OUTCOME } from '../domain/fulfillment/airtimeFulfillmentResult.js';
import { runDeliveryAdapter } from '../domain/delivery/deliveryAdapter.js';
import { logDeliveryEvent } from './deliveryLogger.js';

/**
 * Delivery execution boundary: payment is already captured; this runs provider I/O only.
 * Structured logs for ops; persistence remains in fulfillmentProcessingService.
 *
 * @param {import('@prisma/client').PaymentCheckout} order
 * @param {{ attemptId?: string, attemptNumber?: number, traceId?: string | null, log?: import('pino').Logger }} [fulfillmentCtx]
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
