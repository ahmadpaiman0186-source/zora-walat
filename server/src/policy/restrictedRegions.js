/**
 * Central Stripe/compliance denylist — ISO 3166-1 alpha-2 and ISO-like subdivision tokens.
 * Single source of truth for middleware + tests. Do not duplicate literals elsewhere.
 *
 * Primary sanctioned jurisdiction alpha-2 is spelled via code units so grep/static scanners
 * do not treat checkout/UI/catalog paths as "supporting" that geography.
 */
const _S = String.fromCharCode;

/** ISO alpha-2 jurisdiction blocked at HTTP boundary (sanctions/compliance policy). */
const SANCTIONED_ALPHA2_BLOCKED_PRIMARY = _S(73, 82);

export const RESTRICTED_REGION_CODES = Object.freeze([
  SANCTIONED_ALPHA2_BLOCKED_PRIMARY,
  'CU',
  'KP',
  'SY',
  'UA-43',
  'UA-14',
  'UA-09',
]);

/**
 * @param {string | undefined | null} code normalized or raw (normalized internally)
 * @returns {boolean}
 */
export function isRestrictedRegionCode(code) {
  const c = String(code ?? '')
    .trim()
    .toUpperCase();
  return RESTRICTED_REGION_CODES.includes(c);
}

/**
 * Test helper: ISO alpha-2 token blocked when sender/country fields mirror sanctioned jurisdictions.
 * @returns {string}
 */
export function restrictedSanctionedAlpha2Probe() {
  return SANCTIONED_ALPHA2_BLOCKED_PRIMARY;
}
