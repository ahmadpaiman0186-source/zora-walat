#!/usr/bin/env node
/**
 * Phase 1 launch / release gate — JSON summary to stdout.
 *
 * Flags:
 * - `--strict` — exit 1 if any blocker
 * - `--production` / `NODE_ENV=production` — tighten secret + DATABASE_URL checks
 * - `--production-launch` — block mock airtime/webtopup without explicit ALLOW_* (same as prod safety rules without requiring NODE_ENV)
 * - `--require-ci-money-path-certified` — require env `PHASE1_CI_MONEY_PATH_CERTIFIED=1` (set by CI after `test:ci`)
 *
 * Does not run tests; use `npm run test:ci` before `--require-ci-money-path-certified` in pipelines.
 */
import '../bootstrap.js';

import { evaluateProductionMoneyPathSafety } from '../src/config/productionSafetyGates.js';
import { env } from '../src/config/env.js';

const strict = process.argv.includes('--strict');
const productionIntent =
  process.argv.includes('--production') || env.nodeEnv === 'production';
const productionLaunch = process.argv.includes('--production-launch');
const requireCiMoneyPath = process.argv.includes('--require-ci-money-path-certified');

const lines = [];
const blockers = [];

function add(line) {
  lines.push(line);
}

if (requireCiMoneyPath && process.env.PHASE1_CI_MONEY_PATH_CERTIFIED !== '1') {
  blockers.push(
    'money_path_ci: PHASE1_CI_MONEY_PATH_CERTIFIED=1 missing — run npm run db:migrate && npm run test:ci first (CI sets this after tests pass)',
  );
}
add(
  `money_path_ci_certified: ${process.env.PHASE1_CI_MONEY_PATH_CERTIFIED === '1' ? 'yes' : 'no'} (required_if_flag=${requireCiMoneyPath})`,
);

const safety = evaluateProductionMoneyPathSafety(process.env);
if (!safety.ok) {
  blockers.push(`production_safety: ${safety.code} — ${safety.message}`);
}
add(`production_money_path_safety: ${safety.ok ? 'ok' : 'BLOCKED'}`);
if (!safety.ok) add(`  detail: ${safety.message}`);

if (productionIntent) {
  const wh = String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();
  if (wh.length < 8) {
    blockers.push('STRIPE_WEBHOOK_SECRET missing or too short for production-intent check');
  }
  add(`stripe_webhook_secret_configured: ${wh.length >= 8}`);

  const db = String(process.env.DATABASE_URL ?? '').trim();
  if (!/^postgres(ql)?:\/\//i.test(db)) {
    blockers.push('DATABASE_URL must be a PostgreSQL URL for production-intent check');
  }
  add(`database_url_postgres: ${/^postgres(ql)?:\/\//i.test(db)}`);

  const sk = String(process.env.STRIPE_SECRET_KEY ?? '').trim();
  if (sk.length < 8) {
    blockers.push('STRIPE_SECRET_KEY missing or too short for production-intent check');
  }
  add(`stripe_secret_configured: ${sk.length >= 8}`);
}

if (productionLaunch) {
  const airtime = String(process.env.AIRTIME_PROVIDER ?? 'mock').trim().toLowerCase();
  const webtop = String(process.env.WEBTOPUP_FULFILLMENT_PROVIDER ?? 'mock')
    .trim()
    .toLowerCase();
  if (airtime === 'mock' && process.env.ALLOW_MOCK_AIRTIME_IN_PRODUCTION !== 'true') {
    blockers.push(
      'production_launch: AIRTIME_PROVIDER=mock requires ALLOW_MOCK_AIRTIME_IN_PRODUCTION=true',
    );
  }
  if (webtop === 'mock' && process.env.ALLOW_MOCK_WEBTOPUP_FULFILLMENT_IN_PRODUCTION !== 'true') {
    blockers.push(
      'production_launch: WEBTOPUP_FULFILLMENT_PROVIDER=mock requires ALLOW_MOCK_WEBTOPUP_FULFILLMENT_IN_PRODUCTION=true',
    );
  }
  const wh = String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();
  if (wh.length < 8) {
    blockers.push('production_launch: STRIPE_WEBHOOK_SECRET required');
  }
  const db = String(process.env.DATABASE_URL ?? '').trim();
  if (!/^postgres(ql)?:\/\//i.test(db)) {
    blockers.push('production_launch: DATABASE_URL must be PostgreSQL');
  }
  add('production_launch_profile: evaluated');
}

add(`node_env: ${env.nodeEnv}`);
add(`prelaunch_lockdown: ${env.prelaunchLockdown}`);

const report = {
  ok: blockers.length === 0,
  productionIntent,
  productionLaunch,
  strict,
  requireCiMoneyPath,
  blockers,
  lines,
};

console.log(JSON.stringify(report, null, 2));

if (strict && blockers.length > 0) {
  process.exit(1);
}
