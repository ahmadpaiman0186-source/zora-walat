#!/usr/bin/env node
/**
 * Stripe live-readiness preflight (read-only: no Stripe charge/refund API calls, no network).
 * Loads `server/.env` (+ optional `.env.local`) via bootstrap.
 *
 * Run: npm --prefix server run preflight:stripe-live
 *
 * Optional:
 * - `ZW_STRIPE_LIVE_PREFLIGHT_PROD_INTENT=true` — apply production money-path safety and Stripe
 *   prod-intent rules (live keys, ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION, etc.) against a merged
 *   `NODE_ENV=production` profile (use on staging hosts validating go-live config).
 * - `ZW_STRIPE_LIVE_READINESS_ACK_LIVE_SECRET=true` — allow `sk_live_`/`rk_live_` when `NODE_ENV` is
 *   not `production` (supervised inspection only; this script never charges cards).
 */
import '../bootstrap.js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateStripeLiveReadinessPreflight } from '../src/config/stripeLiveReadinessPreflight.js';
import { buildStripeLiveReadinessPreflightMergedEnv } from '../src/config/stripeLiveReadinessPreflightEnvMerge.js';

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const {
  env: preflightEnv,
  mergeApplied,
  mergeWarnings,
} = buildStripeLiveReadinessPreflightMergedEnv(process.env, { serverRoot });
if (mergeWarnings.length) {
  for (const w of mergeWarnings) {
    // eslint-disable-next-line no-console -- operator visibility for local simulation merge
    console.warn(w);
  }
}
const r = evaluateStripeLiveReadinessPreflight(preflightEnv, { serverRoot });

// eslint-disable-next-line no-console -- CLI contract
console.log(
  JSON.stringify(
    {
      ok: r.ok,
      blockerCount: r.blockers.length,
      warningCount: r.warnings.length,
      blockers: r.blockers,
      warnings: r.warnings,
      checks: r.checks,
      simulationMergeApplied: mergeApplied,
      simulationMergeWarningCount: mergeWarnings.length,
    },
    null,
    2,
  ),
);

process.exit(r.ok ? 0 : 1);
