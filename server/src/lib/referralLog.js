import { getTraceId } from './requestContext.js';
import { safeSuffix } from './webTopupObservability.js';

/**
 * Structured referral audit log (no PII, no raw codes).
 * @param {'referral_created' | 'referral_completed' | 'referral_rewarded' | 'referral_rejected' | 'referral_fraud_detected' | 'referral_integrity_mismatch'} event
 * @param {object} p
 * @param {string | null} [p.traceId]
 * @param {string | null} [p.referralId]
 * @param {string | null} [p.inviterUserId]
 * @param {string | null} [p.invitedUserId]
 * @param {Record<string, unknown>} [p.extra]
 */
export function logReferralEvent(event, p) {
  const line = {
    referralLog: true,
    event,
    traceId: p.traceId ?? getTraceId() ?? null,
    referralIdSuffix: p.referralId ? safeSuffix(p.referralId, 10) : null,
    inviterUserIdSuffix: p.inviterUserId ? safeSuffix(p.inviterUserId, 8) : null,
    invitedUserIdSuffix: p.invitedUserId ? safeSuffix(p.invitedUserId, 8) : null,
    t: new Date().toISOString(),
    ...(p.extra && Object.keys(p.extra).length ? { extra: p.extra } : {}),
  };
  if (
    event === 'referral_rejected' ||
    event === 'referral_fraud_detected' ||
    event === 'referral_integrity_mismatch'
  ) {
    console.warn(JSON.stringify(line));
  } else {
    console.log(JSON.stringify(line));
  }
}
