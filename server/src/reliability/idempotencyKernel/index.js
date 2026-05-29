/**
 * CORE-05 duplicate transaction + idempotency control kernel (classify-only, no mutations).
 * Not wired into live payment/provider/webhook paths — export for future integration.
 */

export { STALE_PENDING_DEFAULT_MS } from './attemptContext.js';
export {
  classifyIdempotencyAttempt,
  classifyIdempotencyBatch,
} from './classify.js';
export {
  buildCanonicalKey,
  buildProviderAttemptKey,
  normalizeKeyPart,
  validateKeyMaterial,
} from './keyModel.js';
export {
  createIdempotencyRegistry,
  lookupByKey,
  lookupProviderRef,
  lookupWebhookEvent,
  registerIdempotencyOutcome,
  seedIdempotencyRegistry,
} from './registry.js';
export {
  buildKernelReport,
  createDecision,
  DECISION,
  KERNEL_SCHEMA_VERSION,
} from './types.js';
