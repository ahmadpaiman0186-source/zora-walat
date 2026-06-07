/**
 * Maps route/handler-shaped shadow context → L-77 wired-path dry-run input.
 */
import { SHADOW_SAFETY_GATE_SCHEMA_VERSION } from './types.js';

/**
 * @param {import('./types.js').ShadowWebhookFulfillmentContext} ctx
 * @returns {import('../wiredPathSafetyDryRun/types.js').WiredPathDryRunInput}
 */
export function shadowContextToWiredPathInput(ctx) {
  const orderId = ctx.orderId ?? ctx.internalCheckoutId ?? 'ord_unknown';
  const eventId = ctx.stripeEventId ?? `evt_shadow_${ctx.scenarioId}`;
  const stripePaid =
    ctx.stripePaid === true ||
    ctx.sessionPaymentStatus === 'paid' ||
    ctx.paymentCheckoutStatus === 'PAID';
  const expired =
    ctx.sessionStatus === 'expired' ||
    ctx.paymentCheckoutStatus === 'EXPIRED' ||
    ctx.orderStatus === 'CANCELLED' ||
    ctx.orderStatus === 'EXPIRED';

  const boundary =
    ctx.boundary === 'fulfillment_dispatch'
      ? 'paid_to_provider_dispatch'
      : 'webhook_to_fulfillment';

  /** @type {import('../idempotencyKernel/attemptContext.js').AttemptContext} */
  let idempotencyAttempt;

  if (ctx.missingIdempotencyKey) {
    idempotencyAttempt = {
      attemptKind: 'checkout',
      keyMaterial: { scope: 'checkout', source: 'client', type: 'create_session' },
      entityIds: { orderId },
    };
  } else if (ctx.boundary === 'fulfillment_dispatch') {
    idempotencyAttempt = {
      attemptKind: 'provider_execution',
      keyMaterial: {
        scope: 'provider_attempt',
        source: 'internal',
        type: 'dispatch',
        orderId,
        attemptId: `att_${ctx.scenarioId}`,
      },
      entityIds: { orderId, attemptId: `att_${ctx.scenarioId}` },
      paymentState: { stripePaid, orderStatus: ctx.orderStatus ?? 'PROCESSING' },
      providerState: ctx.duplicateOrderRisk
        ? { priorOutcome: 'completed', lastAttemptStatus: 'SUCCESS' }
        : {
            proofPresent: ctx.providerProofPresent === true,
            providerReference: ctx.providerReference,
          },
      retryContext: ctx.duplicateOrderRisk ? { isRetry: true } : undefined,
    };
  } else {
    idempotencyAttempt = {
      attemptKind: 'webhook',
      keyMaterial: {
        scope: 'webhook',
        source: 'stripe',
        type: ctx.stripeEventType,
        eventId,
      },
      entityIds: { eventId, orderId },
      paymentState: {
        stripePaid: stripePaid && !expired,
        orderStatus: expired ? 'CANCELLED' : (ctx.orderStatus ?? 'PROCESSING'),
      },
      providerState: {
        proofPresent: ctx.providerProofPresent === true,
        providerReference: ctx.providerReference,
      },
    };
  }

  const registrySeeds = (ctx.priorWebhookEventIds ?? []).map((wid) => ({
    idempotencyKey: `v1|webhook|stripe|${ctx.stripeEventType}|${wid}|${orderId}`,
    outcome: 'completed',
    attemptKind: 'webhook',
    webhookEventId: wid,
    entityIds: { eventId: wid, orderId },
  }));

  for (const key of ctx.priorCompletedProviderAttemptKeys ?? []) {
    registrySeeds.push({
      idempotencyKey: key,
      outcome: 'completed',
      attemptKind: 'provider_execution',
      entityIds: { orderId },
    });
  }

  /** @type {import('../noPayNoServiceProof/types.js').NoPayNoServiceProofBundle} */
  const npnsBundle = {
    entityIds: { orderId, checkoutId: ctx.internalCheckoutId ?? orderId },
    payment: {
      stripePaid: stripePaid && !expired,
      webhookPaymentReceived: ctx.webhookPaymentReceived ?? (stripePaid && !expired),
      checkoutSessionPaid: stripePaid && !expired,
      orderStatus: expired ? 'CANCELLED' : (ctx.orderStatus ?? (stripePaid ? 'PROCESSING' : 'PENDING')),
      paymentFailed: expired,
    },
    provider: {
      hasSuccessProof: ctx.providerProofPresent === true,
      providerReference: ctx.providerReference,
      providerExecuted: ctx.providerProofPresent === true,
      lastAttemptStatus: ctx.providerProofPresent ? 'SUCCESS' : undefined,
    },
    order: {
      orderStatus: expired ? 'CANCELLED' : (ctx.orderStatus ?? 'PENDING'),
    },
    audit: stripePaid && !expired
      ? {
          requiredEvents: ['stripe_webhook_received'],
          presentEvents: ['stripe_webhook_received'],
        }
      : { requiredEvents: ['stripe_webhook_received'], presentEvents: [] },
    idempotency: ctx.duplicateOrderRisk
      ? { duplicateRisk: true, idempotencyConflict: true }
      : { duplicateRisk: false },
  };

  if (!stripePaid || expired) {
    npnsBundle.payment = {
      ...npnsBundle.payment,
      stripePaid: false,
      webhookPaymentReceived: false,
    };
  }

  if (ctx.missingIdempotencyKey === false && !ctx.providerReference && !ctx.providerProofPresent && stripePaid && !expired) {
    npnsBundle.provider = { providerExecuted: false, hasSuccessProof: false };
  }

  return {
    scenarioId: ctx.scenarioId,
    boundary,
    idempotencyAttempt,
    registrySeeds,
    npnsBundle,
  };
}

/**
 * @param {import('./types.js').ShadowWebhookFulfillmentContext} ctx
 */
export function buildShadowDiagnostics(ctx) {
  return {
    schemaVersion: SHADOW_SAFETY_GATE_SCHEMA_VERSION,
    scenarioId: ctx.scenarioId,
    stripeEventType: ctx.stripeEventType,
    boundary: ctx.boundary,
    internalCheckoutId: ctx.internalCheckoutId ?? null,
    orderId: ctx.orderId ?? null,
    paymentCheckoutStatus: ctx.paymentCheckoutStatus ?? null,
    sessionStatus: ctx.sessionStatus ?? null,
  };
}
