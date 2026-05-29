import { createFinding } from '../types.js';

/**
 * @param {import('../snapshotTypes.js').ReliabilityScanSnapshot} snapshot
 * @returns {import('../types.js').DiagnosticFinding[]}
 */
export function scanPaymentOrderProviderMismatch(snapshot) {
  const findings = [];

  for (const order of snapshot.orders ?? []) {
    const attempts = order.fulfillmentAttempts ?? [];
    const providerSuccess = attempts.some(
      (a) => a.providerReportedSuccess === true || a.status === 'SUCCESS',
    );

    if (providerSuccess && order.orderStatus !== 'FULFILLED' && order.orderStatus !== 'FAILED') {
      findings.push(
        createFinding({
          id: 'CORE4-MIS-001',
          fmId: 'FM-02',
          invariantIds: ['INV-02'],
          severity: 'high',
          repairClass: 'B',
          recommendation: 'provider_success_order_not_terminal_reconcile',
          entityType: 'order',
          entityId: order.orderId,
          evidence: { orderStatus: order.orderStatus },
        }),
      );
    }
  }

  for (const hint of snapshot.walletMismatches ?? []) {
    if (
      Number.isFinite(hint.checkoutAmountCents) &&
      Number.isFinite(hint.walletLedgerDeltaCents) &&
      hint.checkoutAmountCents !== hint.walletLedgerDeltaCents
    ) {
      findings.push(
        createFinding({
          id: 'CORE4-MIS-002',
          fmId: 'FM-12',
          invariantIds: ['INV-01'],
          severity: 'high',
          repairClass: 'C',
          recommendation: 'wallet_checkout_amount_mismatch_reconcile',
          entityType: 'wallet',
          entityId: hint.orderId,
          evidence: {
            checkoutAmountCents: hint.checkoutAmountCents,
            walletLedgerDeltaCents: hint.walletLedgerDeltaCents,
          },
        }),
      );
    }
  }

  return findings;
}
