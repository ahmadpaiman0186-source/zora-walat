#!/usr/bin/env node
/**
 * L-77 wired-path safety dry-run CLI — local simulation only.
 * No Stripe, provider APIs, webhooks, DB, env, or production runtime.
 */
import { runWiredPathSafetyDryRunBatch } from '../src/reliability/wiredPathSafetyDryRun/index.js';
import { allWiredPathScenarios } from '../test/fixtures/wiredPathSafetyDryRun/scenarios.mjs';

const json = process.argv.includes('--json');
const reports = runWiredPathSafetyDryRunBatch(allWiredPathScenarios);

let failed = 0;
for (const report of reports) {
  const scenario = allWiredPathScenarios.find((s) => s.scenarioId === report.scenarioId);
  const expected = scenario?.expectedFulfillmentIntentAllowed;
  const pass = report.fulfillmentIntentAllowed === expected;
  if (!pass) failed += 1;
}

if (json) {
  process.stdout.write(
    `${JSON.stringify({ reports, failed, total: reports.length }, null, 2)}\n`,
  );
} else {
  process.stdout.write('\n========== L-77 wired-path safety dry-run harness ==========\n');
  process.stdout.write(
    'mode=local_wired_path_simulation_dry_run | CORE-05+CORE-06 | no network | no DB\n\n',
  );
  for (const report of reports) {
    process.stdout.write(`scenario=${report.scenarioId}\n`);
    process.stdout.write(`  boundary=${report.boundary}\n`);
    process.stdout.write(
      `  idempotency=${report.idempotencyDecision.decision} (${report.idempotencyDecision.code})\n`,
    );
    process.stdout.write(
      `  delivery=${report.deliveryDecision.decision} (${report.deliveryDecision.code})\n`,
    );
    process.stdout.write(`  fulfillmentIntentAllowed=${report.fulfillmentIntentAllowed}\n`);
    process.stdout.write(
      `  mutations=none (stripe=${report.mutations.stripe} provider=${report.mutations.provider} db=${report.mutations.db})\n\n`,
    );
  }
  process.stdout.write(`scenarios=${reports.length} failed_expectations=${failed}\n\n`);
}

process.exit(failed > 0 ? 1 : 0);
