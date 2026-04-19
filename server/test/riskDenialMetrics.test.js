import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

import { RISK_REASON_CODE } from '../src/constants/riskErrors.js';
import { getOpsMetricsSnapshot, resetOpsMetricsForTests } from '../src/lib/opsMetrics.js';
import { logRiskDecision } from '../src/services/risk/logRiskDecision.js';

describe('logRiskDecision metrics', () => {
  beforeEach(() => {
    resetOpsMetricsForTests();
  });

  it('increments deny counters on decision deny', () => {
    logRiskDecision(undefined, {
      route: 'POST /test',
      decision: 'deny',
      reasonCode: RISK_REASON_CODE.DUPLICATE_PATTERN,
      traceId: 't1',
    });
    const snap = getOpsMetricsSnapshot();
    assert.ok((snap.counters.risk_decision_deny_total ?? 0) >= 1);
    assert.ok(
      (snap.counters.risk_decision_deny_risk_duplicate_pattern ?? 0) >= 1,
      'per-reason deny counter',
    );
  });

  it('does not increment deny counters on allow', () => {
    logRiskDecision(undefined, {
      route: 'POST /test',
      decision: 'allow',
      reasonCode: null,
    });
    const snap = getOpsMetricsSnapshot();
    assert.equal(snap.counters.risk_decision_deny_total ?? 0, 0);
  });
});
