/**
 * L-11 preflight evaluation (pure, no network).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  evaluateL11Preflight,
  L11_PREFLIGHT_FORBIDDEN_ACTIONS,
  L11_PREFLIGHT_SLIM_PHASE1_TRUTH_PREFIX,
} from '../tools/stagingOperatorL11Preflight.mjs';

function passingSnapshot() {
  return {
    tokenOk: true,
    loginHttp: 'skipped_valid_token',
    status: {
      http: 200,
      orderFound: true,
      orderStatus: 'FULFILLED',
      paymentStatus: 'RECHARGE_COMPLETED',
      paidConfirmed: true,
      fulfillmentAttemptCount: 1,
      endpoint: '/api/ops/staging-operator-order-status/cmp…',
    },
    phase1Truth: {
      http: 200,
      orderFound: true,
      postPaymentIncidentStatus: 'NONE',
      endpoint: `${L11_PREFLIGHT_SLIM_PHASE1_TRUTH_PREFIX}cmp…`,
      usedSlimPath: true,
    },
  };
}

describe('evaluateL11Preflight', () => {
  it('passes when all L-11 preflight criteria met', () => {
    const r = evaluateL11Preflight(passingSnapshot());
    assert.equal(r.pass, true);
    assert.equal(r.blockedReason, null);
    assert.equal(r.checks.preflight_refund_eligible, true);
  });

  it('fails when incident already REFUNDED', () => {
    const input = passingSnapshot();
    input.phase1Truth.postPaymentIncidentStatus = 'REFUNDED';
    const r = evaluateL11Preflight(input);
    assert.equal(r.pass, false);
    assert.equal(r.blockedReason, 'already_refunded_incident');
    assert.equal(r.checks.preflight_refund_eligible, false);
  });

  it('fails when phase1-truth not slim endpoint', () => {
    const input = passingSnapshot();
    input.phase1Truth.endpoint = '/api/orders/cmp/phase1-truth';
    input.phase1Truth.usedSlimPath = false;
    const r = evaluateL11Preflight(input);
    assert.equal(r.pass, false);
    assert.equal(r.blockedReason, 'phase1_truth_not_slim_endpoint');
  });

  it('fails when token invalid', () => {
    const input = passingSnapshot();
    input.tokenOk = false;
    const r = evaluateL11Preflight(input);
    assert.equal(r.pass, false);
    assert.equal(r.blockedReason, 'token_missing_or_invalid');
  });
});

describe('L11_PREFLIGHT_FORBIDDEN_ACTIONS', () => {
  it('does not include refund execution paths', () => {
    assert.ok(L11_PREFLIGHT_FORBIDDEN_ACTIONS.includes('stripe_refund_api'));
    assert.ok(L11_PREFLIGHT_FORBIDDEN_ACTIONS.includes('dashboard_refund'));
    assert.ok(L11_PREFLIGHT_FORBIDDEN_ACTIONS.includes('create_checkout'));
  });
});
