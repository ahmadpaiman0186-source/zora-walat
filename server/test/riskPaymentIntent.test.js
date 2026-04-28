import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { RISK_REASON_CODE } from '../src/constants/riskErrors.js';
import { HttpError } from '../src/lib/httpError.js';
import { assertPaymentIntentRiskAllowed } from '../src/services/risk/assertPaymentIntentRisk.js';
import { clearSlidingWindowsForTests } from '../src/services/risk/riskSlidingWindow.js';

describe('assertPaymentIntentRiskAllowed', () => {
  afterEach(() => {
    clearSlidingWindowsForTests();
  });

  function mockReq(ip = '203.0.113.5') {
    return {
      ip,
      socket: { remoteAddress: ip },
      log: { warn: () => {}, info: () => {} },
      traceId: 'trace-test',
      webtopupAuthUser: null,
    };
  }

  it('allows first attempts for an amount', () => {
    assertPaymentIntentRiskAllowed(mockReq(), { amountCents: 500, traceId: 't1' });
  });

  it('denies excessive same-amount attempts from same IP', () => {
    const req = mockReq('198.51.100.2');
    let threw = null;
    for (let i = 0; i < 12; i++) {
      assertPaymentIntentRiskAllowed(req, { amountCents: 999, traceId: 't2' });
    }
    try {
      assertPaymentIntentRiskAllowed(req, { amountCents: 999, traceId: 't2' });
    } catch (e) {
      threw = e;
    }
    assert.ok(threw instanceof HttpError);
    assert.equal(threw.status, 429);
    assert.equal(threw.code, RISK_REASON_CODE.DUPLICATE_PATTERN);
  });
});
