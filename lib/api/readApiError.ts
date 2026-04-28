/**
 * Normalized parsing of JSON API error bodies from this repo's Node API
 * (`clientErrorBody`: `success`, `message`, `code`, legacy `error`).
 */

export type ParsedApiError = {
  success: false;
  message: string;
  code?: string;
};

export function parseApiErrorBody(
  data: unknown,
  fallbackMessage: string,
): ParsedApiError {
  if (typeof data !== 'object' || data === null) {
    return { success: false, message: fallbackMessage };
  }
  const o = data as Record<string, unknown>;
  const message =
    typeof o.message === 'string' && o.message.length > 0
      ? o.message
      : typeof o.error === 'string' && o.error.length > 0
        ? o.error
        : fallbackMessage;
  const code =
    typeof o.code === 'string' && o.code.length > 0 ? o.code : undefined;
  return { success: false, message, code };
}
