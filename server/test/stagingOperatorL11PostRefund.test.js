/**
 * L-11 post-refund state classification (pure).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyL11RefundState,
  postRefundBlockedReason,
} from '../tools/stagingOperatorL11PostRefund.mjs';

describe('classifyL11RefundState', () => {
  it('STATE_C when Stripe refund exists but incident not REFUNDED', () => {
    const r = classifyL11RefundState({
      postPaymentIncidentStatus: 'NONE',
      stripeRefundAlreadyExists: true,
    });
    assert.equal(r.state, 'STATE_C_REFUND_EXISTS_APP_NOT_UPDATED');
    assert.equal(r.rootCauseCode, 'webhook_mirror_pending_or_failed');
  });

  it('STATE_A when no Stripe refund and incident not REFUNDED', () => {
    const r = classifyL11RefundState({
      postPaymentIncidentStatus: 'NONE',
      stripeRefundAlreadyExists: false,
    });
    assert.equal(r.state, 'STATE_A_READY_NOT_REFUNDED');
  });

  it('pass path when incident REFUNDED', () => {
    const r = classifyL11RefundState({
      postPaymentIncidentStatus: 'REFUNDED',
      stripeRefundAlreadyExists: true,
    });
    assert.equal(r.state, 'STATE_PASS_INCIDENT_REFUNDED');
  });
});

describe('postRefundBlockedReason', () => {
  it('maps stripe refund without incident to webhook mirror pending', () => {
    assert.equal(
      postRefundBlockedReason(true),
      'webhook_mirror_pending_charge_refunded',
    );
  });
});
