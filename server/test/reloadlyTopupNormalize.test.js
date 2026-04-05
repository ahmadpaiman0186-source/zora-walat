import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { classifyReloadlyTopupHttp200Body } from '../src/domain/fulfillment/reloadlyTopup.js';

describe('classifyReloadlyTopupHttp200Body', () => {
  it('confirms only with SUCCESSFUL and transactionId', () => {
    const r = classifyReloadlyTopupHttp200Body({
      status: 'SUCCESSFUL',
      transactionId: 99,
    });
    assert.equal(r.kind, 'confirmed');
    if (r.kind === 'confirmed') {
      assert.equal(r.providerReference, 'reloadly_tx_99');
      assert.equal(r.responseSummary.normalizedOutcome, 'confirmed');
    }
  });

  it('ambiguous when SUCCESSFUL but no transactionId', () => {
    const r = classifyReloadlyTopupHttp200Body({ status: 'SUCCESSFUL' });
    assert.equal(r.kind, 'ambiguous');
  });

  it('pending for PROCESSING with transactionId', () => {
    const r = classifyReloadlyTopupHttp200Body({
      status: 'PROCESSING',
      transactionId: 7,
    });
    assert.equal(r.kind, 'pending');
    if (r.kind === 'pending') {
      assert.equal(r.providerReference, 'reloadly_tx_7');
      assert.equal(r.responseSummary.normalizedOutcome, 'pending_verification');
    }
  });

  it('explicit failure for FAILED', () => {
    const r = classifyReloadlyTopupHttp200Body({ status: 'FAILED', transactionId: 1 });
    assert.equal(r.kind, 'failed');
  });

  it('ambiguous for unrecognized status', () => {
    const r = classifyReloadlyTopupHttp200Body({ status: 'WEIRD', transactionId: 2 });
    assert.equal(r.kind, 'ambiguous');
  });
});
