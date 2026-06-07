/**
 * L-79 feature-flagged webhook boundary shadow diagnostics (disabled by default).
 * Diagnostics only — never blocks, dispatches, or mutates money path.
 */
import { env } from '../../config/env.js';
import { evaluateShadowSafetyGate } from './evaluate.js';

/**
 * @param {{ shadowSafetyGateWebhookDiagnosticsEnabled?: boolean }} [envConfig]
 */
export function isShadowSafetyGateWebhookDiagnosticsEnabled(envConfig = env) {
  return envConfig.shadowSafetyGateWebhookDiagnosticsEnabled === true;
}

/**
 * Pure snapshot → shadow context (testable without route/DB).
 * @param {{
 *   eventType: string,
 *   eventId?: string,
 *   orderId: string,
 *   session?: { payment_status?: string, status?: string },
 *   providerProofPresent?: boolean,
 *   providerReference?: string,
 *   priorWebhookEventIds?: string[],
 * }} snapshot
 * @returns {import('./types.js').ShadowWebhookFulfillmentContext}
 */
export function buildWebhookShadowContextFromRouteSnapshot(snapshot) {
  const paymentStatus =
    typeof snapshot.session?.payment_status === 'string'
      ? snapshot.session.payment_status
      : undefined;
  const sessionStatus =
    typeof snapshot.session?.status === 'string' ? snapshot.session.status : undefined;
  const stripePaid =
    snapshot.session?.payment_status === 'paid' || snapshot.session?.payment_status === 'no_payment_required';
  const expired = sessionStatus === 'expired';

  return {
    scenarioId: `webhook_boundary_${snapshot.orderId}`,
    mode: 'shadow',
    boundary: 'webhook_post_commit',
    stripeEventType: snapshot.eventType,
    stripeEventId: snapshot.eventId,
    internalCheckoutId: snapshot.orderId,
    orderId: snapshot.orderId,
    paymentCheckoutStatus: expired ? 'EXPIRED' : stripePaid ? 'PAID' : 'PENDING',
    orderStatus: expired ? 'CANCELLED' : stripePaid ? 'PROCESSING' : 'PENDING',
    sessionPaymentStatus: paymentStatus,
    sessionStatus,
    stripePaid: stripePaid && !expired,
    webhookPaymentReceived: stripePaid && !expired,
    providerProofPresent: snapshot.providerProofPresent === true,
    providerReference: snapshot.providerReference,
    priorWebhookEventIds: snapshot.priorWebhookEventIds,
  };
}

/**
 * Emit shadow diagnostics when feature flag enabled. No-op when disabled.
 * Never blocks `scheduleFulfillmentProcessing`.
 *
 * @param {{
 *   event: { type: string, id?: string, data?: { object?: unknown } },
 *   orderId: string,
 *   session?: object,
 *   log?: { info?: Function },
 *   priorWebhookEventIds?: string[],
 *   envConfig?: { shadowSafetyGateWebhookDiagnosticsEnabled?: boolean },
 * }} params
 * @returns {import('./types.js').ShadowSafetyGateReport | null}
 */
export function maybeEmitShadowSafetyDiagnosticsAtWebhookBoundary(params) {
  const envConfig = params.envConfig ?? env;
  if (!isShadowSafetyGateWebhookDiagnosticsEnabled(envConfig)) {
    return null;
  }

  const session =
    params.session ??
    (params.event?.data?.object && typeof params.event.data.object === 'object'
      ? params.event.data.object
      : undefined);

  const context = buildWebhookShadowContextFromRouteSnapshot({
    eventType: params.event.type,
    eventId: params.event.id,
    orderId: params.orderId,
    session:
      session && typeof session === 'object'
        ? {
            payment_status: session.payment_status,
            status: session.status,
          }
        : undefined,
    priorWebhookEventIds: params.priorWebhookEventIds,
  });

  const report = evaluateShadowSafetyGate(context);
  if (report && typeof params.log?.info === 'function') {
    params.log.info(
      {
        event: 'shadow_safety_gate_webhook_diagnostic',
        fulfillmentIntentAllowed: report.fulfillmentIntentAllowed,
        wouldScheduleFulfillment: report.wouldScheduleFulfillment,
        idempotencyDecision: report.wiredPathReport.idempotencyDecision.decision,
        deliveryDecision: report.wiredPathReport.deliveryDecision.decision,
        orderIdSuffix: String(params.orderId).slice(-8),
      },
      'shadow safety gate diagnostic (diagnostics only)',
    );
  }
  return report;
}
