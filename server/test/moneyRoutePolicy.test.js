import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MONEY_ROUTE_POLICY,
  formatMoneyRoutePolicyReport,
} from '../src/constants/moneyRoutePolicy.js';

describe('moneyRoutePolicy', () => {
  it('includes core web top-up and wallet paths', () => {
    const paths = MONEY_ROUTE_POLICY.map((r) => `${r.method} ${r.path}`);
    assert.ok(paths.includes('POST /create-payment-intent'));
    assert.ok(paths.includes('POST /api/topup-orders/:id/mark-paid'));
    assert.ok(paths.includes('POST /api/wallet/topup'));
  });

  it('report is stable and non-empty', () => {
    const r = formatMoneyRoutePolicyReport();
    assert.match(r, /create-payment-intent/);
    assert.match(r, /webhooks\/stripe/);
  });
});
