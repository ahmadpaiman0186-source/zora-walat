/**
 * Afghanistan Phase-1 catalog operator keys (lowercase — matches `resolveReloadlyOperatorId` lookup).
 * `RELOADLY_OPERATOR_MAP_JSON` keys are normalized to lowercase at parse time; checkout uses lowercase keys.
 */
import { resolveReloadlyOperatorId } from '../domain/fulfillment/reloadlyOperatorMapping.js';

export const RELOADLY_AF_PHASE1_OPERATOR_KEYS = Object.freeze([
  'mtn',
  'roshan',
  'afghanwireless',
  'etisalat',
  'salaam',
]);

/**
 * @param {Record<string, string>} map — merged `env.reloadlyOperatorMap`
 * @returns {{ ok: true, missing: string[], invalid: string[] } | { ok: false, missing: string[], invalid: string[] }}
 */
export function validateAfghanistanReloadlyOperatorMapCoverage(map) {
  const m = map && typeof map === 'object' ? map : {};
  /** @type {string[]} */
  const missing = [];
  /** @type {string[]} */
  const invalid = [];
  for (const key of RELOADLY_AF_PHASE1_OPERATOR_KEYS) {
    const r = resolveReloadlyOperatorId(key, m);
    if (!r.ok) {
      if (r.code === 'reloadly_operator_id_invalid') invalid.push(key);
      else missing.push(key);
    }
  }
  if (missing.length || invalid.length) {
    return { ok: false, missing, invalid };
  }
  return { ok: true, missing, invalid };
}

/**
 * When `RELOADLY_OPERATOR_MAP_JSON` is non-empty, require valid JSON object (not array).
 * Empty / whitespace-only string → skipped (defaults-only map is OK).
 *
 * @param {string | undefined} raw — typically `process.env.RELOADLY_OPERATOR_MAP_JSON`
 * @returns {{ ok: true, skipped?: boolean, reason?: string }}
 */
export function parseReloadlyOperatorMapJsonStrict(raw) {
  const s = String(raw ?? '').trim();
  if (!s) {
    return { ok: true, skipped: true };
  }
  try {
    const obj = JSON.parse(s);
    if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) {
      return {
        ok: false,
        skipped: false,
        reason: 'RELOADLY_OPERATOR_MAP_JSON_must_be_a_JSON_object_not_array_or_primitive',
      };
    }
    return { ok: true, skipped: false };
  } catch {
    return {
      ok: false,
      skipped: false,
      reason: 'RELOADLY_OPERATOR_MAP_JSON_invalid_json',
    };
  }
}
