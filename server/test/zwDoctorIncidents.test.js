/**
 * zw-doctor incident classifier tests.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertNoDangerousAutoRepair,
  classifyDoctorReport,
  classifyIncident,
  filterIncidentsForCiStatic,
  incidentSeverityRank,
  incidentsStrictExitCode,
  INCIDENT_TAXONOMY,
} from '../tools/zwDoctor/incidents.mjs';
import { invariant } from '../tools/zwDoctor/types.mjs';

describe('classifyIncident', () => {
  it('unpaid fulfillment -> CRITICAL', () => {
    const inc = classifyIncident({
      incidentId: 'UNPAID_FULFILLMENT_ATTEMPT',
      status: 'ACTIVE',
    });
    assert.equal(inc.severity, 'CRITICAL');
    assert.equal(inc.approval_required, true);
  });

  it('duplicate fulfillment -> CRITICAL', () => {
    const inc = classifyIncident({
      incidentId: 'DUPLICATE_FULFILLMENT_ATTEMPT',
      status: 'ACTIVE',
    });
    assert.equal(inc.severity, 'CRITICAL');
    assert.ok(inc.forbidden_actions.includes('second_fulfillment_dispatch'));
  });

  it('refund exists but incident not updated -> HIGH, approval required', () => {
    const inc = classifyIncident({
      incidentId: 'REFUND_EXISTS_INCIDENT_NOT_UPDATED',
      status: 'ACTIVE',
    });
    assert.equal(inc.severity, 'HIGH');
    assert.equal(inc.approval_required, true);
  });

  it('missing Stripe key -> MEDIUM', () => {
    const inc = classifyIncident({
      incidentId: 'STRIPE_KEY_MISSING_OR_MALFORMED',
      status: 'ACTIVE',
    });
    assert.equal(inc.severity, 'MEDIUM');
  });

  it('live key in test context -> CRITICAL', () => {
    const inc = classifyIncident({
      incidentId: 'STRIPE_LIVE_KEY_IN_TEST_CONTEXT',
      status: 'ACTIVE',
    });
    assert.equal(inc.severity, 'CRITICAL');
    assert.equal(inc.approval_required, true);
  });

  it('wrong deploy root -> HIGH', () => {
    const inc = classifyIncident({
      incidentId: 'WRONG_VERCEL_DEPLOY_ROOT',
      status: 'ACTIVE',
    });
    assert.equal(inc.severity, 'HIGH');
    assert.equal(inc.approval_required, true);
  });
});

describe('classifyDoctorReport', () => {
  it('classifies from runtime signals and invariants', () => {
    const report = {
      invariants: [
        invariant({
          id: 'DEPLOY_ROOT_IS_SERVER_API',
          status: 'BLOCKED',
          evidence: 'deploy_guard_fail',
        }),
      ],
      proposals: [],
    };
    const { incidents } = classifyDoctorReport(report, {
      unpaidWithFulfillment: true,
      duplicateFulfillment: false,
      refundExistsIncidentNotUpdated: true,
    });
    const ids = incidents.map((i) => i.id);
    assert.ok(ids.includes('UNPAID_FULFILLMENT_ATTEMPT'));
    assert.ok(ids.includes('REFUND_EXISTS_INCIDENT_NOT_UPDATED'));
    assert.ok(ids.includes('WRONG_VERCEL_DEPLOY_ROOT'));
  });

  it('JSON shape valid', () => {
    const { incidents, runbooks } = classifyDoctorReport(
      {
        invariants: [
          invariant({
            id: 'SECRETS_SCAN_CLEAN',
            status: 'CRITICAL',
            evidence: 'scan_fail',
          }),
        ],
        proposals: [],
      },
      {},
    );
    const json = JSON.stringify({ incidents, runbooks });
    const parsed = JSON.parse(json);
    assert.ok(Array.isArray(parsed.incidents));
    assert.equal(parsed.incidents[0].id, 'SECRETS_SCAN_FAILED');
    assert.equal(parsed.incidents[0].severity, 'CRITICAL');
    assert.ok(parsed.incidents[0].approval_required);
    assert.ok(Array.isArray(parsed.incidents[0].forbidden_actions));
  });
});

describe('assertNoDangerousAutoRepair', () => {
  it('no dangerous action auto-exec', () => {
    assert.doesNotThrow(() => assertNoDangerousAutoRepair('read_only_status_check'));
    assert.throws(() => assertNoDangerousAutoRepair('run l11-refund-execute now'));
  });
});

describe('incidentSeverityRank', () => {
  it('orders CRITICAL above LOW', () => {
    assert.ok(incidentSeverityRank('CRITICAL') > incidentSeverityRank('LOW'));
  });
});

describe('filterIncidentsForCiStatic', () => {
  it('suppresses missing Stripe key but keeps live key CRITICAL', () => {
    const filtered = filterIncidentsForCiStatic([
      classifyIncident({
        incidentId: 'STRIPE_KEY_MISSING_OR_MALFORMED',
        status: 'ACTIVE',
      }),
      classifyIncident({
        incidentId: 'STRIPE_LIVE_KEY_IN_TEST_CONTEXT',
        status: 'ACTIVE',
      }),
    ]);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 'STRIPE_LIVE_KEY_IN_TEST_CONTEXT');
  });

  it('ci-static strict gate passes without local Stripe key', () => {
    const incidents = [
      classifyIncident({
        incidentId: 'STRIPE_KEY_MISSING_OR_MALFORMED',
        status: 'ACTIVE',
      }),
    ];
    assert.equal(incidentsStrictExitCode(incidents, { ciStatic: true }), 0);
    assert.equal(incidentsStrictExitCode(incidents, { ciStatic: false }), 0);
  });

  it('ci-static strict gate fails on CRITICAL secrets scan', () => {
    const incidents = [
      classifyIncident({
        incidentId: 'SECRETS_SCAN_FAILED',
        status: 'ACTIVE',
      }),
    ];
    assert.equal(incidentsStrictExitCode(incidents, { ciStatic: true }), 1);
  });
});

describe('INCIDENT_TAXONOMY', () => {
  it('defines all money and system incident ids', () => {
    assert.ok(INCIDENT_TAXONOMY.UNPAID_FULFILLMENT_ATTEMPT);
    assert.ok(INCIDENT_TAXONOMY.CI_SUPER_SYSTEM_GUARD_FAILED);
    assert.ok(INCIDENT_TAXONOMY.FRONTEND_PAYMENT_CTA_INVALID);
  });
});
