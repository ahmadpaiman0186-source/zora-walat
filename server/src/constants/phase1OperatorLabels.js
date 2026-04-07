/**
 * Display names for Afghanistan mobile operators (Phase 1 MOBILE_TOPUP).
 * Keys match `operatorKey` on PaymentCheckout; unknown keys → null in canonical DTO.
 */
export const PHASE1_OPERATOR_LABELS = Object.freeze({
  roshan: 'Roshan',
  mtn: 'MTN',
  etisalat: 'Etisalat',
  afghanWireless: 'Afghan Wireless',
  afghan_wireless: 'Afghan Wireless',
});

/**
 * @param {string | null | undefined} operatorKey
 * @returns {string | null}
 */
export function resolvePhase1OperatorName(operatorKey) {
  if (operatorKey == null || String(operatorKey).trim() === '') return null;
  const k = String(operatorKey).trim();
  return PHASE1_OPERATOR_LABELS[k] ?? PHASE1_OPERATOR_LABELS[k.toLowerCase()] ?? null;
}
