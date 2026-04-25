import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertCanonicalTransition,
  CANONICAL_ORDER_STATUS,
  deriveCanonicalOrderStatus,
} from '../src/domain/orders/canonicalOrderLifecycle.js';
import { emitOrderTransitionLog } from '../src/lib/orderTransitionLog.js';

const C = CANONICAL_ORDER_STATUS;

describe('canonicalOrderLifecycle', () => {
  it('allows the happy path chain', () => {
    assert.deepEqual(assertCanonicalTransition(C.CREATED, C.PAID), { ok: true });
    assert.deepEqual(assertCanonicalTransition(C.PAID, C.QUEUED), { ok: true });
    assert.deepEqual(assertCanonicalTransition(C.QUEUED, C.SENT), { ok: true });
    assert.deepEqual(assertCanonicalTransition(C.SENT, C.DELIVERED), { ok: true });
  });

  it('allows ANY (non-failed) → FAILED', () => {
    assert.equal(assertCanonicalTransition(C.CREATED, C.FAILED).ok, true);
    assert.equal(assertCanonicalTransition(C.PAID, C.FAILED).ok, true);
    assert.equal(assertCanonicalTransition(C.QUEUED, C.FAILED).ok, true);
    assert.equal(assertCanonicalTransition(C.SENT, C.FAILED).ok, true);
    assert.equal(assertCanonicalTransition(C.DELIVERED, C.FAILED).ok, true);
  });

  it('rejects invalid forward jumps', () => {
    assert.equal(assertCanonicalTransition(C.CREATED, C.QUEUED).ok, false);
    assert.equal(assertCanonicalTransition(C.PAID, C.SENT).ok, false);
    assert.equal(assertCanonicalTransition(C.CREATED, C.DELIVERED).ok, false);
  });

  it('treats same status as noop', () => {
    assert.deepEqual(assertCanonicalTransition(C.PAID, C.PAID), {
      ok: true,
      noop: true,
    });
  });

  it('deriveCanonicalOrderStatus maps persisted rows', () => {
    assert.equal(
      deriveCanonicalOrderStatus({ orderStatus: 'PENDING' }, null),
      C.CREATED,
    );
    assert.equal(
      deriveCanonicalOrderStatus({ orderStatus: 'PAID' }, null),
      C.PAID,
    );
    assert.equal(
      deriveCanonicalOrderStatus({ orderStatus: 'PAID' }, { status: 'QUEUED' }),
      C.QUEUED,
    );
    assert.equal(
      deriveCanonicalOrderStatus({ orderStatus: 'PROCESSING' }, { status: 'PROCESSING' }),
      C.SENT,
    );
    assert.equal(
      deriveCanonicalOrderStatus({ orderStatus: 'FULFILLED' }, null),
      C.DELIVERED,
    );
    assert.equal(
      deriveCanonicalOrderStatus({ orderStatus: 'FAILED' }, null),
      C.FAILED,
    );
  });
});

describe('emitOrderTransitionLog', () => {
  it('emits the required JSON shape (no duplicate fulfillment implied by idempotent replay log)', () => {
    const lines = [];
    const log = {
      info(obj) {
        lines.push(obj);
      },
    };
    emitOrderTransitionLog(log, {
      orderId: 'ord_test',
      from: C.QUEUED,
      to: C.QUEUED,
      idempotentReplay: true,
    });
    assert.equal(lines.length, 1);
    const row = lines[0];
    assert.equal(row.event, 'order_transition');
    assert.equal(row.orderId, 'ord_test');
    assert.equal(row.from, C.QUEUED);
    assert.equal(row.to, C.QUEUED);
    assert.equal(row.idempotentReplay, true);
    assert.match(row.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  });
});
