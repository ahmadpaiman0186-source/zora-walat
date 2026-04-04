/**
 * Maps internal catalog `operatorKey` values to Reloadly numeric operator ids.
 * Reloadly expects `operatorId` as a numeric string (e.g. "535"); catalog keys like
 * `roshan` must never be sent as-is.
 */

/**
 * @param {string} operatorKey — internal key from checkout (e.g. roshan)
 * @param {Record<string, string>} map — merged `env.reloadlyOperatorMap` (defaults + RELOADLY_OPERATOR_MAP_JSON)
 * @returns {{ ok: true, operatorId: string } | { ok: false, code: string, message: string }}
 */
export function resolveReloadlyOperatorId(operatorKey, map) {
  const raw = operatorKey != null ? String(operatorKey).trim() : '';
  if (!raw) {
    return {
      ok: false,
      code: 'reloadly_operator_key_missing',
      message: 'Missing operatorKey for Reloadly top-up',
    };
  }

  const key = raw.toLowerCase();
  const mapped = map[key];

  if (mapped == null || String(mapped).trim() === '') {
    return {
      ok: false,
      code: 'reloadly_operator_unmapped',
      message: `No Reloadly operator id configured for operatorKey "${key}"`,
    };
  }

  const operatorId = String(mapped).trim();
  if (!/^\d+$/.test(operatorId)) {
    return {
      ok: false,
      code: 'reloadly_operator_id_invalid',
      message: 'Reloadly operator id in mapping must be a numeric string',
    };
  }

  return { ok: true, operatorId };
}
