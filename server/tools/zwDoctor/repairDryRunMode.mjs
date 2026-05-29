/**
 * zw-doctor `repair-dry-run` mode — CORE-08 safe repair dry-run from JSON fixture (no DB/API/apply).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { planSafeRepairDryRun } from '../../src/reliability/safeRepairDryRun/index.js';

/**
 * @param {{ fixturePath?: string, json?: boolean, strict?: boolean }} opts
 */
export async function runZwDoctorRepairDryRun(opts = {}) {
  if (!opts.fixturePath) {
    const msg = {
      error: 'repair_dry_run_requires_fixture',
      hint: 'node tools/zw-doctor.mjs repair-dry-run --fixture server/test/fixtures/safeRepairDryRun/sample-plans.json',
      dryRunOnly: true,
      applyAvailable: false,
      autoRepairApplyEnabled: false,
    };
    process.stderr.write(`${JSON.stringify(msg)}\n`);
    return { report: null, exitCode: 2 };
  }

  const path = resolve(opts.fixturePath);
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const report = planSafeRepairDryRun(raw);

  const payload = {
    ...report,
    safety: {
      ...report.safety,
      dry_run_only: true,
    },
    fixture: path,
  };

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stdout.write('\n========== zw-doctor repair-dry-run (CORE-08) ==========\n');
    process.stdout.write('mode=dry_run_only | apply NOT ENABLED | no DB | no external APIs\n\n');
    process.stdout.write(`verdict=${report.verdict} plans=${report.plans.length}\n\n`);
    for (const p of report.plans) {
      process.stdout.write(`[${p.severity}] ${p.planId} class=${p.repairClass}\n`);
      process.stdout.write(`  source=${p.sourceFindingId}\n`);
      process.stdout.write(`  → ${p.recommendedAction}\n`);
      if (p.approvalRequired) {
        process.stdout.write(`  approval phrase: ${p.operatorApprovalPhrase ?? 'required'}\n`);
      }
      process.stdout.write(`  rollback: ${p.rollbackPlan}\n\n`);
    }
  }

  let exitCode = 0;
  if (opts.strict === true) {
    if (report.verdict === 'FAIL') exitCode = 1;
    else if (report.verdict === 'WARN') exitCode = 2;
  }

  return { report: payload, exitCode };
}
