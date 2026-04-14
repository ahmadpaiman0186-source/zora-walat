import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PAYMENT_STATUS, FULFILLMENT_STATUS } from '../src/domain/topupOrder/statuses.js';
import {
  assertWebTopupFulfillmentTransition,
  assertWebTopupPaymentTransition,
  isAllowedWebTopupFulfillmentTransition,
  isAllowedWebTopupPaymentTransition,
} from '../src/domain/topupOrder/webtopupStateMachine.js';

describe('webtopupStateMachine', () => {
  it('allows pending→paid and pending→failed (payment)', () => {
    assert.equal(
      isAllowedWebTopupPaymentTransition(PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PAID),
      true,
    );
    assert.equal(
      isAllowedWebTopupPaymentTransition(PAYMENT_STATUS.PENDING, PAYMENT_STATUS.FAILED),
      true,
    );
  });

  it('forbids paid→pending (replay / downgrade)', () => {
    assert.equal(
      isAllowedWebTopupPaymentTransition(PAYMENT_STATUS.PAID, PAYMENT_STATUS.PENDING),
      false,
    );
    const r = assertWebTopupPaymentTransition(
      PAYMENT_STATUS.PAID,
      PAYMENT_STATUS.PENDING,
      'client_mark_paid',
    );
    assert.equal(r.ok, false);
  });

  it('webhook authority uses same graph as client for pending→paid', () => {
    const w = assertWebTopupPaymentTransition(
      PAYMENT_STATUS.PENDING,
      PAYMENT_STATUS.PAID,
      'webhook',
    );
    assert.equal(w.ok, true);
  });

  it('fulfillment: pending may reach failed or queued (not direct delivered)', () => {
    assert.equal(
      isAllowedWebTopupFulfillmentTransition(
        FULFILLMENT_STATUS.PENDING,
        FULFILLMENT_STATUS.FAILED,
      ),
      true,
    );
    assert.equal(
      isAllowedWebTopupFulfillmentTransition(
        FULFILLMENT_STATUS.PENDING,
        FULFILLMENT_STATUS.QUEUED,
      ),
      true,
    );
    assert.equal(
      isAllowedWebTopupFulfillmentTransition(
        FULFILLMENT_STATUS.PENDING,
        FULFILLMENT_STATUS.DELIVERED,
      ),
      false,
    );
    const bad = assertWebTopupFulfillmentTransition(
      FULFILLMENT_STATUS.DELIVERED,
      FULFILLMENT_STATUS.PENDING,
    );
    assert.equal(bad.ok, false);
  });
});
