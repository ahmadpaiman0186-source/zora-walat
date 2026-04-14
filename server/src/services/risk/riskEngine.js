import { RISK_REASON_CODE } from '../../constants/riskErrors.js';

/** @typedef {'allow' | 'deny' | 'review'} RiskDecision */

/**
 * Pure risk evaluation from structured flags (no I/O). Callers gather counts / signals first.
 *
 * @param {{
 *   kind: 'otp_request' | 'otp_verify' | 'payment_intent' | 'webtopup_create' | 'recharge_order';
 *   flags: {
 *     rateLimitExceeded?: boolean;
 *     otpEmailVelocityExceeded?: boolean;
 *     otpIpVelocityExceeded?: boolean;
 *     otpVerifyFailuresBurst?: boolean;
 *     paymentIntentAmountBurst?: boolean;
 *     paymentIntentIpBurst?: boolean;
 *     webtopupSessionBurst?: boolean;
 *     webtopupPhoneBurst?: boolean;
 *     webtopupSameAmountBurst?: boolean;
 *     rechargeUserBurst?: boolean;
 *     rechargeDuplicateFingerprint?: boolean;
 *   };
 * }} context
 * @returns {{ decision: RiskDecision, reasonCode: string | null, metadata: Record<string, unknown> }}
 */
export function evaluateRisk(context) {
  const { kind, flags } = context;
  const meta = { kind };

  if (flags.rateLimitExceeded) {
    return {
      decision: 'deny',
      reasonCode: RISK_REASON_CODE.RATE_LIMITED,
      metadata: { ...meta, source: 'rate_limiter' },
    };
  }

  if (kind === 'otp_request' || kind === 'otp_verify') {
    if (
      flags.otpEmailVelocityExceeded ||
      flags.otpIpVelocityExceeded ||
      flags.otpVerifyFailuresBurst
    ) {
      return {
        decision: 'deny',
        reasonCode: RISK_REASON_CODE.OTP_ABUSE,
        metadata: {
          ...meta,
          otpEmailVelocityExceeded: Boolean(flags.otpEmailVelocityExceeded),
          otpIpVelocityExceeded: Boolean(flags.otpIpVelocityExceeded),
          otpVerifyFailuresBurst: Boolean(flags.otpVerifyFailuresBurst),
        },
      };
    }
  }

  if (kind === 'payment_intent') {
    if (flags.paymentIntentAmountBurst || flags.duplicateFingerprint) {
      return {
        decision: 'deny',
        reasonCode: RISK_REASON_CODE.DUPLICATE_PATTERN,
        metadata: {
          ...meta,
          paymentIntentAmountBurst: Boolean(flags.paymentIntentAmountBurst),
          duplicateFingerprint: Boolean(flags.duplicateFingerprint),
        },
      };
    }
    if (flags.paymentIntentIpBurst) {
      return {
        decision: 'deny',
        reasonCode: RISK_REASON_CODE.SUSPICIOUS_VELOCITY,
        metadata: { ...meta },
      };
    }
  }

  if (kind === 'webtopup_create') {
    if (
      flags.webtopupSameAmountBurst ||
      flags.duplicateFingerprint
    ) {
      return {
        decision: 'deny',
        reasonCode: RISK_REASON_CODE.DUPLICATE_PATTERN,
        metadata: {
          ...meta,
          webtopupSameAmountBurst: Boolean(flags.webtopupSameAmountBurst),
        },
      };
    }
    if (flags.webtopupSessionBurst || flags.webtopupPhoneBurst) {
      return {
        decision: 'deny',
        reasonCode: RISK_REASON_CODE.SUSPICIOUS_VELOCITY,
        metadata: {
          ...meta,
          webtopupSessionBurst: Boolean(flags.webtopupSessionBurst),
          webtopupPhoneBurst: Boolean(flags.webtopupPhoneBurst),
        },
      };
    }
  }

  if (kind === 'recharge_order') {
    if (flags.rechargeDuplicateFingerprint) {
      return {
        decision: 'deny',
        reasonCode: RISK_REASON_CODE.DUPLICATE_PATTERN,
        metadata: { ...meta },
      };
    }
    if (flags.rechargeUserBurst) {
      return {
        decision: 'deny',
        reasonCode: RISK_REASON_CODE.SUSPICIOUS_VELOCITY,
        metadata: { ...meta },
      };
    }
  }

  return {
    decision: 'allow',
    reasonCode: null,
    metadata: meta,
  };
}
