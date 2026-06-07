/**
 * L-78 webhook/fulfillment boundary hook — **shadow mode only**.
 *
 * Production routes call `peekShadowSafetyGateAtBoundary` with no shadow flag;
 * function returns null and has zero runtime effect.
 *
 * Future live wiring must use explicit approval + feature flag.
 */
import { evaluateShadowSafetyGate } from './evaluate.js';

/**
 * @param {import('./types.js').ShadowWebhookFulfillmentContext & { invokeShadow?: boolean }} input
 * @returns {import('./types.js').ShadowSafetyGateReport | null}
 */
export function peekShadowSafetyGateAtBoundary(input) {
  if (!input?.invokeShadow && input?.mode !== 'shadow') {
    return null;
  }
  if (input.mode !== 'shadow') {
    return null;
  }
  return evaluateShadowSafetyGate(input);
}

/**
 * Documents the webhook post-commit boundary anchor (read-only reference).
 */
export const WEBHOOK_FULFILLMENT_BOUNDARY_ANCHOR = Object.freeze({
  module: 'server/src/routes/stripeWebhook.routes.js',
  anchor: 'scheduleFulfillmentProcessing',
  shadowWiredInL78: false,
  shadowWiredInL79: true,
  sanitizedEnvelopeInL80: true,
  featureFlag: 'SHADOW_SAFETY_GATE_WEBHOOK_DIAGNOSTICS_ENABLED',
  defaultEnabled: false,
});
