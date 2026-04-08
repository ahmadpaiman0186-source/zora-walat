/**
 * Explicit stalled / ambiguous substates for Phase1 Reloadly fulfillment (auditable; not a full queue engine).
 * See `responseSummary` fields: `stalledVerificationHold`, `stalledSubstate`, `inquiryReason`.
 */
export const FULFILLMENT_STALLED_SUBSTATE = Object.freeze({
  /** Inquiry returned not_found or timed out under retry/force-inquiry context. */
  INQUIRY_INCONCLUSIVE: 'inquiry_inconclusive',
  /** Local classification: POST timed out; in-flight marker may remain. */
  POST_TIMEOUT_AMBIGUITY: 'post_timeout_ambiguity',
  /** Redis in-flight marker or DB attempt startedAt indicates possible ghost send. */
  IN_FLIGHT_UNKNOWN: 'in_flight_unknown',
  /** Circuit / provider soft-hard backoff; no POST attempted. */
  PROVIDER_DEGRADED_OR_RATE_LIMIT: 'provider_degraded_or_rate_limit',
});

/**
 * @param {string | null | undefined} inquiryReason from reloadlyTransactionInquiry
 * @param {{ redisInFlightMarker?: boolean, recentDbAttempt?: boolean }} hold from requestSummary.stalledVerificationHold
 * @returns {string} FULFILLMENT_STALLED_SUBSTATE value
 */
export function resolveStalledSubstate(inquiryReason, hold) {
  const inflight = hold?.redisInFlightMarker === true;
  const recent = hold?.recentDbAttempt === true;
  const reason = String(inquiryReason ?? '');
  if (reason === 'inquiry_timeout') {
    return FULFILLMENT_STALLED_SUBSTATE.INQUIRY_INCONCLUSIVE;
  }
  if (reason === 'not_found') {
    if (inflight) return FULFILLMENT_STALLED_SUBSTATE.IN_FLIGHT_UNKNOWN;
    if (recent) return FULFILLMENT_STALLED_SUBSTATE.IN_FLIGHT_UNKNOWN;
    return FULFILLMENT_STALLED_SUBSTATE.INQUIRY_INCONCLUSIVE;
  }
  return FULFILLMENT_STALLED_SUBSTATE.INQUIRY_INCONCLUSIVE;
}
