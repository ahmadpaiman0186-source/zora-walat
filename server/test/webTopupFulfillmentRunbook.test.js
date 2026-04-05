import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PAYMENT_STATUS, FULFILLMENT_STATUS } from '../src/domain/topupOrder/statuses.js';
import {
  buildSandboxProviderReadiness,
  buildFulfillmentRunbookForOrder,
  evaluateOperatorMappingForReloadlyWebOrder,
} from '../src/services/topupFulfillment/webTopupFulfillmentRunbook.js';

/** Minimal row shape for runbook builders (not a full Prisma type). */
function afAirtimeRow(overrides = {}) {
  return {
    id: 'tw_ord_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    paymentStatus: PAYMENT_STATUS.PAID,
    fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
    destinationCountry: 'AF',
    productType: 'airtime',
    operatorKey: 'nomap_xyz',
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

describe('buildSandboxProviderReadiness', () => {
  it('returns operator-safe prerequisite fields', () => {
    const r = buildSandboxProviderReadiness();
    assert.equal(typeof r.webTopupFulfillmentProvider, 'string');
    assert.equal(typeof r.reloadlyCredentialsConfigured, 'boolean');
    assert.ok(r.prerequisitesSummary.length > 5);
    if (r.reloadlyTopupsApiHost != null) {
      assert.match(r.reloadlyTopupsApiHost, /^[a-z0-9.-]+$/i);
    }
  });
});

describe('evaluateOperatorMappingForReloadlyWebOrder', () => {
  it('reports not ready when operator cannot be mapped', () => {
    const row = afAirtimeRow({ operatorKey: '___definitely_unmapped___' });
    const m = evaluateOperatorMappingForReloadlyWebOrder(row);
    assert.equal(m.applies, true);
    assert.equal(m.ready, false);
    assert.ok(m.detailCode);
    assert.ok(
      m.suggestedActions.some((a) => String(a).includes('RELOADLY_OPERATOR_MAP_JSON')),
    );
  });
});

describe('buildFulfillmentRunbookForOrder', () => {
  it('includes rollout and dispatch decision fields', () => {
    const rb = buildFulfillmentRunbookForOrder(afAirtimeRow());
    assert.equal(rb.version, 1);
    assert.equal(rb.rollout.destinationCountry, 'AF');
    assert.equal(rb.rollout.productType, 'airtime');
    assert.equal(typeof rb.dispatch.initialEligible, 'boolean');
    assert.ok(Array.isArray(rb.dispatch.reasonsIfBlocked));
    assert.ok(Array.isArray(rb.retry.reasonsIfBlocked));
    assert.equal(typeof rb.retry.eligible, 'boolean');
    assert.ok(rb.sandbox.prerequisitesSummary);
  });

  it('marks retry blocked for failed terminal error', () => {
    const rb = buildFulfillmentRunbookForOrder(
      afAirtimeRow({
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
        fulfillmentErrorCode: 'terminal',
      }),
    );
    assert.equal(rb.retry.eligible, false);
    assert.ok(rb.retry.reasonsIfBlocked.length >= 1);
  });

  it('marks retry eligible for failed retryable error', () => {
    const rb = buildFulfillmentRunbookForOrder(
      afAirtimeRow({
        fulfillmentStatus: FULFILLMENT_STATUS.FAILED,
        fulfillmentErrorCode: 'retryable',
      }),
    );
    assert.equal(rb.retry.eligible, true);
  });
});
