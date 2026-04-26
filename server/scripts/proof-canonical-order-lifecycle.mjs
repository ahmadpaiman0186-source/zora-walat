#!/usr/bin/env node
/**
 * Prints a simulated canonical lifecycle (stdout JSON lines) — no DB, no Stripe.
 * Run from repo: `node server/scripts/proof-canonical-order-lifecycle.mjs`
 */
import {
  assertCanonicalTransition,
  CANONICAL_ORDER_STATUS,
  deriveCanonicalOrderStatus,
} from '../src/domain/orders/canonicalOrderLifecycle.js';
import { emitOrderTransitionLog } from '../src/lib/orderTransitionLog.js';

const C = CANONICAL_ORDER_STATUS;

function step(from, to, extra = {}) {
  const r = assertCanonicalTransition(from, to);
  if (!r.ok) {
    console.log(JSON.stringify({ event: 'transition_denied', from, to, denial: r }));
    process.exitCode = 1;
    return;
  }
  emitOrderTransitionLog(undefined, { orderId: 'proof_order_1', from, to, ...extra });
}

console.log('[proof] Simulated CREATED → DELIVERED (happy path)');
step(C.CREATED, C.PAID);
step(C.PAID, C.QUEUED);
step(C.QUEUED, C.SENT);
step(C.SENT, C.DELIVERED);

console.log('[proof] Duplicate webhook replay (no forward progress)');
emitOrderTransitionLog(undefined, {
  orderId: 'proof_order_1',
  from: C.QUEUED,
  to: C.QUEUED,
  idempotentReplay: true,
});

console.log('[proof] deriveCanonicalOrderStatus snapshots');
for (const snap of [
  [{ orderStatus: 'PENDING' }, null],
  [{ orderStatus: 'PAID' }, { status: 'QUEUED' }],
  [{ orderStatus: 'PROCESSING' }, { status: 'PROCESSING' }],
  [{ orderStatus: 'FULFILLED' }, { status: 'SUCCEEDED' }],
]) {
  const d = deriveCanonicalOrderStatus(snap[0], snap[1]);
  console.log(JSON.stringify({ event: 'derived_canonical', orderStatus: snap[0].orderStatus, derived: d }));
}
