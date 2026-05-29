import { createFinding } from '../types.js';

const PAIDISH = new Set(['PAID', 'PROCESSING', 'FULFILLED']);
const DELIVERED = 'FULFILLED';

/**
 * @param {import('../snapshotTypes.js').ReliabilityScanSnapshot} snapshot
 * @returns {import('../types.js').DiagnosticFinding[]}
 */
export function scanNoPayNoService(snapshot) {
  const findings = [];

  for (const order of snapshot.orders ?? []) {
    const attempts = order.fulfillmentAttempts ?? [];
    const hasSuccessAttempt = attempts.some(
      (a) =>
        a.status === 'SUCCESS' ||
        a.providerReportedSuccess === true ||
        (a.providerReference && !a.ambiguous),
    );
    const hasFailedTerminal = attempts.some((a) => a.status === 'FAILED');

    if (
      order.stripePaid === true &&
      PAIDISH.has(order.orderStatus) &&
      attempts.length === 0 &&
      order.orderStatus !== 'CANCELLED'
    ) {
      findings.push(
        createFinding({
          id: 'CORE4-NPNS-001',
          fmId: 'FM-10',
          invariantIds: ['INV-03'],
          severity: 'critical',
          repairClass: 'C',
          recommendation: 'paid_without_fulfillment_attempt_ops_review',
          entityType: 'order',
          entityId: order.orderId,
          evidence: { orderStatus: order.orderStatus, stripePaid: true },
        }),
      );
    }

    if (order.orderStatus === DELIVERED && !hasSuccessAttempt) {
      findings.push(
        createFinding({
          id: 'CORE4-NPNS-002',
          fmId: 'FM-11',
          invariantIds: ['INV-02'],
          severity: 'critical',
          repairClass: 'C',
          recommendation: 'fulfilled_without_provider_success_proof',
          entityType: 'order',
          entityId: order.orderId,
          evidence: { attemptCount: attempts.length },
        }),
      );
    }

    if (order.orderStatus === DELIVERED && hasFailedTerminal && !hasSuccessAttempt) {
      findings.push(
        createFinding({
          id: 'CORE4-NPNS-003',
          fmId: 'FM-01',
          invariantIds: ['INV-02', 'INV-03'],
          severity: 'high',
          repairClass: 'C',
          recommendation: 'provider_failed_but_order_fulfilled_reconcile',
          entityType: 'order',
          entityId: order.orderId,
        }),
      );
    }

    if (
      order.stripePaid === true &&
      order.orderStatus === 'PENDING' &&
      order.orderStatus !== 'CANCELLED'
    ) {
      findings.push(
        createFinding({
          id: 'CORE4-NPNS-004',
          fmId: 'FM-10',
          invariantIds: ['INV-03'],
          severity: 'high',
          repairClass: 'A',
          recommendation: 'stripe_paid_order_still_pending',
          entityType: 'order',
          entityId: order.orderId,
        }),
      );
    }
  }

  return findings;
}
