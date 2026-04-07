import { ORDER_STATUS } from '../constants/orderStatus.js';
import { RECONCILIATION_STATUS } from '../constants/reconciliationStatus.js';
import { computeRefinedProfitAndMarginBp } from '../services/financialTruthService.js';

/**
 * USD margin surface derived from persisted cents / BP only (no silent coercion to 0 where unknown).
 *
 * @param {import('@prisma/client').PaymentCheckout | Record<string, unknown>} checkout
 * @returns {{
 *   expectedMarginUsd: number | null,
 *   actualMarginUsd: number | null,
 *   marginDeltaUsd: number | null,
 * }}
 */
export function computePhase1MarginUsdSurface(checkout) {
  const finalCents = Math.max(0, Math.floor(Number(checkout.amountUsdCents) || 0));
  const projectedBp = checkout.projectedNetMarginBp;
  let expectedMarginUsd = null;
  if (
    projectedBp != null &&
    Number.isFinite(Number(projectedBp)) &&
    finalCents > 0
  ) {
    const expectedProfitCents = Math.round((Number(projectedBp) * finalCents) / 10000);
    expectedMarginUsd = expectedProfitCents / 100;
  }

  /** Actual fee required for financial-grade margin (no estimate labeled as “actual”). */
  const stripeFeeTruthKnown = checkout.stripeFeeActualUsdCents != null;

  let actualMarginUsd = null;
  let marginDeltaUsd = null;
  if (stripeFeeTruthKnown && finalCents > 0) {
    const { profitCents } = computeRefinedProfitAndMarginBp(
      /** @type {import('@prisma/client').PaymentCheckout} */ (checkout),
    );
    actualMarginUsd = profitCents / 100;
    if (expectedMarginUsd != null) {
      marginDeltaUsd = Math.round((actualMarginUsd - expectedMarginUsd) * 100) / 100;
    }
  }

  return {
    expectedMarginUsd,
    actualMarginUsd,
    marginDeltaUsd,
  };
}

/**
 * @param {import('@prisma/client').PaymentCheckout | Record<string, unknown>} checkout
 * @param {string[]} financialAnomalyCodes
 * @returns {string} RECONCILIATION_STATUS
 */
export function deriveReconciliationStatus(checkout, financialAnomalyCodes) {
  const codes = Array.isArray(financialAnomalyCodes)
    ? financialAnomalyCodes.filter((x) => typeof x === 'string')
    : [];
  if (codes.length > 0) {
    return RECONCILIATION_STATUS.MISMATCH;
  }

  const os = checkout.orderStatus;
  const delivered =
    os === ORDER_STATUS.FULFILLED ||
    os === ORDER_STATUS.DELIVERED;

  if (!delivered) {
    return RECONCILIATION_STATUS.UNKNOWN;
  }

  if (checkout.stripeFeeActualUsdCents == null) {
    return RECONCILIATION_STATUS.UNKNOWN;
  }

  return RECONCILIATION_STATUS.MATCH;
}
