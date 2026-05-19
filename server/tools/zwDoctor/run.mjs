/**
 * Run zw-doctor for a mode and format output.
 */
import { redactSecrets } from './redact.mjs';
import {
  collectRuntimeSignals,
  runInvariantsForMode,
} from './invariants.mjs';
import {
  assertProposalOutputHasNoSecrets,
  buildProposalsFromInvariants,
} from './proposals.mjs';
import {
  computeVerdict,
  exitCodeForVerdict,
  summarizeInvariants,
  ZW_DOCTOR_VERSION,
} from './types.mjs';

const MODES = [
  'summary',
  'money-path',
  'stripe-env',
  'webhook',
  'operator-auth',
  'frontend-env',
  'deploy-root',
  'evidence',
  'all',
];

/**
 * @param {string} mode
 * @param {{ json?: boolean, strict?: boolean, probeStaging?: boolean, probeOperator?: boolean }} opts
 */
export async function runZwDoctor(mode, opts = {}) {
  const normalized = MODES.includes(mode) ? mode : 'all';
  /** @type {import('./invariants.mjs').ZwDoctorContext} */
  const ctx = {
    probeStaging: opts.probeStaging !== false,
    probeOperator: opts.probeOperator === true && normalized !== 'frontend-env',
  };

  if (normalized === 'money-path' || normalized === 'operator-auth' || normalized === 'all') {
    ctx.probeOperator = opts.probeOperator !== false;
  }

  const invariants = await runInvariantsForMode(normalized, ctx);
  const signals = collectRuntimeSignals(ctx);
  const proposals = buildProposalsFromInvariants(invariants, signals);
  const summary = summarizeInvariants(invariants);
  const verdict = computeVerdict(invariants);

  const report = {
    version: ZW_DOCTOR_VERSION,
    mode: normalized,
    timestamp: new Date().toISOString(),
    verdict,
    invariants,
    proposals,
    summary,
    safety: {
      refunds_executed: false,
      payments_created: false,
      webhooks_resent: false,
      production_data_mutated: false,
    },
  };

  assertProposalOutputHasNoSecrets(proposals, JSON.stringify(report));

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printHumanReport(report);
  }

  return {
    report,
    exitCode: exitCodeForVerdict(verdict, opts.strict === true),
  };
}

/**
 * @param {import('./types.mjs').ZwDoctorReport} report
 */
function printHumanReport(report) {
  process.stdout.write('\n========== zw-doctor ==========\n');
  process.stdout.write(`mode=${report.mode} verdict=${report.verdict} v=${report.version}\n`);
  process.stdout.write(
    `safety: no refunds | no payments | no webhook resend | no prod DB writes\n\n`,
  );

  for (const inv of report.invariants) {
    process.stdout.write(`[${inv.status}] ${inv.id} (${inv.confidence})\n`);
    process.stdout.write(`  evidence: ${redactSecrets(inv.evidence)}\n`);
    if (inv.risk) process.stdout.write(`  risk: ${inv.risk}\n`);
    if (inv.proposed_next_action) {
      process.stdout.write(`  next: ${inv.proposed_next_action}\n`);
    }
    if (inv.approval_required) {
      process.stdout.write('  approval_required: true\n');
    }
    process.stdout.write('\n');
  }

  if (report.proposals.length > 0) {
    process.stdout.write('--- repair proposals (propose-only) ---\n\n');
    for (const p of report.proposals) {
      process.stdout.write(
        `[${p.classification}] ${p.id} mode=${p.action_mode} danger=${p.danger}\n`,
      );
      process.stdout.write(`  ${p.title}\n`);
      for (const step of p.steps) {
        process.stdout.write(`  - ${redactSecrets(step)}\n`);
      }
      if (p.approval_required) {
        process.stdout.write('  approval_required: true\n');
      }
      process.stdout.write('\n');
    }
  }

  process.stdout.write('summary: ');
  process.stdout.write(JSON.stringify(report.summary));
  process.stdout.write('\n\n');
}

export { MODES };
