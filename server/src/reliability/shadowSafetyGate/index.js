/**
 * L-78 code-only shadow safety gate — local diagnostics at webhook/fulfillment boundary shape.
 * Not live route enforcement. Not production proof.
 */
export {
  evaluateShadowSafetyGate,
  evaluateShadowSafetyGateBatch,
} from './evaluate.js';
export { shadowContextToWiredPathInput, buildShadowDiagnostics } from './adapter.js';
export {
  peekShadowSafetyGateAtBoundary,
  WEBHOOK_FULFILLMENT_BOUNDARY_ANCHOR,
} from './boundaryHook.js';
export {
  isShadowSafetyGateWebhookDiagnosticsEnabled,
  buildWebhookShadowContextFromRouteSnapshot,
  maybeEmitShadowSafetyDiagnosticsAtWebhookBoundary,
} from './webhookBoundaryHook.js';
export {
  SANITIZED_SHADOW_DIAGNOSTICS_ENVELOPE_VERSION,
  buildSanitizedShadowDiagnosticsEnvelope,
  fingerprintCorrelation,
  redactSensitiveString,
  serializeSanitizedEnvelopeForLog,
} from './sanitizedDiagnosticsEnvelope.js';
export {
  STAGING_PROBE_FIXED_SCENARIO,
  STAGING_PROBE_ID,
  emitStagingProbeShadowDiagnostic,
  isStagingProbeRouteAllowed,
  readStagingProbeEnvConfig,
} from './stagingProbeDiagnostics.js';
export { SHADOW_SAFETY_GATE_SCHEMA_VERSION } from './types.js';
