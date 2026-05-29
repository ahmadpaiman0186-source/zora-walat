import { createFinding } from '../types.js';

/**
 * @param {import('../snapshotTypes.js').ReliabilityScanSnapshot} snapshot
 * @returns {import('../types.js').DiagnosticFinding[]}
 */
export function scanStalePending(snapshot) {
  const findings = [];
  const thresholdMs = snapshot.stalePendingThresholdMs ?? 600_000;
  const scanAtMs = Date.parse(snapshot.scanAt ?? new Date().toISOString());
  if (!Number.isFinite(scanAtMs)) return findings;

  for (const order of snapshot.orders ?? []) {
    if (order.orderStatus !== 'PENDING' && order.orderStatus !== 'PROCESSING') {
      continue;
    }
    const ts = order.updatedAt ?? order.paidAt;
    if (!ts) {
      findings.push(
        createFinding({
          id: 'CORE4-STALE-AMB-001',
          fmId: 'FM-07',
          invariantIds: ['INV-05'],
          severity: 'medium',
          repairClass: 'A',
          recommendation: 'missing_timestamp_conservative_stale_check',
          entityType: 'order',
          entityId: order.orderId,
          confidence: 'low',
        }),
      );
      continue;
    }
    const ageMs = scanAtMs - Date.parse(ts);
    if (Number.isFinite(ageMs) && ageMs > thresholdMs) {
      findings.push(
        createFinding({
          id: 'CORE4-STALE-001',
          fmId: 'FM-07',
          invariantIds: ['INV-02'],
          severity: 'high',
          repairClass: 'B',
          recommendation: 'stale_pending_or_processing_recovery_review',
          entityType: 'order',
          entityId: order.orderId,
          evidence: { ageMs, thresholdMs, orderStatus: order.orderStatus },
        }),
      );
    }
  }

  return findings;
}
