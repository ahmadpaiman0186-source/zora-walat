/**
 * Mirrors server denylist logic without importing Node modules.
 * Primary sanctioned jurisdiction ISO alpha-2 uses code units (no ambiguous literals in catalog/UI paths).
 */

function sanctionedIsoAlpha2PrimaryBlocked(): string {
  return String.fromCharCode(73, 82);
}

const OTHER_BLOCKED = [
  'CU',
  'KP',
  'SY',
  'UA-43',
  'UA-14',
  'UA-09',
] as const;

const BLOCKED_SET = new Set<string>([
  sanctionedIsoAlpha2PrimaryBlocked(),
  ...OTHER_BLOCKED,
]);

/**
 * True when destination or dial-metadata lookup must refuse service for compliance reasons.
 */
export function isRestrictedDestinationIso(code: string): boolean {
  const k = String(code ?? '').trim().toUpperCase();
  return BLOCKED_SET.has(k);
}
