import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RISK_REASON_CODE } from '../src/constants/riskErrors.js';
import { evaluateRisk } from '../src/services/risk/riskEngine.js';

describe('evaluateRisk', () => {
  it('allows clean traffic', () => {
    const r = evaluateRisk({
      kind: 'payment_intent',
      flags: {},
    });
    assert.equal(r.decision, 'allow');
    assert.equal(r.reasonCode, null);
  });

  it('denies payment intent duplicate amount pattern', () => {
    const r = evaluateRisk({
      kind: 'payment_intent',
      flags: { paymentIntentAmountBurst: true, duplicateFingerprint: true },
    });
    assert.equal(r.decision, 'deny');
    assert.equal(r.reasonCode, RISK_REASON_CODE.DUPLICATE_PATTERN);
  });

  it('denies OTP email velocity', () => {
    const r = evaluateRisk({
      kind: 'otp_request',
      flags: { otpEmailVelocityExceeded: true },
    });
    assert.equal(r.decision, 'deny');
    assert.equal(r.reasonCode, RISK_REASON_CODE.OTP_ABUSE);
  });

  it('denies web top-up session burst', () => {
    const r = evaluateRisk({
      kind: 'webtopup_create',
      flags: { webtopupSessionBurst: true },
    });
    assert.equal(r.decision, 'deny');
    assert.equal(r.reasonCode, RISK_REASON_CODE.SUSPICIOUS_VELOCITY);
  });

  it('denies recharge duplicate fingerprint', () => {
    const r = evaluateRisk({
      kind: 'recharge_order',
      flags: { rechargeDuplicateFingerprint: true },
    });
    assert.equal(r.decision, 'deny');
    assert.equal(r.reasonCode, RISK_REASON_CODE.DUPLICATE_PATTERN);
  });
});
