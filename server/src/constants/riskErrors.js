/**
 * Machine-readable risk / abuse codes (HttpError.code and JSON `code`).
 * Distinct from {@link AUTH_ERROR_CODE} — used when risk engine or velocity policy denies.
 */
export const RISK_REASON_CODE = Object.freeze({
  RATE_LIMITED: 'risk_rate_limited',
  SUSPICIOUS_VELOCITY: 'risk_suspicious_velocity',
  DUPLICATE_PATTERN: 'risk_duplicate_pattern',
  OTP_ABUSE: 'risk_otp_abuse',
});
