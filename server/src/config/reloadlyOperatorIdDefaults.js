/**
 * Reloadly operator id mapping — server-only (never exposed to clients).
 *
 * Internal catalog keys (e.g. roshan, mtn, etisalat, afghanWireless) must map to
 * Reloadly numeric operator ids. Add real ids from the Reloadly dashboard here,
 * or set `RELOADLY_OPERATOR_MAP_JSON` in the environment (env overrides a key when non-empty).
 *
 * @type {Readonly<Record<string, string>>}
 */
export const RELOADLY_OPERATOR_ID_DEFAULTS = Object.freeze({
  // Populate with sandbox/production ids from Reloadly as needed, e.g.:
  // roshan: '12345',
  // mtn: '67890',
  // etisalat: '11111',
  // afghanwireless: '22222',
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
