import { AIRTIME_OUTCOME } from './airtimeFulfillmentResult.js';

function safeRecipientHint(national) {
  if (!national || typeof national !== 'string' || national.length < 4) {
    return null;
  }
  return `***${national.slice(-4)}`;
}

/**
 * Deterministic mock airtime provider (no external calls).
 * @param {import('@prisma/client').PaymentCheckout} order
 * @param {object} [meta]
 */
export async function fulfillMockAirtime(order, meta = {}) {
  const requestSummary = {
    mode: 'mock',
    packageId: order.packageId ?? null,
    operatorKey: order.operatorKey ?? null,
    recipientHint: safeRecipientHint(order.recipientNational),
    amountUsdCents: order.amountUsdCents,
    currency: order.currency,
    ...meta,
  };

  return {
    outcome: AIRTIME_OUTCOME.SUCCESS,
    providerKey: 'mock',
    providerReference: `mock_${String(order.id).slice(0, 12)}`,
    requestSummary,
    responseSummary: {
      mock: true,
      outcome: AIRTIME_OUTCOME.SUCCESS,
      fulfilledAt: new Date().toISOString(),
    },
  };
}
