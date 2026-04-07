import ass from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import {
  LIFECYCLE_DENIAL_CODE,
  detectPhase1LifecycleIncoherence,
  validateOrderStatusTransition,
  validatePaymentCheckoutStatusTransition,
} from '../src/domain/orders/phase1LifecyclePolicy.js';

describe('phase1LifecyclePolicy', () => {
  it('validateOrderStatusTransition: allows PENDING→PAID and noop same status', () => {
    ass.deepEqual(validateOrderStatusTransition(ORDER_STATUS.PENDING, ORDER_STATUS.PENDING), {
      ok: true,
      noop: true,
    });
    ass.equal(
      validateOrderStatusTransition(ORDER_STATUS.PENDING, ORDER_STATUS.PAID).ok,
      true,
    );
  });

  it('validateOrderStatusTransition: denies PAID→PENDING and terminal mutation', () => {
    const back = validateOrderStatusTransition(ORDER_STATUS.PAID, ORDER_STATUS.PENDING);
    ass.equal(back.ok, false);
    ass.equal(back.denial, LIFECYCLE_DENIAL_CODE.ORDER_TRANSITION_NOT_ALLOWED);

    const term = validateOrderStatusTransition(
      ORDER_STATUS.FULFILLED,
      ORDER_STATUS.FAILED,
    );
    ass.equal(term.ok, false);
    ass.equal(term.denial, LIFECYCLE_DENIAL_CODE.ORDER_TERMINAL_IMMUTABLE);
  });

  it('validatePaymentCheckoutStatusTransition: allows INITIATED→CHECKOUT_CREATED', () => {
    ass.equal(
      validatePaymentCheckoutStatusTransition(
        PAYMENT_CHECKOUT_STATUS.INITIATED,
        PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED,
      ).ok,
      true,
    );
  });

  it('validatePaymentCheckoutStatusTransition: allows INITIATED→PAYMENT_SUCCEEDED (webhook shortcut)', () => {
    ass.equal(
      validatePaymentCheckoutStatusTransition(
        PAYMENT_CHECKOUT_STATUS.INITIATED,
        PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
      ).ok,
      true,
    );
  });

  it('validatePaymentCheckoutStatusTransition: denies RECHARGE_COMPLETED→PAYMENT_PENDING', () => {
    const r = validatePaymentCheckoutStatusTransition(
      PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED,
      PAYMENT_CHECKOUT_STATUS.PAYMENT_PENDING,
    );
    ass.equal(r.ok, false);
    ass.equal(r.denial, LIFECYCLE_DENIAL_CODE.PAYMENT_STATUS_TRANSITION_NOT_ALLOWED);
  });

  it('detectPhase1LifecycleIncoherence: PAID with wrong payment row', () => {
    const v = detectPhase1LifecycleIncoherence({
      orderStatus: ORDER_STATUS.PAID,
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_PENDING,
    });
    ass.ok(v.some((x) => x.code === 'PAID_REQUIRES_PAYMENT_SUCCEEDED'));
  });

  it('detectPhase1LifecycleIncoherence: empty for coherent PAID + PAYMENT_SUCCEEDED', () => {
    const v = detectPhase1LifecycleIncoherence({
      orderStatus: ORDER_STATUS.PAID,
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
    });
    ass.equal(v.length, 0);
  });
});
