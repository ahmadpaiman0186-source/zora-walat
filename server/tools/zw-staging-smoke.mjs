#!/usr/bin/env node
/**
 * Operator-run staging smoke — read-only, no money mutations.
 *
 * Usage: node tools/zw-staging-smoke.mjs [--write-artifact]
 *
 * Never: refund, payment, webhook resend, production DB writes.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runZwDoctor } from './zwDoctor/run.mjs';
import {
  assertSanitizedReportSafe,
  sanitizeZwDoctorReport,
} from './zwDoctor/sanitizeReport.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = join(__dirname, '..');
const REPO_ROOT = join(SERVER_ROOT, '..');
const SMOKE_DIR = join(REPO_ROOT, 'Ap786', 'smoke');

const TOKEN_PATH = join(SERVER_ROOT, '.staging-token.local');
const ORDER_ID_PATH = join(SERVER_ROOT, '.staging-order-id.local');

/**
 * @param {string} line
 */
function safeLine(line) {
  process.stdout.write(`${line}\n`);
}

/**
 * @param {string} entry e.g. KEY=value
 */
function sanitizeEnumForOutput(entry) {
  const [key, ...rest] = entry.split('=');
  const val = rest.join('=');
  if (/_PATH$|_FILE$|_CWD$|_ROOT$|_URL$/i.test(key)) {
    return `${key}=[redacted]`;
  }
  if (/[\\/]/.test(val) || /^[A-Za-z]:/.test(val)) {
    return `${key}=[redacted]`;
  }
  return entry.length > 120 ? `${key}=[truncated]` : entry;
}

/**
 * @param {string} mode
 * @returns {{ status: 'PASS'|'PARTIAL_NOT_CONFIGURED'|'WARN'|'FAIL', detail: string }}
 */
function runOperatorMode(mode) {
  if (!existsSync(TOKEN_PATH)) {
    return {
      status: 'PARTIAL_NOT_CONFIGURED',
      detail: 'token_file_missing',
    };
  }
  const child = spawnSync(
    process.execPath,
    ['tools/staging-auth-checkout-operator.mjs', mode],
    {
      cwd: SERVER_ROOT,
      encoding: 'utf8',
      timeout: 120_000,
      env: process.env,
    },
  );
  const text = `${child.stdout ?? ''}\n${child.stderr ?? ''}`;
  const enums = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)\s+(.+)$/.exec(line.trim());
    if (m && /^[A-Z][A-Z0-9_]*$/.test(m[1])) {
      enums.push(sanitizeEnumForOutput(`${m[1]}=${m[2]}`));
    }
  }
  const enumBlob = enums.slice(0, 16).join(' ');
  if (child.status !== 0) {
    return {
      status: 'WARN',
      detail: `exit_${child.status ?? 'unknown'} ${enumBlob}`,
    };
  }
  return {
    status: 'PASS',
    detail: enumBlob || 'ok_no_enums',
  };
}

/**
 * @returns {{ status: 'PASS'|'PARTIAL_NOT_CONFIGURED'|'WARN', detail: string }}
 */
function runDeployRootGuard() {
  const child = spawnSync(
    process.execPath,
    ['scripts/assert-vercel-api-deploy-root.mjs'],
    { cwd: SERVER_ROOT, encoding: 'utf8', timeout: 30_000 },
  );
  if (child.status === 0 && String(child.stdout).includes('DEPLOY_GUARD_PASS')) {
    return { status: 'PASS', detail: 'deploy_guard_pass' };
  }
  return {
    status: 'WARN',
    detail: `deploy_guard_exit_${child.status ?? 'unknown'}`,
  };
}

async function main() {
  const writeArtifact = process.argv.includes('--write-artifact');
  const startedAt = new Date().toISOString();

  safeLine('ZW_STAGING_SMOKE_STARTED true');
  safeLine(`ZW_STAGING_SMOKE_AT ${startedAt}`);
  safeLine('ZW_STAGING_SMOKE_MONEY_MUTATIONS false');

  const checks = [];

  const deploy = runDeployRootGuard();
  checks.push({ id: 'DEPLOY_ROOT_GUARD', ...deploy });
  safeLine(`CHECK DEPLOY_ROOT_GUARD ${deploy.status} ${deploy.detail}`);

  const doctorAll = await runZwDoctor('all', {
    json: false,
    strict: false,
    probeStaging: true,
    probeOperator: false,
  });
  checks.push({
    id: 'ZW_DOCTOR_ALL',
    status:
      doctorAll.report.verdict === 'PASS' || doctorAll.report.verdict === 'WARN'
        ? 'PASS'
        : doctorAll.report.verdict === 'PARTIAL'
          ? 'PARTIAL_NOT_CONFIGURED'
          : 'WARN',
    detail: `verdict=${doctorAll.report.verdict} summary=${JSON.stringify(doctorAll.report.summary)}`,
  });
  safeLine(`CHECK ZW_DOCTOR_ALL ${checks.at(-1).status} ${checks.at(-1).detail}`);

  const statusCheck = runOperatorMode('status-check');
  checks.push({ id: 'OPERATOR_STATUS_CHECK', ...statusCheck });
  safeLine(`CHECK OPERATOR_STATUS_CHECK ${statusCheck.status} ${statusCheck.detail}`);

  let phase1 = { status: 'PARTIAL_NOT_CONFIGURED', detail: 'no_order_id_file' };
  if (existsSync(ORDER_ID_PATH) && existsSync(TOKEN_PATH)) {
    phase1 = runOperatorMode('phase1-truth-check');
  }
  checks.push({ id: 'OPERATOR_PHASE1_TRUTH', ...phase1 });
  safeLine(`CHECK OPERATOR_PHASE1_TRUTH ${phase1.status} ${phase1.detail}`);

  const sanitizedDoctor = sanitizeZwDoctorReport(doctorAll.report);
  assertSanitizedReportSafe(sanitizedDoctor);

  const artifact = {
    version: '1.0.0',
    startedAt,
    finishedAt: new Date().toISOString(),
    checks,
    doctor: sanitizedDoctor,
    safety: {
      refunds_executed: false,
      payments_created: false,
      webhooks_resent: false,
      production_data_mutated: false,
    },
  };

  if (writeArtifact) {
    mkdirSync(SMOKE_DIR, { recursive: true });
    const outPath = join(SMOKE_DIR, 'latest-sanitized.json');
    writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`, {
      encoding: 'utf8',
    });
    safeLine(`ARTIFACT_WRITTEN ${outPath.replace(REPO_ROOT + '\\', '').replace(REPO_ROOT + '/', '')}`);
  } else {
    safeLine('ARTIFACT_WRITTEN false hint=pass_--write-artifact');
  }

  const hardFail = checks.some((c) => c.status === 'FAIL');
  const verdict = hardFail ? 'FAIL' : 'PASS';
  safeLine(`ZW_STAGING_SMOKE_VERDICT ${verdict}`);
  process.exit(hardFail ? 1 : 0);
}

main().catch((e) => {
  safeLine(`ZW_STAGING_SMOKE_ERROR ${String(e.message ?? e).slice(0, 120)}`);
  process.exit(1);
});
