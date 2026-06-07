/**
 * L-78 code-only shadow safety gate — diagnostics only, no fulfillment dispatch.
 */
import { runWiredPathSafetyDryRun } from '../wiredPathSafetyDryRun/index.js';
import { shadowContextToWiredPathInput, buildShadowDiagnostics } from './adapter.js';
import { SHADOW_SAFETY_GATE_SCHEMA_VERSION } from './types.js';

const NO_MUTATIONS = Object.freeze({
  stripe: false,
  provider: false,
  payment: false,
  webhook: false,
  db: false,
  fulfillmentScheduled: false,
});

/**
 * Evaluate shadow safety gate. Returns **null** unless `context.mode === 'shadow'`.
 * Live routes must not pass shadow mode — production behavior unchanged.
 *
 * @param {import('./types.js').ShadowWebhookFulfillmentContext} context
 * @returns {import('./types.js').ShadowSafetyGateReport | null}
 */
export function evaluateShadowSafetyGate(context) {
  if (!context || context.mode !== 'shadow') {
    return null;
  }

  const wiredInput = shadowContextToWiredPathInput(context);
  const wiredPathReport = runWiredPathSafetyDryRun(wiredInput);

  const fulfillmentIntentAllowed = wiredPathReport.fulfillmentIntentAllowed;

  return {
    schemaVersion: SHADOW_SAFETY_GATE_SCHEMA_VERSION,
    scenarioId: context.scenarioId,
    mode: 'code_only_shadow_safety_gate',
    boundary: context.boundary,
    shadowIntegration: true,
    liveRouteEnforcement: false,
    fulfillmentIntentAllowed,
    wouldScheduleFulfillment: false,
    wiredPathReport,
    diagnostics: buildShadowDiagnostics(context),
    mutations: { ...NO_MUTATIONS },
    safety: {
      ...wiredPathReport.safety,
      shadow_only: true,
      live_route_unchanged: true,
    },
  };
}

/**
 * @param {import('./types.js').ShadowWebhookFulfillmentContext[]} contexts
 */
export function evaluateShadowSafetyGateBatch(contexts) {
  return contexts.map((c) => evaluateShadowSafetyGate(c));
}
