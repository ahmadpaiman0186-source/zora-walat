import { createFinding } from '../types.js';

/**
 * @param {import('../snapshotTypes.js').ReliabilityScanSnapshot} snapshot
 * @returns {import('../types.js').DiagnosticFinding[]}
 */
export function scanDuplicateTransaction(snapshot) {
  const findings = [];

  const eventCounts = new Map();
  for (const ev of snapshot.stripeWebhookEvents ?? []) {
    const id = String(ev?.eventId ?? '').trim();
    if (!id) continue;
    const n = (eventCounts.get(id) ?? 0) + (ev.deliveryCount ?? 1);
    eventCounts.set(id, n);
  }
  for (const [eventId, count] of eventCounts) {
    if (count > 1) {
      findings.push(
        createFinding({
          id: 'CORE4-DUP-WH-001',
          fmId: 'FM-04',
          invariantIds: ['INV-01'],
          severity: 'high',
          repairClass: 'A',
          recommendation: 'investigate_stripe_webhook_duplicate_delivery',
          entityType: 'webhook',
          entityId: eventId.slice(-12),
          evidence: { deliveryCount: count },
        }),
      );
    }
  }

  const idemToOrders = new Map();
  for (const order of snapshot.orders ?? []) {
    const key = String(order.idempotencyKey ?? '').trim();
    if (!key) continue;
    const list = idemToOrders.get(key) ?? [];
    list.push(order.orderId);
    idemToOrders.set(key, list);
  }
  for (const [key, orderIds] of idemToOrders) {
    if (orderIds.length > 1) {
      const paid = orderIds.filter((oid) => {
        const o = snapshot.orders.find((x) => x.orderId === oid);
        return o && ['PAID', 'PROCESSING', 'FULFILLED'].includes(o.orderStatus);
      });
      if (paid.length > 1) {
        findings.push(
          createFinding({
            id: 'CORE4-DUP-CHK-001',
            fmId: 'FM-05',
            invariantIds: ['INV-01'],
            severity: 'high',
            repairClass: 'A',
            recommendation: 'investigate_checkout_idempotency_collision',
            entityType: 'checkout',
            entityId: key.slice(0, 8),
            evidence: { orderCount: paid.length },
            confidence: 'medium',
          }),
        );
      }
    }
  }

  const refToAttempts = new Map();
  for (const order of snapshot.orders ?? []) {
    for (const att of order.fulfillmentAttempts ?? []) {
      const ref = String(att.providerReference ?? '').trim();
      if (!ref) continue;
      const entry = refToAttempts.get(ref) ?? [];
      entry.push({ orderId: order.orderId, attemptId: att.attemptId });
      refToAttempts.set(ref, entry);
    }
  }
  for (const [ref, entries] of refToAttempts) {
    const orderIds = new Set(entries.map((e) => e.orderId));
    if (entries.length > 1 && orderIds.size > 1) {
      findings.push(
        createFinding({
          id: 'CORE4-DUP-PRV-001',
          fmId: 'FM-06',
          invariantIds: ['INV-01', 'INV-04'],
          severity: 'critical',
          repairClass: 'A',
          recommendation: 'halt_provider_retry_investigate_duplicate_reference',
          entityType: 'attempt',
          entityId: ref.slice(-8),
          evidence: { attemptCount: entries.length, orderCount: orderIds.size },
        }),
      );
    }
  }

  return findings;
}
