/** Machine-readable codes returned in JSON `{ code }` for `/api/auth/*` errors. */
export const AUTH_ERROR_CODE = Object.freeze({
  AUTH_EMAIL_EXISTS: 'auth_email_exists',
  /** Wrong password / unknown user — generic on purpose. */
  AUTH_INVALID_CREDENTIALS: 'auth_invalid_credentials',
  AUTH_OTP_EXPIRED: 'auth_otp_expired',
  AUTH_OTP_INVALID: 'auth_otp_invalid',
  /** No pending challenge for this email (or invalid identity). */
  AUTH_OTP_NOT_FOUND: 'auth_otp_not_found',
  /** Challenge already consumed; do not replay. */
  AUTH_OTP_REPLAY: 'auth_otp_replay',
  AUTH_OTP_LOCKED: 'auth_otp_locked',
  AUTH_REFRESH_INVALID: 'auth_refresh_invalid',
  AUTH_INVALID_REQUEST: 'auth_invalid_request',
  AUTH_RATE_LIMITED: 'auth_rate_limited',
  AUTH_REQUIRED: 'auth_required',
  /** Sensitive routes when `emailVerifiedAt` is null. */
  AUTH_VERIFICATION_REQUIRED: 'auth_verification_required',
  VALIDATION_ERROR: 'validation_error',
});
