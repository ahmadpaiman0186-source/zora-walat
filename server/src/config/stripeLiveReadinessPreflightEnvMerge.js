/**
 * Optional merge for `npm run preflight:stripe-live` on developer machines with incomplete dotenv
 * (missing explicit PAYMENTS_LOCKDOWN_MODE, invalid publishable string in .env.local, local-only
 * webhook placeholder). Does not relax Stripe signature verification — supplies well-formed whsec_/pk_
 * test-mode shapes only when the effective secret is **test** (sk_test_/rk_test_).
 *
 * Opt out of any merge: `ZW_STRIPE_LIVE_READINESS_SIMULATION_MERGE=false`
 */

import { join } from 'node:path';

import { effectiveStripeSecretKey } from './stripeEnv.js';
import {
  readFirstEnvKeyFromFiles,
  publishableMode,
} from './stripeLiveReadinessPreflight.js';

/** Synthetic signing secret for readiness checks only (no Dashboard linkage). */
const SYNTHETIC_WHSEC_STRIPE_LIVE_READINESS =
  'whsec_test_synthetic_stripe_live_readiness_webhook_only_01';

/** Synthetic publishable (test) for alignment with sk_test_ when files contain junk. */
const SYNTHETIC_PK_TEST_STRIPE_LIVE_READINESS = `pk_test_${'0'.repeat(99)}`;

/**
 * @param {NodeJS.ProcessEnv} source
 * @param {{ serverRoot: string }} opts
 * @returns {{
 *   env: NodeJS.ProcessEnv;
 *   mergeApplied: boolean;
 *   mergeWarnings: string[];
 *   checks: { simulationMergeActive: boolean; testModeSecret: boolean };
 * }}
 */
export function buildStripeLiveReadinessPreflightMergedEnv(source, opts) {
  const mergeWarnings = /** @type {string[]} */ ([]);
  /** Opt out only when explicitly `false` (unset = merge on for local simulation readiness). */
  const mergeDisabled =
    String(source.ZW_STRIPE_LIVE_READINESS_SIMULATION_MERGE ?? '')
      .trim()
      .toLowerCase() === 'false';
  if (mergeDisabled) {
    return {
      env: { ...source },
      mergeApplied: false,
      mergeWarnings,
      checks: { simulationMergeActive: false, testModeSecret: false },
    };
  }

  const env = { ...source };
  const skRaw = String(env.STRIPE_SECRET_KEY ?? '').trim();
  const stripeKey = effectiveStripeSecretKey(skRaw);
  const testModeSecret = Boolean(
    stripeKey &&
      (stripeKey.startsWith('sk_test_') || stripeKey.startsWith('rk_test_')),
  );
  const liveModeSecret = Boolean(
    stripeKey &&
      (stripeKey.startsWith('sk_live_') || stripeKey.startsWith('rk_live_')),
  );

  const preRaw = String(env.PRELAUNCH_LOCKDOWN ?? '').trim().toLowerCase();
  const payRaw = String(env.PAYMENTS_LOCKDOWN_MODE ?? '').trim().toLowerCase();
  const preExplicit = preRaw === 'true' || preRaw === 'false';
  const payExplicit = payRaw === 'true' || payRaw === 'false';

  let changed = false;

  if (!preExplicit) {
    env.PRELAUNCH_LOCKDOWN = 'false';
    changed = true;
    mergeWarnings.push(
      '[preflight:stripe-live merge] PRELAUNCH_LOCKDOWN was not explicit true/false — set to false for this check only (set your own in .env for real deploys).',
    );
  }
  if (!payExplicit) {
    env.PAYMENTS_LOCKDOWN_MODE = 'false';
    changed = true;
    mergeWarnings.push(
      '[preflight:stripe-live merge] PAYMENTS_LOCKDOWN_MODE was not explicit true/false — set to false for this check only.',
    );
  }

  const wh = String(env.STRIPE_WEBHOOK_SECRET ?? '').trim();
  const whUsable = wh.startsWith('whsec_') && wh.length >= 20;
  if (testModeSecret && !whUsable) {
    env.STRIPE_WEBHOOK_SECRET = SYNTHETIC_WHSEC_STRIPE_LIVE_READINESS;
    changed = true;
    mergeWarnings.push(
      '[preflight:stripe-live merge] STRIPE_WEBHOOK_SECRET missing/invalid for test secret — using non-production synthetic whsec_ for this preflight only (set a real whsec_ from Dashboard or `stripe listen` for live forwarding).',
    );
  } else if (liveModeSecret && !whUsable) {
    mergeWarnings.push(
      '[preflight:stripe-live merge] sk_live_/rk_live_ with missing/invalid STRIPE_WEBHOOK_SECRET — not auto-filled; fix .env (live signing secret from Dashboard).',
    );
  }

  if (testModeSecret) {
    let publishableValue = String(env.STRIPE_PUBLISHABLE_KEY ?? '').trim();
    if (!publishableValue && opts.serverRoot) {
      const serverDir = opts.serverRoot;
      const repoRoot = join(serverDir, '..');
      const hit = readFirstEnvKeyFromFiles(
        [
          join(serverDir, '.env'),
          join(serverDir, '.env.local'),
          join(repoRoot, '.env.local'),
        ],
        ['STRIPE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'],
      );
      if (hit) publishableValue = hit.value;
    }
    const pkM = publishableMode(publishableValue);
    if (!publishableValue || pkM === 'invalid') {
      env.STRIPE_PUBLISHABLE_KEY = SYNTHETIC_PK_TEST_STRIPE_LIVE_READINESS;
      changed = true;
      mergeWarnings.push(
        '[preflight:stripe-live merge] STRIPE_PUBLISHABLE_KEY missing or invalid while sk_test_/rk_test_ is present — using synthetic pk_test_ for mode alignment in this preflight only.',
      );
    }
  }

  return {
    env,
    mergeApplied: changed,
    mergeWarnings,
    checks: { simulationMergeActive: true, testModeSecret },
  };
}
