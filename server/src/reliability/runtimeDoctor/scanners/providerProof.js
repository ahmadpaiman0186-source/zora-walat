import { createFinding } from '../types.js';

/**
 * @param {import('../snapshotTypes.js').ReliabilityScanSnapshot} snapshot
 * @returns {import('../types.js').DiagnosticFinding[]}
 */
export function scanProviderProof(snapshot) {
  const findings = [];

  for (const order of snapshot.orders ?? []) {
    if (order.orderStatus !== 'FULFILLED') continue;
    const attempts = order.fulfillmentAttempts ?? [];
    const successWithRef = attempts.filter(
      (a) =>
        (a.status === 'SUCCESS' || a.providerReportedSuccess) &&
        String(a.providerReference ?? '').trim().length > 0,
    );
    if (successWithRef.length === 0) {
      findings.push(
        createFinding({
          id: 'CORE4-PRV-PRF-001',
          fmId: 'FM-08',
          invariantIds: ['INV-02', 'INV-06'],
          severity: 'critical',
          repairClass: 'C',
          recommendation: 'require_provider_reference_before_delivery_claim',
          entityType: 'order',
          entityId: order.orderId,
          evidence: { attemptCount: attempts.length },
        }),
      );
    }
  }

  return findings;
}
