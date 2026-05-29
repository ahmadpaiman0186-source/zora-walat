import { createFinding } from '../types.js';

/**
 * @param {import('../snapshotTypes.js').ReliabilityScanSnapshot} snapshot
 * @returns {import('../types.js').DiagnosticFinding[]}
 */
export function scanCompletedWithoutProof(snapshot) {
  const findings = [];
  const env = snapshot.environmentHints ?? {};
  const productionLike =
    env.nodeEnv === 'production' && env.reloadlySandbox !== true;

  for (const order of snapshot.orders ?? []) {
    if (order.orderStatus !== 'FULFILLED') continue;
    const attempts = order.fulfillmentAttempts ?? [];
    const mockSuccess = attempts.some(
      (a) =>
        a.providerKey === 'mock' &&
        (a.status === 'SUCCESS' || a.providerReportedSuccess),
    );
    if (productionLike && mockSuccess && env.airtimeProvider === 'reloadly') {
      findings.push(
        createFinding({
          id: 'CORE4-CMP-MOCK-001',
          fmId: 'FM-09',
          invariantIds: ['INV-02'],
          severity: 'critical',
          repairClass: 'D',
          recommendation: 'forbidden_mock_fulfillment_in_production_path',
          entityType: 'order',
          entityId: order.orderId,
        }),
      );
    }
  }

  return findings;
}
