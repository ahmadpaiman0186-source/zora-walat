#!/usr/bin/env node
/**
 * Final soft-launch readiness gate: release:gate + Stripe/Reloadly preflights + live simulation proof.
 * No Stripe charges and no Reloadly POST /topups from this script (sub-proofs use test/sandbox paths only).
 *
 * Usage: npm --prefix server run soft-launch:gate
 *
 * Writes `server/soft-launch-gate-report.json` when the filesystem allows.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SOFT_LAUNCH_GATE_SCHEMA,
  SOFT_LAUNCH_GATE_VERSION,
  SOFT_LAUNCH_MANUAL_CHECKLIST,
} from '../src/lib/softLaunchGate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDir = join(__dirname, '..');
const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';

/**
 * @param {string} stdout
 * @returns {object | null}
 */
function extractJsonWithOkField(stdout) {
  const s = String(stdout ?? '');
  /** @type {number[]} */
  const starts = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{') starts.push(i);
  }
  for (let j = starts.length - 1; j >= 0; j--) {
    const start = starts[j];
    try {
      const o = JSON.parse(s.slice(start));
      if (o && typeof o === 'object' && typeof o.ok === 'boolean') return o;
    } catch {
      /* continue */
    }
  }
  return null;
}

/**
 * @param {string} script
 * @param {{ inheritAll?: boolean }} [opts]
 */
function runNpm(script, opts = {}) {
  const r = spawnSync(npm, ['run', script], {
    cwd: serverDir,
    env: process.env,
    encoding: 'utf8',
    stdio: opts.inheritAll ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    /** Windows: spawn of `npm.cmd` without shell often fails with EINVAL; matches release-gate Flutter pattern. */
    shell: isWin,
  });
  const exitCode = r.status === null ? 1 : r.status;
  const stdout = typeof r.stdout === 'string' ? r.stdout : '';
  const stderr = typeof r.stderr === 'string' ? r.stderr : '';
  return { exitCode, stdout, stderr };
}

/** @type {string[]} */
const blockers = [];
/** @type {string[]} */
const warnings = [];

console.log('\n═══════════════════════════════════════════════════════════');
console.log('Soft-launch gate — running release:gate …');
console.log('═══════════════════════════════════════════════════════════\n');

const releaseRun = runNpm('release:gate', { inheritAll: true });

/** @type {Record<string, unknown> | null} */
let releaseReport = null;
try {
  releaseReport = JSON.parse(
    readFileSync(join(serverDir, 'release-gate-report.json'), 'utf8'),
  );
} catch {
  releaseReport = null;
}

if (releaseRun.exitCode !== 0) {
  const hasStructuredRelease = blockers.some((b) => b.startsWith('release:gate:'));
  if (!hasStructuredRelease) {
    blockers.push(`release:gate: npm exited ${releaseRun.exitCode}`);
  }
}

if (!releaseReport) {
  if (releaseRun.exitCode !== 0) {
    blockers.push(
      'soft_launch:release_gate: could not read server/release-gate-report.json after failure',
    );
  } else {
    warnings.push(
      'soft_launch:release_gate: exit 0 but release-gate-report.json missing — verify release:gate writes the report',
    );
  }
} else if (!releaseReport.ok) {
  for (const [cat, arr] of Object.entries(releaseReport.blockers ?? {})) {
    for (const e of arr) {
      blockers.push(
        `release:gate:${cat}:${e.stepId} (${e.label ?? 'step'} exit=${e.exitCode})`,
      );
    }
  }
  if (blockers.filter((b) => b.startsWith('release:gate:')).length === 0) {
    blockers.push('release:gate: failed (see console output above)');
  }
}

function runPreflightStep(script, stepId) {
  console.log(`\nSoft-launch gate ▶ ${script} …\n`);
  const r = runNpm(script);
  const j = extractJsonWithOkField(r.stdout);
  const ok = r.exitCode === 0 && Boolean(j?.ok);
  if (r.exitCode !== 0) {
    blockers.push(`${stepId}: npm exited ${r.exitCode}`);
  }
  if (!j) {
    if (r.exitCode === 0) {
      warnings.push(`${stepId}: could not parse JSON from stdout (check script output)`);
    }
  } else {
    for (const b of j.blockers ?? []) {
      blockers.push(`${stepId}: ${b}`);
    }
    for (const w of j.warnings ?? []) {
      warnings.push(`${stepId}: ${w}`);
    }
  }
  return {
    id: stepId,
    exitCode: r.exitCode,
    ok,
    summary: j
      ? {
          ok: j.ok,
          blockerCount: (j.blockers ?? []).length,
          warningCount: (j.warnings ?? []).length,
        }
      : null,
  };
}

const preflightStripe = runPreflightStep('preflight:stripe-live', 'preflight:stripe-live');
const preflightReloadly = runPreflightStep(
  'preflight:reloadly-live',
  'preflight:reloadly-live',
);

console.log('\nSoft-launch gate ▶ proof:live-simulation-local …\n');
const liveRun = runNpm('proof:live-simulation-local');
const liveJson = extractJsonWithOkField(liveRun.stdout);
const liveOk = liveRun.exitCode === 0 && Boolean(liveJson?.ok);
if (liveRun.exitCode !== 0) {
  blockers.push(`proof:live-simulation-local: npm exited ${liveRun.exitCode}`);
}
if (!liveJson) {
  if (liveRun.exitCode === 0) {
    warnings.push(
      'proof:live-simulation-local: could not parse JSON from stdout (check script output)',
    );
  }
} else {
  for (const b of liveJson.blockers ?? []) {
    blockers.push(`proof:live-simulation-local: ${b}`);
  }
  for (const w of liveJson.warnings ?? []) {
    warnings.push(`proof:live-simulation-local: ${w}`);
  }
  if (liveJson.ok === false && liveJson.error) {
    blockers.push(`proof:live-simulation-local: ${liveJson.error}`);
  }
}

const uniqueBlockers = [...new Set(blockers)];
const uniqueWarnings = [...new Set(warnings)];

const releaseGateStepOk =
  releaseRun.exitCode === 0 &&
  (releaseReport == null || releaseReport.ok === true);

const gateOk =
  releaseGateStepOk &&
  preflightStripe.ok &&
  preflightReloadly.ok &&
  liveOk;

const report = {
  ok: gateOk,
  schema: SOFT_LAUNCH_GATE_SCHEMA,
  version: SOFT_LAUNCH_GATE_VERSION,
  generatedAt: new Date().toISOString(),
  blockers: uniqueBlockers,
  warnings: uniqueWarnings,
  manualOperatorChecklist: SOFT_LAUNCH_MANUAL_CHECKLIST.map((c) => ({
    id: c.id,
    label: c.label,
    domain: c.domain,
    operatorConfirmRequired: true,
  })),
  steps: {
    releaseGate: {
      id: 'release_gate',
      exitCode: releaseRun.exitCode,
      ok: releaseGateStepOk,
      summary: releaseReport?.summary ?? null,
      failingSteps: releaseReport?.failingSteps ?? null,
    },
    preflightStripeLive: preflightStripe,
    preflightReloadlyLive: preflightReloadly,
    proofLiveSimulationLocal: {
      id: 'proof_live_simulation_local',
      exitCode: liveRun.exitCode,
      ok: liveOk,
      traceId: liveJson?.traceId ?? null,
    },
  },
};

try {
  writeFileSync(
    join(serverDir, 'soft-launch-gate-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
} catch {
  /* ignore */
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log(gateOk ? 'GO: soft-launch gate passed.' : 'NO-GO: soft-launch gate failed.');
console.log('═══════════════════════════════════════════════════════════\n');
// eslint-disable-next-line no-console -- CLI contract
console.log(JSON.stringify(report, null, 2));
// eslint-disable-next-line no-console -- CLI contract
console.log('\nSOFT_LAUNCH_GATE_JSON:', JSON.stringify(report));

process.exit(gateOk ? 0 : 1);
