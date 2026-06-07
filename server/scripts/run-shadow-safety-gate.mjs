#!/usr/bin/env node
/**
 * L-78 shadow safety gate CLI — handler-shaped local simulation only.
 */
import { evaluateShadowSafetyGateBatch } from '../src/reliability/shadowSafetyGate/index.js';
import { allShadowScenarios } from '../test/fixtures/shadowSafetyGate/scenarios.mjs';

const json = process.argv.includes('--json');
const reports = evaluateShadowSafetyGateBatch(allShadowScenarios);

let failed = 0;
for (const report of reports) {
  const scenario = allShadowScenarios.find((s) => s.scenarioId === report?.scenarioId);
  if (!report || report.fulfillmentIntentAllowed !== scenario?.expectedFulfillmentIntentAllowed) {
    failed += 1;
  }
}

if (json) {
  process.stdout.write(`${JSON.stringify({ reports, failed, total: reports.length }, null, 2)}\n`);
} else {
  process.stdout.write('\n========== L-78 shadow safety gate harness ==========\n');
  process.stdout.write('mode=code_only_shadow_safety_gate | no live route | no network | no DB\n\n');
  for (const report of reports) {
    if (!report) continue;
    process.stdout.write(`scenario=${report.scenarioId}\n`);
    process.stdout.write(`  boundary=${report.boundary}\n`);
    process.stdout.write(
      `  idempotency=${report.wiredPathReport.idempotencyDecision.decision}\n`,
    );
    process.stdout.write(`  delivery=${report.wiredPathReport.deliveryDecision.decision}\n`);
    process.stdout.write(`  fulfillmentIntentAllowed=${report.fulfillmentIntentAllowed}\n`);
    process.stdout.write(`  wouldScheduleFulfillment=${report.wouldScheduleFulfillment}\n\n`);
  }
  process.stdout.write(`scenarios=${reports.length} failed_expectations=${failed}\n\n`);
}

process.exit(failed > 0 ? 1 : 0);
