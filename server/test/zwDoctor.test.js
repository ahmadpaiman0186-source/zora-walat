/**
 * zw-doctor control plane — classifier and proposal engine tests.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertProposalOutputHasNoSecrets,
  buildProposalsFromInvariants,
  buildRuntimeProposals,
} from '../tools/zwDoctor/proposals.mjs';
import { redactSecrets } from '../tools/zwDoctor/redact.mjs';
import {
  buildJwtMaterialPattern,
  buildLiveStripeSecretPattern,
  jwtHeaderPrefix,
  stripeLiveSkUnderscore,
} from '../tools/zwDoctor/secretPatterns.mjs';
import {
  computeVerdict,
  invariant,
  summarizeInvariants,
} from '../tools/zwDoctor/types.mjs';

describe('zwDoctor invariant summary', () => {
  it('PASS invariant result counts as PASS verdict', () => {
    const rows = [
      invariant({
        id: 'PAID_BEFORE_FULFILLMENT',
        status: 'PASS',
        evidence: 'gate ok',
      }),
    ];
    assert.equal(computeVerdict(rows), 'PASS');
    assert.equal(summarizeInvariants(rows).PASS, 1);
  });
});

describe('zwDoctor proposals', () => {
  it('BLOCKED missing Stripe key proposal', () => {
    const proposals = buildRuntimeProposals({
      stripeKeyMissing: true,
    });
    const p = proposals.find((x) => x.id === 'PROP_STRIPE_KEY_LOCAL');
    assert.ok(p);
    assert.equal(p.approval_required, false);
    assert.equal(p.danger, 'low');
  });

  it('CRITICAL unpaid fulfillment proposal', () => {
    const proposals = buildRuntimeProposals({
      unpaidWithFulfillment: true,
    });
    const p = proposals.find((x) => x.id === 'PROP_UNPAID_FULFILLMENT');
    assert.ok(p);
    assert.equal(p.classification, 'CRITICAL');
    assert.equal(p.approval_required, true);
    assert.equal(p.forbidden_auto, true);
  });

  it('CRITICAL duplicate fulfillment proposal', () => {
    const proposals = buildRuntimeProposals({
      duplicateFulfillment: true,
    });
    const p = proposals.find((x) => x.id === 'PROP_DUPLICATE_FULFILLMENT');
    assert.ok(p);
    assert.equal(p.classification, 'CRITICAL');
  });

  it('refund exists but incident not updated proposal', () => {
    const proposals = buildRuntimeProposals({
      refundExistsIncidentNotUpdated: true,
    });
    const p = proposals.find((x) => x.id === 'PROP_REFUND_INCIDENT_STALE');
    assert.ok(p);
    assert.match(p.steps.join(' '), /charge\.refunded/);
    assert.equal(p.approval_required, true);
  });

  it('deploy-root wrong proposal', () => {
    const proposals = buildRuntimeProposals({
      deployRootWrong: true,
    });
    const p = proposals.find((x) => x.id === 'PROP_DEPLOY_ROOT');
    assert.ok(p);
    assert.equal(p.approval_required, true);
    assert.match(p.steps.join(' '), /deploy:staging:guard/);
  });
});

describe('zwDoctor secret redaction', () => {
  it('redacts stripe live key material from strings', () => {
    const fakeLiveKey = `${stripeLiveSkUnderscore()}REDACTEDFAKEEXAMPLE`;
    const raw = `error ${fakeLiveKey}`;
    const out = redactSecrets(raw);
    assert.ok(!out.includes(stripeLiveSkUnderscore()));
    assert.ok(out.includes('[REDACTED]'));
  });

  it('proposal output passes secret assertion', () => {
    const proposals = buildRuntimeProposals({ stripeKeyMissing: true });
    assertProposalOutputHasNoSecrets(proposals, 'safe output');
  });

  it('rejects proposal blob containing live stripe secret pattern', () => {
    const blob = `config ${stripeLiveSkUnderscore()}fakeexampleforunittestsxx`;
    assert.throws(
      () => assertProposalOutputHasNoSecrets([], blob),
      /live_stripe_secret/,
    );
  });

  it('buildLiveStripeSecretPattern matches dynamically built sample only', () => {
    const sample = `${stripeLiveSkUnderscore()}fakeexampleforunittestsxx`;
    assert.ok(buildLiveStripeSecretPattern().test(sample));
    assert.ok(!buildLiveStripeSecretPattern().test('LIVE_STRIPE_KEY_REDACTED'));
  });

  it('buildJwtMaterialPattern matches dynamically built sample only', () => {
    const sample = `${jwtHeaderPrefix()}${'A'.repeat(22)}.${'B'.repeat(22)}.`;
    assert.ok(buildJwtMaterialPattern().test(sample));
    assert.ok(!buildJwtMaterialPattern().test('FAKE_TOKEN_REDACTED'));
  });
});

describe('zwDoctor JSON shape', () => {
  it('invariant objects have required fields for JSON report', () => {
    const row = invariant({
      id: 'TEST',
      status: 'PASS',
      confidence: 'high',
      evidence: 'ok',
      risk: 'none',
      proposed_next_action: 'none',
      approval_required: false,
    });
    const json = JSON.stringify(row);
    const parsed = JSON.parse(json);
    assert.equal(parsed.id, 'TEST');
    assert.equal(parsed.status, 'PASS');
    assert.equal(parsed.approval_required, false);
  });

  it('buildProposalsFromInvariants merges runtime and invariant proposals', () => {
    const inv = [
      invariant({
        id: 'NO_SECRET_FILES_STAGED',
        status: 'CRITICAL',
        evidence: 'staged',
        proposed_next_action: 'unstage',
        approval_required: true,
      }),
    ];
    const all = buildProposalsFromInvariants(inv, {});
    assert.ok(all.some((p) => p.id === 'PROP_UNSTAGE_SECRETS'));
  });
});
