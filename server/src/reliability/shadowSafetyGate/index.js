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
export { SHADOW_SAFETY_GATE_SCHEMA_VERSION } from './types.js';
