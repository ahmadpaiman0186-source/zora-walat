import { getTraceId } from './requestContext.js';

/**
 * Single-line JSON events for log pipelines / metrics agents (no PII).
 * Stable keys: `phase1Ops`, `event`, `t`, optional `traceId`, `orderIdSuffix`.
 * Prefer this over ad-hoc console.log for Phase 1 ops dashboards.
 * `traceId` is filled from AsyncLocalStorage when the caller omits it (HTTP + traced workers).
 *
 * @param {string} event
 * @param {Record<string, unknown>} [fields]
 */
export function emitPhase1OperationalEvent(event, fields = {}) {
  const { traceId: explicitTrace, ...rest } = fields;
  const traceId = explicitTrace ?? getTraceId();
  const line = {
    phase1Ops: true,
    event,
    t: new Date().toISOString(),
    ...rest,
  };
  if (traceId) {
    line.traceId = traceId;
  }
  console.log(JSON.stringify(line));
}
