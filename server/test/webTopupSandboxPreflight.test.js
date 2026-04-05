import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PAYMENT_STATUS, FULFILLMENT_STATUS } from '../src/domain/topupOrder/statuses.js';
import { env } from '../src/config/env.js';
import { buildWebTopupReloadlyPayload } from '../src/domain/fulfillment/reloadlyWebTopupFulfillment.js';
import {
  buildReloadlySandboxDispatchPreflight,
  buildSandboxPostDispatchSummary,
  planSandboxDispatchExercise,
} from '../src/services/topupFulfillment/webTopupSandboxPreflight.js';

const goodGate = {
  webTopupFulfillmentProvider: 'reloadly',
  reloadlySandbox: true,
  reloadlyCredentialsConfigured: true,
};

const TEST_ORDER_ID = 'tw_ord_a1b2c3d4-e5f6-7890-abcd-ef1234567890';

function baseRow(overrides = {}) {
  return {
    id: TEST_ORDER_ID,
    paymentStatus: PAYMENT_STATUS.PAID,
    fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
    destinationCountry: 'AF',
    productType: 'airtime',
    operatorKey: '___unmapped_preflight___',
    operatorLabel: 'Op',
    phoneNumber: '701234567',
    productId: 'p1',
    productName: 'Air',
    amountCents: 500,
    currency: 'usd',
    fulfillmentAttemptCount: 0,
    fulfillmentErrorCode: null,
    ...overrides,
  };
}

describe('buildReloadlySandboxDispatchPreflight', () => {
  it('blocks when provider is not reloadly', () => {
    const r = buildReloadlySandboxDispatchPreflight(
      baseRow(),
      {
        ...goodGate,
        webTopupFulfillmentProvider: 'mock',
      },
      TEST_ORDER_ID,
    );
    assert.equal(r.ready, false);
    assert.ok(r.blockers.some((b) => b.includes('WEBTOPUP_FULFILLMENT_PROVIDER')));
    assert.equal(r.runbook, null);
  });

  it('blocks when sandbox flag is off', () => {
    const r = buildReloadlySandboxDispatchPreflight(baseRow(), {
      ...goodGate,
      reloadlySandbox: false,
    }, TEST_ORDER_ID);
    assert.equal(r.ready, false);
    assert.ok(r.blockers.some((b) => b.includes('RELOADLY_SANDBOX')));
  });

  it('blocks when Reloadly credentials are not configured', () => {
    const r = buildReloadlySandboxDispatchPreflight(baseRow(), {
      ...goodGate,
      reloadlyCredentialsConfigured: false,
    }, TEST_ORDER_ID);
    assert.equal(r.ready, false);
    assert.ok(r.blockers.some((b) => b.includes('credentials')));
  });

  it('blocks when order id is invalid (no DB row needed)', () => {
    const r = buildReloadlySandboxDispatchPreflight(null, goodGate, 'not-an-order-id');
    assert.equal(r.ready, false);
    assert.ok(r.blockers.some((b) => b.includes('invalid')));
    assert.equal(r.runbook, null);
  });

  it('blocks when order row is missing', () => {
    const r = buildReloadlySandboxDispatchPreflight(
      null,
      goodGate,
      TEST_ORDER_ID,
    );
    assert.equal(r.ready, false);
    assert.ok(r.blockers.some((b) => b.toLowerCase().includes('not found')));
  });

  it('blocks when not paid', () => {
    const r = buildReloadlySandboxDispatchPreflight(
      baseRow({ paymentStatus: PAYMENT_STATUS.PENDING }),
      goodGate,
      TEST_ORDER_ID,
    );
    assert.equal(r.ready, false);
    assert.ok(r.blockers.some((b) => b.includes('paid')));
    assert.ok(r.runbook);
  });

  it('blocks when fulfillment is not pending', () => {
    const r = buildReloadlySandboxDispatchPreflight(
      baseRow({ fulfillmentStatus: FULFILLMENT_STATUS.DELIVERED }),
      goodGate,
      TEST_ORDER_ID,
    );
    assert.equal(r.ready, false);
    assert.ok(r.blockers.some((b) => b.includes('pending')));
  });

  it('blocks when route is not AF airtime', () => {
    const r = buildReloadlySandboxDispatchPreflight(
      baseRow({ destinationCountry: 'PK' }),
      goodGate,
      TEST_ORDER_ID,
    );
    assert.equal(r.ready, false);
    assert.ok(r.blockers.some((b) => b.includes('AF')));
  });

  it('blocks when operator mapping is not ready (AF airtime)', () => {
    const r = buildReloadlySandboxDispatchPreflight(
      baseRow(),
      goodGate,
      TEST_ORDER_ID,
    );
    assert.equal(r.ready, false);
    assert.ok(r.blockers.some((b) => b.includes('[mapping]')));
    assert.ok(r.runbook);
  });

  it('warns when fulfillment attempts already recorded', () => {
    const r = buildReloadlySandboxDispatchPreflight(
      baseRow({ fulfillmentAttemptCount: 2 }),
      goodGate,
      TEST_ORDER_ID,
    );
    assert.ok(r.warnings.some((w) => w.includes('fulfillmentAttemptCount')));
  });

  it('ready when env maps operator and order is otherwise valid', () => {
    const built = buildWebTopupReloadlyPayload(
      {
        orderId: TEST_ORDER_ID,
        destinationCountry: 'AF',
        productType: 'airtime',
        operatorKey: 'roshan',
        operatorLabel: 'R',
        phoneNationalDigits: '701234567',
        productId: 'p1',
        productName: 'Air',
        amountCents: 500,
        currency: 'usd',
      },
      env.reloadlyOperatorMap,
    );
    if (!built.ok) {
      return;
    }
    const r = buildReloadlySandboxDispatchPreflight(
      baseRow({ operatorKey: 'roshan' }),
      goodGate,
      TEST_ORDER_ID,
    );
    assert.equal(r.ready, true);
    assert.equal(r.blockers.length, 0);
  });
});

describe('planSandboxDispatchExercise', () => {
  it('never dispatches in dry-run', () => {
    const p = planSandboxDispatchExercise({ ready: true }, true);
    assert.equal(p.wouldDispatch, false);
    assert.equal(p.dryRun, true);
    assert.ok(p.explanation.includes('Dry-run'));
  });

  it('dispatches only when ready and not dry-run', () => {
    assert.equal(
      planSandboxDispatchExercise({ ready: true }, false).wouldDispatch,
      true,
    );
    assert.equal(
      planSandboxDispatchExercise({ ready: false }, false).wouldDispatch,
      false,
    );
  });
});

describe('buildSandboxPostDispatchSummary', () => {
  it('returns safe shape for failed diagnostics', () => {
    const s = buildSandboxPostDispatchSummary({ ok: false });
    assert.equal(s.ok, false);
    assert.ok(typeof s.recommendedNextAction === 'string');
  });

  it('summarizes delivered order', () => {
    const s = buildSandboxPostDispatchSummary({
      ok: true,
      orderIdSuffix: 'eeeeeeee',
      fulfillmentStatus: FULFILLMENT_STATUS.DELIVERED,
      fulfillmentReferenceSuffix: 'ref_suffix_12',
      fulfillmentErrorCode: null,
      fulfillmentErrorMessageSafe: null,
      runbook: { retry: { eligible: false } },
    });
    assert.equal(s.ok, true);
    assert.equal(s.fulfillmentStatus, 'delivered');
    assert.equal(s.retryEligible, false);
    assert.ok(s.recommendedNextAction.toLowerCase().includes('delivered'));
  });
});
