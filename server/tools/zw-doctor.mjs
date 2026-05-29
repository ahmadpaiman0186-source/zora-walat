#!/usr/bin/env node
/**
 * Zora-Walat Super-System Control Plane — diagnostic CLI (propose-only).
 *
 * Usage:
 *   node tools/zw-doctor.mjs [mode] [--json] [--strict] [--ci-static] [--no-staging] [--no-operator]
 *
 * Modes: summary | money-path | stripe-env | webhook | operator-auth |
 *        frontend-env | deploy-root | evidence | incidents | intelligence |
 *        reliability | all
 *
 * reliability (CORE-04): detect-only scan from JSON fixture — requires --fixture <path>
 *   (no DB, no Stripe/Reloadly/Vercel, no mutations). --apply is rejected.
 *
 * Never executes refunds, payments, or webhook resends.
 */
import {
  runZwDoctor,
  runZwDoctorIncidents,
  runZwDoctorIntelligence,
  MODES,
} from './zwDoctor/run.mjs';

function printUsage() {
  process.stderr.write(
    `zw-doctor — Super-System diagnostic (propose-only)\n\n` +
      `Usage: node tools/zw-doctor.mjs <mode> [--json] [--strict] [--ci-static] [--no-staging] [--no-operator]\n\n` +
      `Modes: ${MODES.join(', ')}\n`,
  );
}

const argv = process.argv.slice(2);
let mode = 'summary';
const flags = new Set();
let fixturePath;

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === '--fixture' && argv[i + 1]) {
    fixturePath = argv[++i];
    continue;
  }
  if (arg.startsWith('--fixture=')) {
    fixturePath = arg.slice('--fixture='.length);
    continue;
  }
  if (arg.startsWith('--')) {
    flags.add(arg);
  } else if (!mode || mode === 'summary') {
    mode = arg;
  }
}

if (flags.has('--apply')) {
  process.stderr.write(
    'zw-doctor: --apply is forbidden (CORE-04 detect-only; auto-repair NOT ENABLED)\n',
  );
  process.exit(2);
}

if (flags.has('--help') || flags.has('-h')) {
  printUsage();
  process.exit(0);
}

if (!MODES.includes(mode)) {
  process.stderr.write(`Unknown mode: ${mode}\n`);
  printUsage();
  process.exit(2);
}

const ciStatic = flags.has('--ci-static');
const opts = {
  json: flags.has('--json'),
  strict: flags.has('--strict'),
  ciStatic,
  probeStaging: ciStatic ? false : !flags.has('--no-staging'),
  probeOperator: ciStatic ? false : !flags.has('--no-operator'),
  fixturePath,
};

const result =
  mode === 'incidents'
    ? await runZwDoctorIncidents(opts)
    : mode === 'intelligence'
      ? await runZwDoctorIntelligence(opts)
      : await runZwDoctor(mode, opts);

process.exit(result.exitCode);
