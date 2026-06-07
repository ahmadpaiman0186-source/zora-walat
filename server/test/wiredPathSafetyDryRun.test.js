/**
 * L-77 wired-path safety dry-run harness — local simulation tests (no DB, no network).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  runWiredPathSafetyDryRun,
  runWiredPathSafetyDryRunBatch,
  WIRED_PATH_DRY_RUN_SCHEMA_VERSION,
} from '../src/reliability/wiredPathSafetyDryRun/index.js';
import {
  allWiredPathScenarios,
  ambiguousProviderFailClosed,
  duplicateProviderDispatchBlocked,
  duplicateWebhookBlocksFulfillment,
  healthyWiredPathFirstWebhook,
  missingKeyFailClosed,
  unpaidWebhookBlocksFulfillment,
} from './fixtures/wiredPathSafetyDryRun/scenarios.mjs';

function assertNoSideEffects(report) {
  assert.equal(report.mutations.stripe, false);
  assert.equal(report.mutations.provider, false);
  assert.equal(report.mutations.payment, false);
  assert.equal(report.mutations.webhook, false);
  assert.equal(report.mutations.db, false);
  assert.equal(report.mutations.fulfillmentScheduled, false);
  assert.equal(report.safety.dry_run_only, true);
  assert.equal(report.safety.network_access, false);
  assert.equal(report.safety.db_writes, false);
  assert.equal(report.productionProof, false);
  assert.equal(report.wiredSimulation, true);
  assert.equal(report.idempotencyDecision.mutationAllowed, false);
  assert.equal(report.deliveryDecision.mutationAllowed, false);
}

describe('L-77 wired-path dry-run harness scaffold', () => {
  it('report is local simulation only with apply disabled', () => {
    const report = runWiredPathSafetyDryRun(healthyWiredPathFirstWebhook);
    assert.equal(report.schemaVersion, WIRED_PATH_DRY_RUN_SCHEMA_VERSION);
    assert.equal(report.mode, 'local_wired_path_simulation_dry_run');
    assert.equal(report.classifyOnly, true);
    assertNoSideEffects(report);
  });
});

describe('healthy wired path — first webhook', () => {
  it('allows fulfillment intent in dry-run when idempotency and NPNS pass', () => {
    const report = runWiredPathSafetyDryRun(healthyWiredPathFirstWebhook);
    assert.equal(report.idempotencyDecision.decision, 'ALLOW');
    assert.equal(report.deliveryDecision.decision, 'ALLOW_DELIVERY');
    assert.equal(report.fulfillmentIntentAllowed, true);
    assertNoSideEffects(report);
  });
});

describe('unpaid webhook — no fulfillment', () => {
  it('blocks fulfillment intent when payment proof missing', () => {
    const report = runWiredPathSafetyDryRun(unpaidWebhookBlocksFulfillment);
    assert.notEqual(report.deliveryDecision.decision, 'ALLOW_DELIVERY');
    assert.equal(report.fulfillmentIntentAllowed, false);
    assertNoSideEffects(report);
  });
});

describe('duplicate webhook replay', () => {
  it('blocks duplicate fulfillment intent', () => {
    const report = runWiredPathSafetyDryRun(duplicateWebhookBlocksFulfillment);
    assert.equal(report.idempotencyDecision.decision, 'BLOCK_DUPLICATE');
    assert.equal(report.fulfillmentIntentAllowed, false);
    assertNoSideEffects(report);
  });
});

describe('duplicate provider dispatch', () => {
  it('blocks duplicate fulfillment intent after prior success', () => {
    const report = runWiredPathSafetyDryRun(duplicateProviderDispatchBlocked);
    assert.equal(report.idempotencyDecision.decision, 'BLOCK_DUPLICATE');
    assert.equal(report.fulfillmentIntentAllowed, false);
    assertNoSideEffects(report);
  });
});

describe('missing idempotency key material', () => {
  it('fail-closed — no fulfillment intent', () => {
    const report = runWiredPathSafetyDryRun(missingKeyFailClosed);
    assert.notEqual(report.idempotencyDecision.decision, 'ALLOW');
    assert.equal(report.fulfillmentIntentAllowed, false);
    assertNoSideEffects(report);
  });
});

describe('ambiguous provider state', () => {
  it('fail-closed — no fulfillment intent', () => {
    const report = runWiredPathSafetyDryRun(ambiguousProviderFailClosed);
    assert.notEqual(report.deliveryDecision.decision, 'ALLOW_DELIVERY');
    assert.equal(report.fulfillmentIntentAllowed, false);
    assertNoSideEffects(report);
  });
});

describe('batch scenario expectations', () => {
  it('all fixtures match expected fulfillment gate outcomes', () => {
    const reports = runWiredPathSafetyDryRunBatch(allWiredPathScenarios);
    assert.equal(reports.length, allWiredPathScenarios.length);
    for (let i = 0; i < reports.length; i++) {
      const scenario = allWiredPathScenarios[i];
      const report = reports[i];
      assert.equal(report.scenarioId, scenario.scenarioId);
      assert.equal(
        report.fulfillmentIntentAllowed,
        scenario.expectedFulfillmentIntentAllowed,
        scenario.scenarioId,
      );
      assertNoSideEffects(report);
    }
  });
});
