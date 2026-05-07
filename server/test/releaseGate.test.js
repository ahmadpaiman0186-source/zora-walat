import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  RELEASE_GATE_STEPS,
  RELEASE_GATE_MANUAL_CHECKLIST,
  buildReleaseGateReport,
} from '../src/lib/releaseGate.js';

function r(id, status, exitCode = 0, durationMs = 1) {
  return { id, status, exitCode, durationMs };
}

test('buildReleaseGateReport passes only when no step failed', () => {
  const allPass = RELEASE_GATE_STEPS.map((s) => r(s.id, 'passed'));
  const rep = buildReleaseGateReport(RELEASE_GATE_STEPS, allPass);
  assert.equal(rep.ok, true);
  assert.equal(rep.summary.totalSteps, 13);
  assert.equal(rep.summary.passed, 13);
  assert.equal(rep.summary.failed, 0);
  assert.equal(rep.summary.skipped, 0);
  assert.deepEqual(rep.failingSteps, []);
  assert.deepEqual(rep.skippedSteps, []);
  for (const [, arr] of Object.entries(rep.blockers)) {
    assert.equal(arr.length, 0);
  }
});

test('buildReleaseGateReport fails closed on first failed step category', () => {
  const results = RELEASE_GATE_STEPS.map((s, i) =>
    i === 0 ? r(s.id, 'failed', 1) : r(s.id, 'skipped', null, 0),
  );
  const rep = buildReleaseGateReport(RELEASE_GATE_STEPS, results);
  assert.equal(rep.ok, false);
  assert.deepEqual(rep.failingSteps, ['unit_tests']);
  assert.equal(rep.summary.failed, 1);
  assert.ok(rep.summary.skipped > 0);
  assert.ok(rep.skippedSteps.length > 0);
  assert.ok(rep.blockers.infra.some((b) => b.stepId === 'unit_tests'));
});

test('payment failure is bucketed under payment blockers', () => {
  const results = RELEASE_GATE_STEPS.map((s) =>
    s.id === 'proof_stripe_webhook_local'
      ? r(s.id, 'failed', 2)
      : r(s.id, 'passed'),
  );
  const rep = buildReleaseGateReport(RELEASE_GATE_STEPS, results);
  assert.equal(rep.ok, false);
  assert.deepEqual(rep.failingSteps, ['proof_stripe_webhook_local']);
  assert.ok(rep.blockers.payment.some((b) => b.stepId === 'proof_stripe_webhook_local'));
});

test('release gate step list includes all required commands', () => {
  const ids = new Set(RELEASE_GATE_STEPS.map((s) => s.id));
  assert.ok(ids.has('unit_tests'));
  assert.ok(ids.has('integration_tests'));
  assert.ok(ids.has('verify_local_pricing'));
  assert.ok(ids.has('proof_stripe_webhook_local'));
  assert.ok(ids.has('proof_reloadly_dry_run'));
  assert.ok(ids.has('proof_reconciliation_local'));
  assert.ok(ids.has('proof_audit_trail_local'));
  assert.ok(ids.has('proof_fraud_controls_local'));
  assert.ok(ids.has('proof_observability_local'));
  assert.ok(ids.has('proof_self_healing_local'));
  assert.ok(ids.has('preflight_production'));
  assert.ok(ids.has('flutter_analyze'));
  assert.ok(ids.has('flutter_test'));
  assert.equal(RELEASE_GATE_STEPS.length, 13);
});

test('manual checklist covers launch domains', () => {
  const domains = new Set(RELEASE_GATE_MANUAL_CHECKLIST.map((c) => c.domain));
  assert.ok(domains.has('payment'));
  assert.ok(domains.has('security'));
  assert.ok(domains.has('fulfillment'));
  assert.ok(domains.has('infra'));
});

test('buildReleaseGateReport throws on length mismatch', () => {
  assert.throws(() => buildReleaseGateReport(RELEASE_GATE_STEPS, []), /length mismatch/);
});

test('buildReleaseGateReport throws on step id mismatch', () => {
  const bad = RELEASE_GATE_STEPS.map((s) => r(s.id, 'passed'));
  bad[2] = r('wrong_id', 'passed');
  assert.throws(() => buildReleaseGateReport(RELEASE_GATE_STEPS, bad), /id mismatch/);
});
