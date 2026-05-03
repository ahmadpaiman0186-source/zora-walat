/**
 * Canonical phase projection — no DB, no I/O.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CANONICAL_PHASE,
  deriveCanonicalPhaseFromWebTopupOrder,
} from '../src/domain/canonicalTransactionProjection.js';
import { FULFILLMENT_STATUS, PAYMENT_STATUS } from '../src/domain/topupOrder/statuses.js';

describe('deriveCanonicalPhaseFromWebTopupOrder', () => {
  it('pending without PI → PENDING', () => {
    assert.equal(
      deriveCanonicalPhaseFromWebTopupOrder({
        paymentStatus: PAYMENT_STATUS.PENDING,
        paymentIntentId: null,
      }),
      CANONICAL_PHASE.PENDING,
    );
  });

  it('pending with PI → PAYMENT_INITIATED', () => {
    assert.equal(
      deriveCanonicalPhaseFromWebTopupOrder({
        paymentStatus: PAYMENT_STATUS.PENDING,
        paymentIntentId: 'pi_test_123',
      }),
      CANONICAL_PHASE.PAYMENT_INITIATED,
    );
  });

  it('paid + fulfillment pending → PAYMENT_CONFIRMED', () => {
    assert.equal(
      deriveCanonicalPhaseFromWebTopupOrder({
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
      }),
      CANONICAL_PHASE.PAYMENT_CONFIRMED,
    );
  });

  it('paid + processing → PROCESSING', () => {
    assert.equal(
      deriveCanonicalPhaseFromWebTopupOrder({
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.PROCESSING,
      }),
      CANONICAL_PHASE.PROCESSING,
    );
  });

  it('paid + delivered → SUCCESS', () => {
    assert.equal(
      deriveCanonicalPhaseFromWebTopupOrder({
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.DELIVERED,
      }),
      CANONICAL_PHASE.SUCCESS,
    );
  });
});
