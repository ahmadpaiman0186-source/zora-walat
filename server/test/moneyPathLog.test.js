import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MONEY_PATH_EVENT } from '../src/domain/payments/moneyPathEvents.js';
import { emitMoneyPathLog } from '../src/infrastructure/logging/moneyPathLog.js';

describe('moneyPathLog', () => {
  it('emits single JSON line with moneyPath and event', () => {
    const lines = [];
    const orig = console.log;
    console.log = (...args) => {
      lines.push(args.join(' '));
    };
    try {
      emitMoneyPathLog(MONEY_PATH_EVENT.PAYMENT_INTENT_CREATED, {
        traceId: 't-99',
        paymentIntentIdSuffix: 'pi_suffix',
      });
    } finally {
      console.log = orig;
    }
    assert.equal(lines.length, 1);
    const obj = JSON.parse(lines[0]);
    assert.equal(obj.moneyPath, true);
    assert.equal(obj.event, MONEY_PATH_EVENT.PAYMENT_INTENT_CREATED);
    assert.equal(obj.traceId, 't-99');
    assert.ok(obj.t);
  });

  it('emits risk_decision with stable event name', () => {
    const lines = [];
    const orig = console.log;
    console.log = (...args) => {
      lines.push(args.join(' '));
    };
    try {
      emitMoneyPathLog(MONEY_PATH_EVENT.RISK_DECISION, {
        traceId: 't-risk',
        route: '/api/x',
        decision: 'allow',
        reasonCode: null,
      });
    } finally {
      console.log = orig;
    }
    const obj = JSON.parse(lines[0]);
    assert.equal(obj.event, 'risk_decision');
    assert.equal(obj.decision, 'allow');
  });
});
