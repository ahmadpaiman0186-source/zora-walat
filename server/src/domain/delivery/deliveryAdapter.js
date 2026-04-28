import { env } from '../../config/env.js';
import { AIRTIME_OUTCOME, AIRTIME_ERROR_KIND } from '../fulfillment/airtimeFulfillmentResult.js';
import { executeAirtimeFulfillment } from '../fulfillment/executeAirtimeFulfillment.js';
import { fulfillMockAirtime } from '../fulfillment/mockAirtimeProvider.js';
import { fulfillReloadlyDelivery } from '../../services/reloadlyClient.js';
import { shouldBlockPhase1ReloadlyOutbound } from '../fulfillment/fulfillmentOutboundPolicy.js';

/** Mock fallback when Reloadly is selected but unavailable — explicit env only (never NODE_ENV). */
function allowReloadlyUnavailableMockFallback() {
  return env.reloadlyAllowUnavailableMockFallback === true;
}

/**
 * Provider routing: Reloadly sandbox/production vs mock. Orchestration stays upstream.
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
export async function runDeliveryAdapter(order, fulfillmentCtx = {}) {
  if (env.airtimeProvider === 'reloadly') {
    if (
      shouldBlockPhase1ReloadlyOutbound(process.env.NODE_ENV, {
        phase1FulfillmentOutboundEnabled: env.phase1FulfillmentOutboundEnabled === true,
      })
    ) {
      return {
        outcome: AIRTIME_OUTCOME.UNAVAILABLE,
        providerKey: 'reloadly',
        failureCode: 'fulfillment_outbound_disabled',
        failureMessage:
          'Reloadly outbound execution disabled (set PHASE1_FULFILLMENT_OUTBOUND_ENABLED=true or run under NODE_ENV=test).',
        errorKind: AIRTIME_ERROR_KIND.CONFIG,
        requestSummary: {
          packageId: order.packageId ?? null,
          gate: 'phase1_outbound_policy',
        },
        responseSummary: {},
      };
    }
    const r = await fulfillReloadlyDelivery(order, fulfillmentCtx);
    if (r.outcome === AIRTIME_OUTCOME.SUCCESS) {
      return r;
    }
    if (r.outcome === AIRTIME_OUTCOME.UNAVAILABLE) {
      if (allowReloadlyUnavailableMockFallback()) {
        return fulfillMockAirtime(order, {
          ...fulfillmentCtx,
          fallbackFrom: 'reloadly',
          fallbackReason: r.failureCode ?? 'unavailable',
        });
      }
      console.error('Reloadly provider selected but not configured or unavailable');
      return {
        outcome: AIRTIME_OUTCOME.FAILURE,
        providerKey: 'reloadly',
        failureCode: 'reloadly_not_configured',
        failureMessage:
          r.failureMessage ?? 'Reloadly selected but credentials are not configured',
        errorKind: AIRTIME_ERROR_KIND.CONFIG,
        requestSummary: r.requestSummary ?? { packageId: order.packageId ?? null },
        responseSummary: r.responseSummary ?? {},
      };
    }
    return r;
  }

  return executeAirtimeFulfillment(order, fulfillmentCtx);
}
