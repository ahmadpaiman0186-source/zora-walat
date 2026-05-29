import { createFinding } from '../types.js';

const EXPECTED_AUDIT_BY_STATUS = {
  PAID: ['stripe_webhook_received', 'order_status_changed'],
  PROCESSING: ['order_status_changed'],
  FULFILLED: ['order_status_changed'],
  FAILED: ['order_status_changed'],
};

/**
 * @param {import('../snapshotTypes.js').ReliabilityScanSnapshot} snapshot
 * @returns {import('../types.js').DiagnosticFinding[]}
 */
export function scanMissingAudit(snapshot) {
  const findings = [];

  for (const order of snapshot.orders ?? []) {
    const events = new Set((order.auditEvents ?? []).map((e) => String(e)));
    const expected = EXPECTED_AUDIT_BY_STATUS[order.orderStatus];
    if (!expected) continue;
    const missing = expected.filter((e) => !events.has(e));
    if (missing.length > 0) {
      findings.push(
        createFinding({
          id: 'CORE4-AUD-001',
          fmId: 'FM-13',
          invariantIds: ['INV-05'],
          severity: 'medium',
          repairClass: 'B',
          recommendation: 'backfill_audit_metadata_candidate_not_applied',
          entityType: 'order',
          entityId: order.orderId,
          evidence: { missingEvents: missing, orderStatus: order.orderStatus },
          confidence: events.size === 0 ? 'high' : 'medium',
        }),
      );
    }
  }

  return findings;
}
