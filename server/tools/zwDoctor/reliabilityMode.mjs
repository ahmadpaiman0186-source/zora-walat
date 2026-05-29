/**
 * zw-doctor `reliability` mode — CORE-04 detect-only scan from JSON fixture (no DB/API).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  exitCodeForReliabilityReport,
  runReliabilityDetectOnlyScan,
} from '../../src/reliability/runtimeDoctor/index.js';

/**
 * @param {{ fixturePath?: string, json?: boolean, strict?: boolean }} opts
 */
export async function runZwDoctorReliability(opts = {}) {
  if (!opts.fixturePath) {
    const msg = {
      error: 'reliability_mode_requires_fixture',
      hint: 'node tools/zw-doctor.mjs reliability --fixture server/test/fixtures/runtimeDoctor/sample.json',
      detectOnly: true,
      autoRepairApplyEnabled: false,
    };
    process.stderr.write(`${JSON.stringify(msg)}\n`);
    return { report: null, exitCode: 2 };
  }

  const path = resolve(opts.fixturePath);
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const report = runReliabilityDetectOnlyScan(raw);

  const payload = {
    ...report,
    safety: {
      detect_only: true,
      auto_repair_apply_enabled: false,
      db_writes: false,
      external_api_calls: false,
      payment_mutations: false,
      provider_execution: false,
    },
    fixture: path,
  };

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stdout.write('\n========== zw-doctor reliability (CORE-04 detect-only) ==========\n');
    process.stdout.write(`verdict=${report.verdict} findings=${report.findings.length}\n`);
    process.stdout.write('safety: detect-only | no apply | no DB | no external APIs\n\n');
    for (const f of report.findings) {
      process.stdout.write(`[${f.severity}] ${f.id} fm=${f.fmId} class=${f.repairClass}\n`);
      process.stdout.write(`  → ${f.recommendation}\n`);
      if (f.entityId) process.stdout.write(`  entity: ${f.entityType ?? 'n/a'} …${String(f.entityId).slice(-12)}\n`);
      process.stdout.write('\n');
    }
  }

  return {
    report: payload,
    exitCode: exitCodeForReliabilityReport(report.verdict, opts.strict === true),
  };
}
