/**
 * Normalized API error body for public/JSON routes.
 *
 * Contract (Layer 1):
 * - `message` — user-safe, stable wording (no stack traces in production).
 * - `code` — machine-stable string (`API_CONTRACT_CODE`, `WEBTOPUP_CLIENT_ERROR_CODE`, etc.).
 * - `error` — deprecated duplicate of `message` for legacy clients.
 * - `details` — optional; only on selected paths (e.g. Zod in non-production).
 *
 * @param {string} message
 * @param {string} code
 * @param {Record<string, unknown>} [extra]
 */
export function clientErrorBody(message, code, extra = {}) {
  return {
    success: false,
    message,
    /** @deprecated use `message` */
    error: message,
    code,
    ...extra,
  };
}

/**
 * @param {Record<string, unknown>} data — must not include `success: false`
 */
export function clientSuccessBody(data = {}) {
  return {
    success: true,
    ...data,
  };
}
