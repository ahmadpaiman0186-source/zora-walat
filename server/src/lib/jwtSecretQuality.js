/**
 * Heuristic JWT secret hygiene (startup warnings only — length enforced elsewhere).
 * @param {string | undefined} s
 * @returns {boolean} true if the secret looks guessable / placeholder-like
 */
export function jwtSecretLooksTrivial(s) {
  const x = String(s ?? '');
  if (x.length < 32) return true;
  if (/^(.)\1{31,}$/.test(x)) return true;
  const lower = x.toLowerCase();
  if (
    lower.includes('changeme') ||
    lower.includes('your_secret') ||
    lower.includes('example') ||
    lower.includes('placeholder')
  ) {
    return true;
  }
  return false;
}
