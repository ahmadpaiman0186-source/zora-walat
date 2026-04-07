import { emitPhase1OperationalEvent } from './phase1OperationalEvents.js';

/**
 * One structured stream for safe duplicate suppression (webhook replay, claim races, etc.).
 *
 * @param {string} reasonCode stable SCREAMING_SNAKE identifier
 * @param {Record<string, unknown>} [fields] no PII; prefer suffixes
 */
export function emitFortressIdempotencyNoop(reasonCode, fields = {}) {
  emitPhase1OperationalEvent('fortress_idempotency_noop', {
    fortressReasonCode: reasonCode,
    ...fields,
  });
}
