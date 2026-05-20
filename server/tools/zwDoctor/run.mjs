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
  classifyDoctorReport,
  filterIncidentsForCiStatic,
  incidentsStrictExitCode,
} from './incidents.mjs';
import {
  computeVerdict,
  exitCodeForVerdict,
  summarizeInvariants,
  ZW_DOCTOR_VERSION,
} from './types.mjs';
import { runZwDoctorIntelligence } from './superSystemIntelligence.mjs';

export { runZwDoctorIntelligence };

export const MODES = [
  'summary',
  'money-path',
  'stripe-env',
  'webhook',
  'operator-auth',
  'frontend-env',
  'deploy-root',
  'evidence',
  'incidents',
  'intelligence',
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

/**
 * @param {{ json?: boolean, strict?: boolean, probeStaging?: boolean, probeOperator?: boolean, ciStatic?: boolean }} opts
 */
export async function runZwDoctorIncidents(opts = {}) {
  const ciStatic = opts.ciStatic === true;
  const ctx = {
    probeStaging: !ciStatic && opts.probeStaging !== false,
    probeOperator: !ciStatic && opts.probeOperator !== false,
    ciStatic,
  };

  const invariants = await runInvariantsForMode('all', ctx);
  const signals = collectRuntimeSignals(ctx);
  const proposals = buildProposalsFromInvariants(invariants, signals);
  const doctorVerdict = computeVerdict(invariants);

  const doctorReport = {
    version: ZW_DOCTOR_VERSION,
    mode: 'all',
    timestamp: new Date().toISOString(),
    verdict: doctorVerdict,
    invariants,
    proposals,
    summary: summarizeInvariants(invariants),
    safety: {
      refunds_executed: false,
      payments_created: false,
      webhooks_resent: false,
      production_data_mutated: false,
    },
  };

  let { incidents, runbooks } = classifyDoctorReport(doctorReport, signals);
  if (ciStatic) {
    incidents = filterIncidentsForCiStatic(incidents);
    runbooks = runbooks.filter((rb) =>
      incidents.some((i) => i.id === rb.incident_id && i.status === 'ACTIVE'),
    );
  }
  const active = incidents.filter((i) => i.status === 'ACTIVE');
  const incidentVerdict =
    active.length === 0
      ? 'PASS'
      : active.some((i) => i.severity === 'CRITICAL')
        ? 'CRITICAL'
        : active.some((i) => i.severity === 'HIGH')
          ? 'HIGH'
          : 'WARN';

  const payload = {
    version: ZW_DOCTOR_VERSION,
    mode: 'incidents',
    timestamp: new Date().toISOString(),
    doctor_verdict: doctorVerdict,
    incident_verdict: incidentVerdict,
    incident_count: incidents.length,
    active_incident_count: active.length,
    incidents,
    runbooks,
    safety: {
      refunds_executed: false,
      payments_created: false,
      webhooks_resent: false,
      production_data_mutated: false,
      auto_repair_executed: false,
    },
    ci_static: ciStatic,
  };

  assertProposalOutputHasNoSecrets(proposals, JSON.stringify(payload));

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    printIncidentsReport(payload);
  }

  const exitCode =
    opts.strict === true
      ? incidentsStrictExitCode(incidents, { ciStatic })
      : 0;
  return { payload, exitCode, incidents };
}

/**
 * @param {object} payload
 */
function printIncidentsReport(payload) {
  process.stdout.write('\n========== zw-doctor incidents ==========\n');
  process.stdout.write(
    `doctor_verdict=${payload.doctor_verdict} incident_verdict=${payload.incident_verdict} active=${payload.active_incident_count}\n`,
  );
  process.stdout.write(
    'safety: propose-only | no refunds | no payments | no webhook resend\n\n',
  );

  if (payload.incidents.length === 0) {
    process.stdout.write('No classified incidents (all invariants PASS or unmapped).\n\n');
    return;
  }

  for (const inc of payload.incidents) {
    process.stdout.write(`[${inc.severity}] ${inc.id} status=${inc.status}\n`);
    process.stdout.write(`  confidence: ${inc.confidence}\n`);
    for (const s of inc.signals.slice(0, 6)) {
      process.stdout.write(`  signal: ${redactSecrets(s)}\n`);
    }
    process.stdout.write(`  proposed: ${redactSecrets(inc.proposed_action)}\n`);
    if (inc.approval_required) {
      process.stdout.write('  approval_required: true\n');
    }
    process.stdout.write(`  rollback: ${redactSecrets(inc.rollback_hint)}\n`);
    process.stdout.write(
      `  forbidden: ${inc.forbidden_actions.slice(0, 3).join('; ')}${inc.forbidden_actions.length > 3 ? '…' : ''}\n\n`,
    );
  }
}
