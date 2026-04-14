/**
 * Normalized API error body for public/JSON routes.
 * Legacy clients may still read `error`; prefer `message` + `code`.
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
