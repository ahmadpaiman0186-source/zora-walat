#!/usr/bin/env node
/**
 * Strict release gate: runs server tests/proofs, Flutter analyze/test, production preflight.
 * Fail-closed: first failing step stops the chain (subsequent steps are marked skipped).
 *
 * Usage: npm --prefix server run release:gate
 *
 * Output: human summary on stderr-friendly console + final JSON line prefixed with RELEASE_GATE_JSON:
 * Also writes `server/release-gate-report.json` (gitignored recommended — add to .gitignore if missing).
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RELEASE_GATE_STEPS,
  buildReleaseGateReport,
} from '../src/lib/releaseGate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDir = join(__dirname, '..');
const repoRoot = join(serverDir, '..');

const isWin = process.platform === 'win32';

/**
 * @param {string} scriptName
 * @param {Record<string, string | undefined>} [envExtra] merged into `process.env` for the child only
 */
function runNpmScript(scriptName, envExtra = {}) {
  const cmd = isWin ? 'npm.cmd' : 'npm';
  const r = spawnSync(cmd, ['run', scriptName], {
    cwd: serverDir,
    stdio: 'inherit',
    env: { ...process.env, ...envExtra },
    /** Windows: spawn of `npm.cmd` without shell often fails with EINVAL (see soft-launch-gate). */
    shell: isWin,
  });
  const code = r.status === null ? (r.error ? 1 : 0) : r.status;
  return { exitCode: code, signal: r.signal ? String(r.signal) : null };
}

function runFlutter(args) {
  const r = spawnSync('flutter', args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
    shell: isWin,
  });
  const code = r.status === null ? (r.error ? 1 : 0) : r.status;
  return { exitCode: code, signal: r.signal ? String(r.signal) : null };
}

/** @type {import('../src/lib/releaseGate.js').ReleaseGateStepResult[]} */
const results = [];
let aborted = false;

for (const step of RELEASE_GATE_STEPS) {
  if (aborted) {
    results.push({
      id: step.id,
      status: 'skipped',
      exitCode: null,
      durationMs: 0,
      signal: 'prior_step_failed',
    });
    continue;
  }

  const t0 = Date.now();
  let exitCode = 0;
  let signal = null;

  if (step.kind === 'npm') {
    if (!step.script) throw new Error(`release gate: missing npm script for ${step.id}`);
    console.log(`\n━━━ Release gate ▶ ${step.label} (${step.script}) ━━━\n`);
    const envExtra =
      step.id === 'preflight_production'
        ? { ZW_PRODUCTION_PREFLIGHT_SYNTHETIC_OWNER_GATE: 'true' }
        : {};
    const r = runNpmScript(step.script, envExtra);
    exitCode = r.exitCode;
    signal = r.signal;
  } else if (step.kind === 'flutter') {
    const args = step.args ?? [];
    console.log(`\n━━━ Release gate ▶ ${step.label} (flutter ${args.join(' ')}) ━━━\n`);
    const r = runFlutter(args);
    exitCode = r.exitCode;
    signal = r.signal;
  } else {
    throw new Error(`release gate: unknown step kind for ${step.id}`);
  }

  const durationMs = Date.now() - t0;
  const passed = exitCode === 0;
  results.push({
    id: step.id,
    status: passed ? 'passed' : 'failed',
    exitCode,
    durationMs,
    ...(signal ? { signal } : {}),
  });

  if (!passed) {
    aborted = true;
  }
}

const report = buildReleaseGateReport(RELEASE_GATE_STEPS, results);

try {
  writeFileSync(
    join(serverDir, 'release-gate-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
} catch {
  /* ignore write errors (read-only FS in some CI) */
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log(
  report.summary
    ? `Steps: ${report.summary.passed}/${report.summary.totalSteps} passed, ${report.summary.failed} failed, ${report.summary.skipped} skipped`
    : '',
);
console.log(report.ok ? 'GO: all automated release-gate steps passed.' : 'NO-GO: one or more steps failed.');
if (report.failingSteps.length) {
  console.log('Failing step ids:', report.failingSteps.join(', '));
}
if (report.skippedSteps?.length) {
  console.log('Skipped step ids (not run after failure):', report.skippedSteps.join(', '));
}
console.log('Blocker summary (by domain):');
for (const [cat, arr] of Object.entries(report.blockers)) {
  if (arr.length) console.log(`  ${cat}:`, arr.map((x) => x.stepId).join(', '));
}
console.log('Manual checklist items:', report.manualChecklist.length, '(operator confirmation required)');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('RELEASE_GATE_JSON:', JSON.stringify(report));

process.exit(report.ok ? 0 : 1);
