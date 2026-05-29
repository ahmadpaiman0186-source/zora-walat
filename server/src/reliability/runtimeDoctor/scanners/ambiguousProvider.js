import { createFinding } from '../types.js';

/**
 * @param {import('../snapshotTypes.js').ReliabilityScanSnapshot} snapshot
 * @returns {import('../types.js').DiagnosticFinding[]}
 */
export function scanAmbiguousProvider(snapshot) {
  const findings = [];

  for (const order of snapshot.orders ?? []) {
    const attempts = order.fulfillmentAttempts ?? [];
    const ambiguous = attempts.filter(
      (a) =>
        a.ambiguous === true ||
        a.status === 'ambiguous' ||
        a.status === 'pending_verification',
    );
    if (ambiguous.length > 0 && order.orderStatus === 'FULFILLED') {
      findings.push(
        createFinding({
          id: 'CORE4-AMB-001',
          fmId: 'FM-03',
          invariantIds: ['INV-06'],
          severity: 'critical',
          repairClass: 'C',
          recommendation: 'downgrade_fulfilled_to_pending_verification',
          entityType: 'order',
          entityId: order.orderId,
          evidence: { ambiguousAttemptIds: ambiguous.map((a) => a.attemptId) },
        }),
      );
    }
    if (ambiguous.length > 0 && order.orderStatus === 'PROCESSING') {
      findings.push(
        createFinding({
          id: 'CORE4-AMB-002',
          fmId: 'FM-03',
          invariantIds: ['INV-06'],
          severity: 'info',
          repairClass: 'A',
          recommendation: 'monitor_pending_verification',
          entityType: 'order',
          entityId: order.orderId,
          confidence: 'high',
        }),
      );
    }
  }

  return findings;
}
