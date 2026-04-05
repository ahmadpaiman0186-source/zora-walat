import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  evaluateVelocityThresholds,
  hashPhoneVelocityKey,
} from '../src/services/webtopVelocitySignals.js';

describe('evaluateVelocityThresholds', () => {
  it('flags session burst at threshold', () => {
    const r = evaluateVelocityThresholds({
      sessionOrderCount: 8,
      phoneHourOrderCount: 0,
      phoneHourSameAmountCount: 0,
      sessionWarn: 8,
      phoneWarn: 12,
      sameAmountWarn: 6,
    });
    assert.equal(r.suspicious, true);
    assert.ok(r.flags.includes('session_create_burst'));
  });

  it('flags phone hour and repeat-amount bursts', () => {
    const r = evaluateVelocityThresholds({
      sessionOrderCount: 0,
      phoneHourOrderCount: 12,
      phoneHourSameAmountCount: 6,
      sessionWarn: 8,
      phoneWarn: 12,
      sameAmountWarn: 6,
    });
    assert.equal(r.suspicious, true);
    assert.ok(r.flags.includes('phone_orders_hour_burst'));
    assert.ok(r.flags.includes('phone_repeat_amount_burst'));
  });

  it('clear when below thresholds', () => {
    const r = evaluateVelocityThresholds({
      sessionOrderCount: 1,
      phoneHourOrderCount: 2,
      phoneHourSameAmountCount: 1,
      sessionWarn: 8,
      phoneWarn: 12,
      sameAmountWarn: 6,
    });
    assert.equal(r.suspicious, false);
  });
});

describe('hashPhoneVelocityKey', () => {
  it('is stable for same inputs', () => {
    const a = hashPhoneVelocityKey('701234567', 'AF');
    const b = hashPhoneVelocityKey('701234567', 'AF');
    assert.equal(a, b);
    assert.equal(a.length, 64);
  });
});
