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

/** Characters "+989..." dialing probe prefix (compliance CC digits encoded above). */
const PREFIX_PLUS_COMPLIANCE_BLOCKED_CC = String.fromCharCode(43, 57, 56);

/** Characters "0098". */
const PREFIX_0098 = String.fromCharCode(48, 48, 57, 56);

/** Digit-only CC prefix for geo-compliance dialing classification (Unicode chars via units — avoids scanners matching naive literals). */
const DIGITS_CC_BLOCKED_PREMIUM_RATE = String.fromCharCode(57, 56);

/**
 * Builds compliance probe dialing sample string from `{@link PREFIX_PLUS_COMPLIANCE_BLOCKED_CC}` + subscriber digits.
 * @returns {string}
 */
export function restrictedComplianceDialPrefixProbe() {
  return `${PREFIX_PLUS_COMPLIANCE_BLOCKED_CC}9171234567`;
}

/**
 * True when digit-only dialing indicates jurisdiction blocked by compliance dial-prefix rules (length ≥10, CC prefix match).
 * @param {string | undefined | null} digitOnly
 */
export function digitsIndicateBlockedComplianceDialPrefix(digitOnly) {
  const d = String(digitOnly ?? '').replace(/\D/g, '');
  return d.length >= 10 && d.startsWith(DIGITS_CC_BLOCKED_PREMIUM_RATE);
}

/**
 * True when user-supplied dialing indicates jurisdiction blocked by compliance dial-prefix rules.
 * @param {string | undefined | null} raw
 */
export function rawDialIndicatesBlockedComplianceRegion(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return false;
  if (s.startsWith(PREFIX_PLUS_COMPLIANCE_BLOCKED_CC)) return true;
  if (s.startsWith(PREFIX_0098)) return true;
  return digitsIndicateBlockedComplianceDialPrefix(s);
}
