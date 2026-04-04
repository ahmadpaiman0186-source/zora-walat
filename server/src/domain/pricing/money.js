/**
 * Integer USD cents only — avoid float drift.
 * @param {number} cents
 * @returns {number}
 */
export function centsToUsdNumber(cents) {
  return Math.round(cents) / 100;
}
