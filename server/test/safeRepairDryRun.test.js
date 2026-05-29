/**
 * CORE-08 safe repair dry-run engine — pure unit tests (no DB, no env, no APIs).
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = join(__dirname, '..');

import {
  planSafeRepairDryRun,
  REPAIR_CLASS,
  CORE08_APPROVAL_PHRASE,
} from '../src/reliability/safeRepairDryRun/index.js';
import {
  missingAuditMetadata,
  stalePendingOrder,
  paidProviderMissing,
  providerTimeoutAmbiguous,
  duplicateProviderExecution,
  missingIdempotencyKey,
  completedWithoutProviderProof,
  refundCandidate,
  walletCorrectionCandidate,
  cleanNoRepair,
} from './fixtures/safeRepairDryRun/inputs.mjs';

function assertDryRunOnly(plan) {
  assert.equal(plan.mutationAllowed, false);
  assert.equal(plan.applyAvailable, false);
}

describe('CORE-08 dry-run scaffold', () => {
  it('report is dry-run only with apply disabled', () => {
    const report = planSafeRepairDryRun(missingAuditMetadata);
    assert.equal(report.dryRunOnly, true);
    assert.equal(report.autoRepairApplyEnabled, false);
    assert.equal(report.mode, 'dry_run_only');
    assert.equal(report.safety.apply_available, false);
  });
});

describe('fixture a — missing audit metadata', () => {
  it('Class B metadata candidate only', () => {
    const report = planSafeRepairDryRun(missingAuditMetadata);
    assert.equal(report.plans.length, 1);
    const p = report.plans[0];
    assertDryRunOnly(p);
    assert.equal(p.repairClass, REPAIR_CLASS.B_METADATA_CANDIDATE);
    assert.equal(p.approvalRequired, false);
  });
});

describe('fixture b — stale pending order', () => {
  it('Class B stale flag candidate', () => {
    const report = planSafeRepairDryRun(stalePendingOrder);
    assert.equal(report.plans[0].repairClass, REPAIR_CLASS.B_METADATA_CANDIDATE);
    assertDryRunOnly(report.plans[0]);
  });
});

describe('fixture c — payment succeeded, provider missing', () => {
  it('Class C approval required', () => {
    const report = planSafeRepairDryRun(paidProviderMissing);
    const p = report.plans[0];
    assert.equal(p.repairClass, REPAIR_CLASS.C_APPROVAL_REQUIRED_FINANCIAL_PROVIDER);
    assert.equal(p.approvalRequired, true);
    assert.equal(p.operatorApprovalPhrase, CORE08_APPROVAL_PHRASE);
    assertDryRunOnly(p);
  });
});

describe('fixture d — provider timeout/ambiguous', () => {
  it('Class C approval required', () => {
    const report = planSafeRepairDryRun(providerTimeoutAmbiguous);
    assert.equal(
      report.plans[0].repairClass,
      REPAIR_CLASS.C_APPROVAL_REQUIRED_FINANCIAL_PROVIDER,
    );
    assertDryRunOnly(report.plans[0]);
  });
});

describe('fixture e — duplicate provider execution risk', () => {
  it('Class D forbidden', () => {
    const report = planSafeRepairDryRun(duplicateProviderExecution);
    assert.equal(report.plans[0].repairClass, REPAIR_CLASS.D_FORBIDDEN);
    assertDryRunOnly(report.plans[0]);
  });
});

describe('fixture f — missing idempotency key', () => {
  it('Class D forbidden for auto-repair', () => {
    const report = planSafeRepairDryRun(missingIdempotencyKey);
    assert.equal(report.plans[0].repairClass, REPAIR_CLASS.D_FORBIDDEN);
    assertDryRunOnly(report.plans[0]);
  });
});

describe('fixture g — completed without provider proof', () => {
  it('Class C fail-closed approval path', () => {
    const report = planSafeRepairDryRun(completedWithoutProviderProof);
    const p = report.plans[0];
    assert.equal(p.repairClass, REPAIR_CLASS.C_APPROVAL_REQUIRED_FINANCIAL_PROVIDER);
    assert.ok(p.evidenceRequiredBeforeApply.length > 0);
    assertDryRunOnly(p);
  });
});

describe('fixture h — refund candidate', () => {
  it('Class C approval required', () => {
    const report = planSafeRepairDryRun(refundCandidate);
    assert.equal(
      report.plans[0].repairClass,
      REPAIR_CLASS.C_APPROVAL_REQUIRED_FINANCIAL_PROVIDER,
    );
    assertDryRunOnly(report.plans[0]);
  });
});

describe('fixture i — wallet correction candidate', () => {
  it('Class C approval required', () => {
    const report = planSafeRepairDryRun(walletCorrectionCandidate);
    assert.equal(
      report.plans[0].repairClass,
      REPAIR_CLASS.C_APPROVAL_REQUIRED_FINANCIAL_PROVIDER,
    );
    assertDryRunOnly(report.plans[0]);
  });
});

describe('fixture j — clean no-repair case', () => {
  it('empty plans PASS', () => {
    const report = planSafeRepairDryRun(cleanNoRepair);
    assert.equal(report.plans.length, 0);
    assert.equal(report.verdict, 'PASS');
  });
});

describe('mutationAllowed and applyAvailable safety', () => {
  it('false on all fixture plans', () => {
    const inputs = [
      missingAuditMetadata,
      stalePendingOrder,
      paidProviderMissing,
      providerTimeoutAmbiguous,
      duplicateProviderExecution,
      missingIdempotencyKey,
      completedWithoutProviderProof,
      refundCandidate,
      walletCorrectionCandidate,
    ];
    for (const input of inputs) {
      for (const p of planSafeRepairDryRun(input).plans) {
        assertDryRunOnly(p);
        assert.ok(Array.isArray(p.evidenceRequiredBeforeApply));
        assert.ok(p.rollbackPlan);
      }
    }
  });
});

describe('CLI --apply rejected', () => {
  it('zw-doctor exits 2 when --apply passed', () => {
    const r = spawnSync(
      process.execPath,
      ['tools/zw-doctor.mjs', 'repair-dry-run', '--apply'],
      { cwd: SERVER_ROOT, encoding: 'utf8' },
    );
    assert.equal(r.status, 2);
    assert.match(r.stderr ?? '', /apply is forbidden/i);
  });
});

describe('provider retry after ambiguous', () => {
  it('Class D forbidden', () => {
    const report = planSafeRepairDryRun({
      idempotencyDecisions: [
        {
          code: 'CORE5-RETRY-UNSAFE-001',
          decision: 'RETRY_UNSAFE',
          severity: 'high',
          invariantIds: ['INV-01'],
          requiredNextAction: 'manual',
          mutationAllowed: false,
        },
      ],
    });
    assert.equal(report.plans[0].repairClass, REPAIR_CLASS.D_FORBIDDEN);
    assertDryRunOnly(report.plans[0]);
  });
});
