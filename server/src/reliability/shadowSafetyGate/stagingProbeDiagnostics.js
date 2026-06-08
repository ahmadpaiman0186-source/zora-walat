/**
 * L-83A isolated staging probe diagnostics — fixed synthetic scenario only.
 * No Stripe, DB, provider, fulfillment, or webhook route coupling.
 */
import { evaluateShadowSafetyGate } from './evaluate.js';
import {
  buildSanitizedShadowDiagnosticsEnvelope,
  serializeSanitizedEnvelopeForLog,
} from './sanitizedDiagnosticsEnvelope.js';

export const STAGING_PROBE_ID = 'l83a_staging_probe_v1';

/** @type {import('./types.js').ShadowWebhookFulfillmentContext} */
export const STAGING_PROBE_FIXED_SCENARIO = Object.freeze({
  scenarioId: 'l83a_probe_fixed_scenario_v1',
  mode: 'shadow',
  boundary: 'staging_probe',
  stripeEventType: 'staging.probe.synthetic',
  stripeEventId: 'l83a_probe_evt_synthetic',
  internalCheckoutId: 'l83a_probe_checkout',
  orderId: 'l83a_probe_order',
  paymentCheckoutStatus: 'PAID',
  orderStatus: 'PROCESSING',
  sessionPaymentStatus: 'paid',
  sessionStatus: 'complete',
  stripePaid: true,
  webhookPaymentReceived: true,
  providerProofPresent: true,
  providerReference: 'L83A_PROBE_SYNTH',
  priorWebhookEventIds: [],
});

/**
 * @param {{ shadowSafetyGateStagingProbeEnabled?: boolean, zwApiDeploymentTier?: string }} [envConfig]
 */
export function readStagingProbeEnvConfig(envConfig) {
  if (envConfig) {
    return envConfig;
  }
  return {
    shadowSafetyGateStagingProbeEnabled:
      process.env.SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED === 'true',
    zwApiDeploymentTier: String(process.env.ZW_API_DEPLOYMENT_TIER ?? '')
      .trim()
      .toLowerCase(),
  };
}

/**
 * @param {{ shadowSafetyGateStagingProbeEnabled?: boolean, zwApiDeploymentTier?: string }} envConfig
 */
export function isStagingProbeRouteAllowed(envConfig) {
  const cfg = readStagingProbeEnvConfig(envConfig);
  return (
    cfg.shadowSafetyGateStagingProbeEnabled === true &&
    String(cfg.zwApiDeploymentTier ?? '').trim().toLowerCase() === 'staging'
  );
}

/**
 * Emit one sanitized diagnostic log line when staging probe gates allow.
 *
 * @param {{
 *   log?: { info?: Function },
 *   envConfig: {
 *     shadowSafetyGateStagingProbeEnabled?: boolean,
 *     zwApiDeploymentTier?: string,
 *   },
 *   evaluatedAt?: string,
 * }} params
 */
export function emitStagingProbeShadowDiagnostic(params) {
  const envConfig = readStagingProbeEnvConfig(params.envConfig);
  if (!isStagingProbeRouteAllowed(envConfig)) {
    return { ok: false, emitted: false, reason: 'gates_closed' };
  }

  const report = evaluateShadowSafetyGate(STAGING_PROBE_FIXED_SCENARIO);
  if (!report) {
    return { ok: false, emitted: false, reason: 'evaluation_null' };
  }

  const envelope = buildSanitizedShadowDiagnosticsEnvelope({
    report,
    shadowModeEnabled: true,
    component: 'shadow_safety_gate_staging_probe',
    correlationMaterial: {
      orderId: STAGING_PROBE_FIXED_SCENARIO.orderId,
      eventType: STAGING_PROBE_FIXED_SCENARIO.stripeEventType,
      eventId: STAGING_PROBE_FIXED_SCENARIO.stripeEventId,
    },
    evaluatedAt: params.evaluatedAt,
  });

  const serialized = serializeSanitizedEnvelopeForLog(envelope);

  if (typeof params.log?.info === 'function') {
    params.log.info(
      {
        event: 'shadow_safety_gate_webhook_diagnostic',
        envelope: serialized,
      },
      'shadow safety gate diagnostic (staging probe; diagnostics only)',
    );
  }

  return {
    ok: true,
    emitted: true,
    probeId: STAGING_PROBE_ID,
    correlationFingerprint: envelope.correlationFingerprint,
  };
}
