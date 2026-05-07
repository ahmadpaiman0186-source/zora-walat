/**
 * Reloadly operator id mapping — server-only (never exposed to clients).
 *
 * **Sandbox / dry-run placeholders (911001–911005):** numeric strings for local
 * `npm run proof:reloadly-dry-run` and staging config validation only. They are **not**
 * verified against Reloadly’s live catalog — override each key in `RELOADLY_OPERATOR_MAP_JSON`
 * with the numeric **sandbox** operator id from your Reloadly dashboard (Topups → Afghanistan)
 * before expecting a successful sandbox `POST /topups`.
 *
 * Internal keys are lowercase (matches `resolveReloadlyOperatorId` and JSON parse normalization).
 * Catalog uses `afghanwireless` (not camelCase) for Afghan Wireless.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const RELOADLY_OPERATOR_ID_DEFAULTS = Object.freeze({
  mtn: '911001',
  roshan: '911002',
  afghanwireless: '911003',
  etisalat: '911004',
  salaam: '911005',
});

/**
 * @param {Record<string, string>} base — typically `RELOADLY_OPERATOR_ID_DEFAULTS`
 * @param {Record<string, string>} override — from `RELOADLY_OPERATOR_MAP_JSON` (keys normalized)
 * @returns {Record<string, string>}
 */
export function mergeReloadlyOperatorMaps(base, override) {
  const out = { ...base };
  for (const [k, v] of Object.entries(override)) {
    const key = String(k).trim().toLowerCase();
    if (!key) continue;
    const trimmed = String(v).trim();
    if (trimmed === '') continue;
    out[key] = trimmed;
  }
  return out;
}
