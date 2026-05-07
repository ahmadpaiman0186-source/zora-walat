import { env } from '../../config/env.js';
import { bumpCounter } from '../../lib/opsMetrics.js';
import { emitPhase1OperationalEvent } from '../../lib/phase1OperationalEvents.js';
import { AIRTIME_OUTCOME, AIRTIME_ERROR_KIND } from '../fulfillment/airtimeFulfillmentResult.js';
import { executeAirtimeFulfillment } from '../fulfillment/executeAirtimeFulfillment.js';
import { fulfillMockAirtime } from '../fulfillment/mockAirtimeProvider.js';
import { fulfillReloadlyDelivery } from '../../services/reloadlyClient.js';
import { shouldBlockPhase1ReloadlyOutbound } from '../fulfillment/fulfillmentOutboundPolicy.js';
import {
  explicitReloadlyMockFallbackEnabled,
  liveSimulationProofAllowsOutboundMock,
  reloadlyOutcomeEligibleForUnavailableMockFallback,
} from './providerFallbackPolicy.js';

/** Mock fallback when Reloadly is selected but unavailable — explicit env only (never NODE_ENV). */
function allowReloadlyUnavailableMockFallback() {
  return explicitReloadlyMockFallbackEnabled(env);
}

/** Controlled local proof: outbound is pinned off, so adapter must not leave orders stuck in PROCESSING. */
function allowMockWhenReloadlyOutboundBlocked() {
  return (
    allowReloadlyUnavailableMockFallback() || liveSimulationProofAllowsOutboundMock(process.env)
  );
}

function recordMockFallback(orderId, reason) {
  bumpCounter('fulfillment_provider_reloadly_mock_fallback_total');
  emitPhase1OperationalEvent('provider_mock_fallback', {
    orderIdSuffix: String(orderId ?? '').slice(-12),
    primaryProvider: 'reloadly',
    secondaryProvider: 'mock',
    fallbackReason: String(reason ?? '').slice(0, 120),
  });
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
      if (allowMockWhenReloadlyOutboundBlocked()) {
        recordMockFallback(order.id, 'fulfillment_outbound_disabled');
        return fulfillMockAirtime(order, {
          ...fulfillmentCtx,
          fallbackFrom: 'reloadly',
          fallbackReason: 'fulfillment_outbound_disabled',
        });
      }
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
    if (reloadlyOutcomeEligibleForUnavailableMockFallback(r.outcome)) {
      if (allowReloadlyUnavailableMockFallback()) {
        recordMockFallback(order.id, r.failureCode ?? 'reloadly_unavailable');
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
