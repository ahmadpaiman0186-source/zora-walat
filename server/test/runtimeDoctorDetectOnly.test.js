/**
 * CORE-04 detect-only runtime doctor — pure unit tests (no DB, no env, no APIs).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { runReliabilityDetectOnlyScan, SCANNERS } from '../src/reliability/runtimeDoctor/index.js';
import {
  paidNoProviderAttempts,
  providerSuccessOrderProcessing,
  fulfilledNoReference,
  duplicateProviderReference,
  stalePendingOrder,
  ambiguousOnFulfilled,
  missingAudit,
  healthyOrder,
} from './fixtures/runtimeDoctor/snapshots.mjs';

function findingIds(report) {
  return new Set(report.findings.map((f) => f.id));
}

describe('CORE-04 runtime doctor scaffold', () => {
  it('registers eight scanners', () => {
    assert.equal(SCANNERS.length, 8);
  });

  it('report is always detect-only with mutation disabled', () => {
    const report = runReliabilityDetectOnlyScan(healthyOrder);
    assert.equal(report.detectOnly, true);
    assert.equal(report.autoRepairApplyEnabled, false);
    assert.equal(report.mode, 'detect_only');
    for (const f of report.findings) {
      assert.equal(f.mutationAllowed, false);
    }
  });
});

describe('fixture a — payment succeeded, provider missing', () => {
  it('raises paid-without-attempt finding', () => {
    const report = runReliabilityDetectOnlyScan(paidNoProviderAttempts);
    assert.ok(findingIds(report).has('CORE4-NPNS-001'));
    assert.equal(report.verdict, 'FAIL');
  });
});

describe('fixture b — provider success, order not completed', () => {
  it('raises provider-success mismatch', () => {
    const report = runReliabilityDetectOnlyScan(providerSuccessOrderProcessing);
    assert.ok(findingIds(report).has('CORE4-MIS-001'));
  });
});

describe('fixture c — fulfilled without provider reference', () => {
  it('raises provider proof finding', () => {
    const report = runReliabilityDetectOnlyScan(fulfilledNoReference);
    assert.ok(findingIds(report).has('CORE4-PRV-PRF-001'));
  });
});

describe('fixture d — duplicate provider reference', () => {
  it('raises duplicate provider reference', () => {
    const report = runReliabilityDetectOnlyScan(duplicateProviderReference);
    assert.ok(findingIds(report).has('CORE4-DUP-PRV-001'));
  });
});

describe('fixture e — stale pending order', () => {
  it('raises stale processing finding', () => {
    const report = runReliabilityDetectOnlyScan(stalePendingOrder);
    assert.ok(findingIds(report).has('CORE4-STALE-001'));
  });
});

describe('fixture f — ambiguous provider on fulfilled', () => {
  it('raises ambiguous fulfilled finding', () => {
    const report = runReliabilityDetectOnlyScan(ambiguousOnFulfilled);
    assert.ok(findingIds(report).has('CORE4-AMB-001'));
  });
});

describe('fixture g — missing audit', () => {
  it('raises missing audit finding', () => {
    const report = runReliabilityDetectOnlyScan(missingAudit);
    assert.ok(findingIds(report).has('CORE4-AUD-001'));
  });
});

describe('fixture h — healthy case', () => {
  it('PASS with no critical/high findings', () => {
    const report = runReliabilityDetectOnlyScan(healthyOrder);
    assert.equal(report.verdict, 'PASS');
    assert.equal(report.counts.critical, 0);
    assert.equal(report.counts.high, 0);
  });
});

describe('repair class safety', () => {
  it('never assigns Class D with mutationAllowed true', () => {
    const report = runReliabilityDetectOnlyScan({
      scanAt: '2026-05-29T12:00:00.000Z',
      environmentHints: {
        nodeEnv: 'production',
        reloadlySandbox: false,
        airtimeProvider: 'reloadly',
      },
      orders: [
        {
          orderId: 'ord_mock_prod',
          orderStatus: 'FULFILLED',
          fulfillmentAttempts: [
            {
              attemptId: 'a1',
              status: 'SUCCESS',
              providerKey: 'mock',
              providerReportedSuccess: true,
              providerReference: 'mock_1',
            },
          ],
          auditEvents: ['order_status_changed'],
        },
      ],
    });
    const d = report.findings.filter((f) => f.repairClass === 'D');
    assert.ok(d.length >= 1);
    for (const f of d) {
      assert.equal(f.mutationAllowed, false);
    }
  });
});
