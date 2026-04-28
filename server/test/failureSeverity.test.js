import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FAILURE_CATEGORY_EXPLICIT } from '../src/services/reliability/failureModel.js';
import {
  FAILURE_SEVERITY,
  classifyFailureSeverityFromExplicitCategory,
  policyForSeverity,
  enrichReliabilityDecisionWithSeverity,
  mergePolicyForReliabilityOutcome,
  OPERATOR_SEVERITY_POLICY_REFERENCE,
} from '../src/services/reliability/failureSeverity.js';

describe('failureSeverity', () => {
  it('maps explicit categories to severities', () => {
    assert.equal(
      classifyFailureSeverityFromExplicitCategory(
        FAILURE_CATEGORY_EXPLICIT.NETWORK_FAILURE,
      ),
      FAILURE_SEVERITY.LOW_TRANSIENT,
    );
    assert.equal(
      classifyFailureSeverityFromExplicitCategory(
        FAILURE_CATEGORY_EXPLICIT.BUSINESS_FAILURE,
      ),
      FAILURE_SEVERITY.CRITICAL_TERMINAL,
    );
  });

  it('policyForSeverity blocks retry on critical terminal', () => {
    const p = policyForSeverity(FAILURE_SEVERITY.CRITICAL_TERMINAL);
    assert.equal(p.retry, false);
    assert.equal(p.terminal, true);
  });

  it('enrichReliabilityDecisionWithSeverity attaches policy on ok', () => {
    const d = enrichReliabilityDecisionWithSeverity({
      layer: 'test',
      outcome: 'ok',
    });
    assert.equal(d.failureSeverity, FAILURE_SEVERITY.LOW_TRANSIENT);
    assert.equal(d.policy.retry, true);
  });

  it('mergePolicyForReliabilityOutcome forces deny for circuit_open / outcome deny', () => {
    const p = policyForSeverity(FAILURE_SEVERITY.HIGH_REQUIRES_REVIEW);
    const merged = mergePolicyForReliabilityOutcome(
      { outcome: 'deny', reason: 'circuit_open' },
      p,
    );
    assert.equal(merged.deny, true);
    assert.equal(merged.retry, false);
    assert.equal(merged.manualReview, false);
  });

  it('enrichReliabilityDecisionWithSeverity applies deny policy for synthetic circuit errors', () => {
    const err = Object.assign(new Error('recharge_circuit_open'), {
      code: 'recharge_circuit_open',
    });
    const d = enrichReliabilityDecisionWithSeverity(
      {
        layer: 'reliability_orchestrator',
        outcome: 'deny',
        reason: 'circuit_open',
        circuit: 'recharge_provider',
      },
      err,
    );
    assert.equal(d.policy.deny, true);
    assert.equal(d.policy.retry, false);
  });

  it('OPERATOR_SEVERITY_POLICY_REFERENCE matches policyForSeverity for each tier', () => {
    for (const sev of Object.values(FAILURE_SEVERITY)) {
      assert.deepEqual(
        OPERATOR_SEVERITY_POLICY_REFERENCE[sev],
        policyForSeverity(sev),
      );
    }
  });
});
