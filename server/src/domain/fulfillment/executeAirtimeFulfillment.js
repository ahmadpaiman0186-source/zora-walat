import { env } from '../../config/env.js';
import { AIRTIME_OUTCOME, AIRTIME_ERROR_KIND } from './airtimeFulfillmentResult.js';
import {
  classifyProviderError,
  safeErrorDiagnostics,
} from './classifyProviderError.js';
import { fulfillMockAirtime } from './mockAirtimeProvider.js';

const PROVIDER = {
  MOCK: 'mock',
  RELOADLY: 'reloadly',
};

export function resolveAirtimeProviderName() {
  const raw = String(env.airtimeProvider ?? PROVIDER.MOCK).trim().toLowerCase();
  if (raw === PROVIDER.RELOADLY) return PROVIDER.RELOADLY;
  return PROVIDER.MOCK;
}

/**
 * Mock airtime fulfillment only — Reloadly is routed in `deliveryAdapter.js`.
 *
 * @param {import('@prisma/client').PaymentCheckout} order
 * @param {Record<string, unknown>} [fulfillmentCtx]
 */
export async function executeAirtimeFulfillment(order, fulfillmentCtx = {}) {
  const name = resolveAirtimeProviderName();

  try {
    return await fulfillMockAirtime(order, fulfillmentCtx);
  } catch (err) {
    const { errorKind, failureCode } = classifyProviderError(err);
    const msg = String(err?.message ?? err ?? 'provider_error').slice(0, 300);
    return {
      outcome: AIRTIME_OUTCOME.FAILURE,
      providerKey: name,
      failureCode,
      failureMessage: msg,
      errorKind,
      requestSummary: {
        packageId: order.packageId ?? null,
        ...(typeof fulfillmentCtx.providerCorrelationId === 'string'
          ? { providerCorrelationId: fulfillmentCtx.providerCorrelationId }
          : {}),
      },
      responseSummary: { diagnostic: safeErrorDiagnostics(err) },
    };
  }
}

export { PROVIDER };
