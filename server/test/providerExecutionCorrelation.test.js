import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildPhase1ProviderIdentityBundle,
  buildProviderExecutionCorrelationId,
  buildProviderExecutionEvidenceBlock,
  buildReloadlyPhase1CustomIdentifier,
} from '../src/lib/providerExecutionCorrelation.js';

describe('providerExecutionCorrelation', () => {
  it('builds stable correlation from attempt + checkout ids', () => {
    const a = 'clattempt1234567890';
    const o = 'chk_order_abcdefghijklmnop';
    const c1 = buildProviderExecutionCorrelationId(a, o);
    const c2 = buildProviderExecutionCorrelationId(a, o);
    assert.equal(c1, c2);
    assert.ok(c1.includes(a));
    assert.ok(c1.includes('ord_'));
  });

  it('evidence block links attempt, correlation, and provider reference', () => {
    const e = buildProviderExecutionEvidenceBlock({
      checkoutId: 'chk_long_id_value_here',
      fulfillmentAttemptId: 'att_xyz',
      latestProviderReference: 'mock_ref_abc',
    });
    assert.equal(e.schemaVersion, 1);
    assert.equal(e.fulfillmentAttemptId, 'att_xyz');
    assert.equal(e.latestProviderReference, 'mock_ref_abc');
    assert.ok(
      typeof e.providerExecutionCorrelationId === 'string' &&
        e.providerExecutionCorrelationId.startsWith('zw_pe:'),
    );
    assert.equal(e.reloadlyCustomIdentifierWhenReloadly, 'zwr_att_xyz');
    assert.ok(String(e.identityAlignmentNote ?? '').includes('zw_pe'));
  });

  it('buildPhase1ProviderIdentityBundle aligns zw_pe and zwr_ to the same attempt id', () => {
    const order = 'cmcheckoutorderid01';
    const att = 'cmattemptidfulfill02';
    const b = buildPhase1ProviderIdentityBundle(order, att);
    assert.ok(b);
    assert.equal(b.reloadlyCustomIdentifier, buildReloadlyPhase1CustomIdentifier(order, att, 1));
    assert.equal(b.reloadlyCustomIdentifier, `zwr_${att}`);
    assert.ok(b.providerExecutionCorrelationId.includes(att));
  });

  it('buildReloadlyPhase1CustomIdentifier uses attempt id when present (Reloadly inquiry/registry key)', () => {
    const cid = 'cmnzbwchw0006u70gxwjdi2hq';
    const k = buildReloadlyPhase1CustomIdentifier('ord_checkout_x', cid, 99);
    assert.equal(k, `zwr_${cid}`);
    assert.ok(k.length <= 120);
  });

  it('buildReloadlyPhase1CustomIdentifier falls back to legacy order_aN when no attempt id', () => {
    assert.equal(
      buildReloadlyPhase1CustomIdentifier('checkout_id_abc', null, 2),
      'checkout_id_abc_a2',
    );
  });
});
