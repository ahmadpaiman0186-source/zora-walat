#!/usr/bin/env node
/**
 * Zora-Walat Super-System Control Plane — diagnostic CLI (propose-only).
 *
 * Usage:
 *   node tools/zw-doctor.mjs [mode] [--json] [--strict] [--no-staging] [--no-operator]
 *
 * Modes: summary | money-path | stripe-env | webhook | operator-auth |
 *        frontend-env | deploy-root | evidence | incidents | all
 *
 * Never executes refunds, payments, or webhook resends.
 */
import { runZwDoctor, runZwDoctorIncidents, MODES } from './zwDoctor/run.mjs';

function printUsage() {
  process.stderr.write(
    `zw-doctor — Super-System diagnostic (propose-only)\n\n` +
      `Usage: node tools/zw-doctor.mjs <mode> [--json] [--strict] [--no-staging] [--no-operator]\n\n` +
      `Modes: ${MODES.join(', ')}\n`,
  );
}

const argv = process.argv.slice(2);
let mode = 'summary';
const flags = new Set();

for (const arg of argv) {
  if (arg.startsWith('--')) {
    flags.add(arg);
  } else if (!mode || mode === 'summary') {
    mode = arg;
  }
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

const opts = {
  json: flags.has('--json'),
  strict: flags.has('--strict'),
  probeStaging: !flags.has('--no-staging'),
  probeOperator: !flags.has('--no-operator'),
};

const result =
  mode === 'incidents'
    ? await runZwDoctorIncidents(opts)
    : await runZwDoctor(mode, opts);

process.exit(result.exitCode);
