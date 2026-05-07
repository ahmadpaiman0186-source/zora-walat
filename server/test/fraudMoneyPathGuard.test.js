import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  hostedCheckoutFraudHttpDecision,
  logFraudRiskDecision,
} from '../src/fraud/fraudMoneyPathGuard.js';
import { checkoutAbuseBlockHighSeverityImmediately } from '../src/lib/fraudControlsPolicy.js';

test('production-like strict mode blocks high risk decision', () => {
  const strict = checkoutAbuseBlockHighSeverityImmediately();
  const r = hostedCheckoutFraudHttpDecision({
    risk: { decision: 'block' },
    abuse: { severity: 'low' },
    rapidInFlightFingerprint: false,
  });
  if (strict) assert.equal(r.httpBlock, true);
});

test('dev lenient: risk block without strict does not HTTP block', () => {
  const saved = {
    NODE_ENV: process.env.NODE_ENV,
    CHECKOUT_ABUSE_STRICT: process.env.CHECKOUT_ABUSE_STRICT,
    CHECKOUT_ABUSE_RELAX_DEV: process.env.CHECKOUT_ABUSE_RELAX_DEV,
  };
  process.env.NODE_ENV = 'development';
  delete process.env.CHECKOUT_ABUSE_STRICT;
  process.env.CHECKOUT_ABUSE_RELAX_DEV = 'true';
  try {
    const r = hostedCheckoutFraudHttpDecision({
      risk: { decision: 'block' },
      abuse: { severity: 'low' },
      rapidInFlightFingerprint: false,
    });
    assert.equal(r.httpBlock, false);
  } finally {
    process.env.NODE_ENV = saved.NODE_ENV;
    if (saved.CHECKOUT_ABUSE_STRICT === undefined)
      delete process.env.CHECKOUT_ABUSE_STRICT;
    else process.env.CHECKOUT_ABUSE_STRICT = saved.CHECKOUT_ABUSE_STRICT;
    if (saved.CHECKOUT_ABUSE_RELAX_DEV === undefined)
      delete process.env.CHECKOUT_ABUSE_RELAX_DEV;
    else process.env.CHECKOUT_ABUSE_RELAX_DEV = saved.CHECKOUT_ABUSE_RELAX_DEV;
  }
});

test('legacy dev rapid in-flight still blocks when abuse high', () => {
  const saved = {
    NODE_ENV: process.env.NODE_ENV,
    CHECKOUT_ABUSE_STRICT: process.env.CHECKOUT_ABUSE_STRICT,
    CHECKOUT_ABUSE_RELAX_DEV: process.env.CHECKOUT_ABUSE_RELAX_DEV,
  };
  process.env.NODE_ENV = 'development';
  delete process.env.CHECKOUT_ABUSE_STRICT;
  process.env.CHECKOUT_ABUSE_RELAX_DEV = 'true';
  try {
    const r = hostedCheckoutFraudHttpDecision({
      risk: { decision: 'allow' },
      abuse: { severity: 'high' },
      rapidInFlightFingerprint: true,
    });
    assert.equal(r.httpBlock, true);
  } finally {
    process.env.NODE_ENV = saved.NODE_ENV;
    if (saved.CHECKOUT_ABUSE_STRICT === undefined)
      delete process.env.CHECKOUT_ABUSE_STRICT;
    else process.env.CHECKOUT_ABUSE_STRICT = saved.CHECKOUT_ABUSE_STRICT;
    if (saved.CHECKOUT_ABUSE_RELAX_DEV === undefined)
      delete process.env.CHECKOUT_ABUSE_RELAX_DEV;
    else process.env.CHECKOUT_ABUSE_RELAX_DEV = saved.CHECKOUT_ABUSE_RELAX_DEV;
  }
});

test('fraud_risk_decision log line contains no raw phone digits', () => {
  /** @type {unknown[]} */
  const payloads = [];
  const log = {
    info(obj) {
      payloads.push(obj);
    },
  };
  logFraudRiskDecision(log, {
    decision: 'review',
    severity: 'medium',
    reasonCodes: ['x'],
    score: 40,
    traceId: 'tr',
    userId: 'usr_phone_93701234567_should_not_appear',
    recipientPhoneHash: 'abcdef0123456789',
    clientIp: '203.0.113.9',
  });
  assert.equal(payloads.length, 1);
  const line = JSON.stringify(payloads[0]);
  assert.equal(line.includes('93701234567'), false);
  assert.equal(line.includes('203.0.113'), false);
  assert.ok(line.includes('phoneHashSuffix'));
});
