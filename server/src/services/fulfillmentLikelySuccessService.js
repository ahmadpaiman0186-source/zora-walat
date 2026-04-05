import {
  evaluateProviderEvidenceLayer,
  evaluateBehavioralEvidenceLayer,
  combineLikelyFulfillmentSuccess,
  financialLayerAny,
} from '../domain/fulfillment/fulfillmentLikelySuccess.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { getTraceId } from '../lib/requestContext.js';
import { safeSuffix } from '../lib/webTopupObservability.js';

/**
 * Multi-layer proof: provider, behavioral, financial (DB).
 * Prioritizes avoiding false failure over aggressive recovery.
 *
 * @param {import('@prisma/client').Prisma.TransactionClient | import('@prisma/client').PrismaClient} db
 * @param {import('@prisma/client').PaymentCheckout & { fulfillmentAttempts?: import('@prisma/client').FulfillmentAttempt[] }} order
 * @param {import('@prisma/client').FulfillmentAttempt[]} attempts
 */
export async function detectLikelyFulfillmentSuccess(db, order, attempts) {
  const list = attempts ?? order.fulfillmentAttempts ?? [];
  const provider = evaluateProviderEvidenceLayer(list);
  const behavioral = evaluateBehavioralEvidenceLayer(order, list);
  const financial = await loadFinancialEvidenceLayer(db, order.id, order);
  const combined = combineLikelyFulfillmentSuccess(
    order,
    list,
    provider,
    behavioral,
    financial,
  );

  return {
    likely: combined.likely === true,
    highRisk: combined.highRisk === true,
    reason: combined.reason,
    layers: {
      provider,
      behavioral,
      financial: {
        ...financial,
        any: financialLayerAny(financial),
      },
    },
  };
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient | import('@prisma/client').PrismaClient} db
 * @param {string} orderId
 * @param {{ marginNetUsdCents?: number | null, orderStatus: string }} order
 */
async function loadFinancialEvidenceLayer(db, orderId, order) {
  const marginRecorded = order.marginNetUsdCents != null;
  const orderDelivered =
    order.orderStatus === ORDER_STATUS.FULFILLED ||
    String(order.orderStatus).toUpperCase() === 'FULFILLED';

  let deliveryAudit = false;
  try {
    const row = await db.auditLog.findFirst({
      where: {
        event: 'delivery_succeeded',
        payload: { contains: orderId },
      },
      select: { id: true },
    });
    deliveryAudit = !!row;
  } catch {
    deliveryAudit = false;
  }

  let loyaltyGrant = false;
  try {
    const g = await db.loyaltyPointsGrant.findUnique({
      where: { paymentCheckoutId: orderId },
      select: { id: true },
    });
    loyaltyGrant = !!g;
  } catch {
    loyaltyGrant = false;
  }

  return {
    marginRecorded,
    orderDelivered,
    deliveryAudit,
    loyaltyGrant,
  };
}

/**
 * @param {unknown} metadata
 * @param {{ likelyDelivered?: boolean, manualRequiredClassification?: string, manualRequired?: boolean }} patch
 */
export function mergeLikelyDeliveryMetadata(metadata, patch) {
  const base =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? { ...metadata }
      : {};
  const prev =
    base.processingRecovery &&
    typeof base.processingRecovery === 'object' &&
    !Array.isArray(base.processingRecovery)
      ? { ...base.processingRecovery }
      : {};
  if (patch.likelyDelivered) {
    prev.likelyDelivered = true;
    prev.likelyDeliveredAt = new Date().toISOString();
  }
  if (patch.manualRequired === true) {
    prev.manualRequired = true;
    if (!prev.manualRequiredAt) {
      prev.manualRequiredAt = new Date().toISOString();
    }
  }
  if (patch.manualRequiredClassification != null) {
    prev.manualRequiredClassification = patch.manualRequiredClassification;
  }
  base.processingRecovery = prev;
  return base;
}

/**
 * @param {string} event
 * @param {{ orderId?: string | null, traceId?: string | null, severity?: string, extra?: Record<string, unknown> }} p
 */
export function logFulfillmentIntegrityEvent(event, p) {
  const traceId = p.traceId ?? getTraceId() ?? null;
  console.log(
    JSON.stringify({
      fulfillmentIntegrityLog: true,
      event,
      severity: p.severity ?? 'INFO',
      traceId,
      orderIdSuffix: p.orderId ? safeSuffix(p.orderId, 10) : null,
      t: new Date().toISOString(),
      ...(p.extra && Object.keys(p.extra).length ? { extra: p.extra } : {}),
    }),
  );
}

export function summarizeDetectionLayers(detection) {
  try {
    return {
      providerStrong: detection.layers?.provider?.strong === true,
      behavioralStrong: detection.layers?.behavioral?.strong === true,
      financialAny: detection.layers?.financial?.any === true,
    };
  } catch {
    return {};
  }
}
