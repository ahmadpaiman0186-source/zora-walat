/**
 * Stripe live-readiness checks (read-only, no Stripe HTTP, no charge/refund APIs).
 * Safe to run on developer machines: fails closed on accidental sk_live_ unless ack env is set.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { effectiveStripeSecretKey } from './stripeEnv.js';
import { evaluateProductionMoneyPathSafety } from './productionSafetyGates.js';
import { envStrictTrue } from '../lib/localCheckoutProofRuntime.js';
import {
  RESTRICTED_REGION_CODES,
  isRestrictedRegionCode,
  restrictedSanctionedAlpha2Probe,
} from '../policy/restrictedRegions.js';

/** @param {string} line */
export function stripEnvLineValue(line) {
  const eq = line.indexOf('=');
  if (eq < 0) return '';
  let v = line.slice(eq + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

/**
 * Reads first matching `KEY=value` from existing files (no dotenv side effects).
 * @param {string[]} absPaths
 * @param {string[]} keyNames e.g. STRIPE_PUBLISHABLE_KEY
 */
export function readFirstEnvKeyFromFiles(absPaths, keyNames) {
  for (const file of absPaths) {
    if (!existsSync(file)) continue;
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      for (const key of keyNames) {
        const prefix = `${key}=`;
        if (t.startsWith(prefix)) {
          const v = stripEnvLineValue(t);
          if (v) return { value: v, file: file.replace(/\\/g, '/') };
        }
      }
    }
  }
  return null;
}

/**
 * @param {string | undefined} pk
 * @returns {'test'|'live'|'invalid'|null}
 */
export function publishableMode(pk) {
  const s = String(pk ?? '').trim();
  if (!s) return null;
  if (s.startsWith('pk_test_')) return 'test';
  if (s.startsWith('pk_live_')) return 'live';
  return 'invalid';
}

/**
 * @param {string | undefined} sk
 * @returns {'test'|'live'|'invalid'|null}
 */
function secretModeFromEffective(sk) {
  if (!sk) return null;
  if (sk.startsWith('sk_test_') || sk.startsWith('rk_test_')) return 'test';
  if (sk.startsWith('sk_live_') || sk.startsWith('rk_live_')) return 'live';
  return 'invalid';
}

/**
 * @param {NodeJS.ProcessEnv} sourceEnv
 * @param {{ serverRoot?: string }} [opts]
 */
export function evaluateStripeLiveReadinessPreflight(
  sourceEnv = process.env,
  opts = {},
) {
  /** @type {string[]} */
  const blockers = [];
  /** @type {string[]} */
  const warnings = [];

  const nodeEnv = String(sourceEnv.NODE_ENV ?? '').trim() || 'development';
  const skRaw = String(sourceEnv.STRIPE_SECRET_KEY ?? '').trim();
  const stripeKey = effectiveStripeSecretKey(skRaw);

  const wh = String(sourceEnv.STRIPE_WEBHOOK_SECRET ?? '').trim();
  if (!wh || wh.length < 20) {
    blockers.push(
      'stripe_webhook_secret: STRIPE_WEBHOOK_SECRET must be set (whsec_…, min length 20) for webhook verification',
    );
  } else if (!wh.startsWith('whsec_')) {
    blockers.push(
      'stripe_webhook_secret: STRIPE_WEBHOOK_SECRET must start with whsec_ (Stripe signing secret)',
    );
  }

  if (!stripeKey) {
    blockers.push(
      'stripe_secret_key: STRIPE_SECRET_KEY must be a valid non-placeholder Stripe secret (sk_/rk_, test or live)',
    );
  }

  const secretMode = secretModeFromEffective(stripeKey);

  const isLiveSecret =
    Boolean(stripeKey) &&
    (stripeKey.startsWith('sk_live_') || stripeKey.startsWith('rk_live_'));
  if (
    isLiveSecret &&
    nodeEnv !== 'production' &&
    !envStrictTrue(sourceEnv.ZW_STRIPE_LIVE_READINESS_ACK_LIVE_SECRET)
  ) {
    blockers.push(
      'stripe_live_secret_guard: sk_live_/rk_live_ detected while NODE_ENV is not production — remove live keys from this environment or set ZW_STRIPE_LIVE_READINESS_ACK_LIVE_SECRET=true only for supervised live-readiness inspection (still no charges from this script)',
    );
  }

  /** Production-shaped profile for lockdown / Stripe prod-intent gates (read-only snapshot). */
  const prod = { ...sourceEnv, NODE_ENV: 'production' };
  const prodIntent =
    nodeEnv === 'production' ||
    envStrictTrue(sourceEnv.ZW_STRIPE_LIVE_PREFLIGHT_PROD_INTENT);

  /** @type {boolean | null} */
  let productionMoneyPathSafetyOk = null;
  if (prodIntent) {
    const money = evaluateProductionMoneyPathSafety(prod);
    productionMoneyPathSafetyOk = money.ok;
    if (!money.ok) {
      blockers.push(`production_money_path: ${money.code} — ${money.message}`);
    }
  } else {
    warnings.push(
      'prod_intent: set NODE_ENV=production or ZW_STRIPE_LIVE_PREFLIGHT_PROD_INTENT=true to run full production money-path safety (mock airtime / webtop / Reloadly gates) against your env',
    );
  }

  const preRaw = String(sourceEnv.PRELAUNCH_LOCKDOWN ?? '').trim().toLowerCase();
  const payRaw = String(sourceEnv.PAYMENTS_LOCKDOWN_MODE ?? '').trim().toLowerCase();
  const preExplicit = preRaw === 'true' || preRaw === 'false';
  const payExplicit = payRaw === 'true' || payRaw === 'false';
  if (!preExplicit) {
    blockers.push(
      'lockdown_policy: PRELAUNCH_LOCKDOWN must be explicitly true or false (set in env) before Stripe live activation',
    );
  }
  if (!payExplicit) {
    blockers.push(
      'lockdown_policy: PAYMENTS_LOCKDOWN_MODE must be explicitly true or false (set in env) before Stripe live activation',
    );
  }

  const prelaunch = sourceEnv.PRELAUNCH_LOCKDOWN === 'true';
  const paymentsLockdown = sourceEnv.PAYMENTS_LOCKDOWN_MODE === 'true';
  const moneyPathLive = !prelaunch && !paymentsLockdown;

  const testModeKey =
    Boolean(stripeKey) &&
    (stripeKey.startsWith('sk_test_') || stripeKey.startsWith('rk_test_'));
  const liveModeKey =
    Boolean(stripeKey) &&
    (stripeKey.startsWith('sk_live_') || stripeKey.startsWith('rk_live_'));
  const allowTestKeysStrict = envStrictTrue(prod.ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION);

  if (prodIntent && moneyPathLive && allowTestKeysStrict && liveModeKey) {
    blockers.push(
      'stripe_allow_test_keys: ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION=true is inconsistent with sk_live_/rk_live_ — unset ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION for real live keys',
    );
  }

  if (prodIntent && moneyPathLive && allowTestKeysStrict && testModeKey) {
    warnings.push(
      'stripe_activation: ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION=true with test keys — valid supervised staging only; set sk_live_/rk_live_ and ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION=false before real customer charges',
    );
  }

  if (prodIntent && moneyPathLive) {
    if (testModeKey && !allowTestKeysStrict) {
      blockers.push(
        'stripe_key_mode: production money surface (PRELAUNCH_LOCKDOWN=false, PAYMENTS_LOCKDOWN_MODE=false) requires sk_live_/rk_live_ or supervised ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION=true for test keys',
      );
    }
  }

  let publishableSource = null;
  let publishableValue = String(sourceEnv.STRIPE_PUBLISHABLE_KEY ?? '').trim();
  if (publishableValue) {
    publishableSource = 'process.env:STRIPE_PUBLISHABLE_KEY';
  } else if (opts.serverRoot) {
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
    if (hit) {
      publishableValue = hit.value;
      publishableSource = hit.file;
    }
  }

  const pkMode = publishableMode(publishableValue);
  if (pkMode === 'invalid' && publishableValue) {
    blockers.push(
      'stripe_publishable_key: publishable key must start with pk_test_ or pk_live_ when set',
    );
  }

  let publishableMatchesSecret = null;
  if (secretMode && pkMode && secretMode !== 'invalid' && pkMode !== 'invalid') {
    publishableMatchesSecret = secretMode === pkMode;
    if (!publishableMatchesSecret) {
      blockers.push(
        `stripe_key_mode_alignment: secret is ${secretMode} mode but publishable key is ${pkMode} mode — use matching Dashboard mode (same Stripe account)`,
      );
    }
  } else if (!publishableValue && secretMode && secretMode !== 'invalid') {
    warnings.push(
      'stripe_publishable_key: not found in process.env.STRIPE_PUBLISHABLE_KEY or server/.env / .env.local / repo .env.local — Flutter uses --dart-define=STRIPE_PUBLISHABLE_KEY; ensure client key mode matches server secret at build/deploy time',
    );
  }

  if (!isRestrictedRegionCode(restrictedSanctionedAlpha2Probe())) {
    blockers.push(
      'restricted_regions: sanctioned primary alpha-2 probe must remain blocked (policy regression)',
    );
  }
  if (!RESTRICTED_REGION_CODES.includes('CU')) {
    blockers.push('restricted_regions: expected code CU missing from RESTRICTED_REGION_CODES');
  }
  if (!RESTRICTED_REGION_CODES.includes('KP')) {
    blockers.push('restricted_regions: expected code KP missing from RESTRICTED_REGION_CODES');
  }

  const uniqueBlockers = [...new Set(blockers)];

  return {
    ok: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
    warnings,
    checks: {
      nodeEnv,
      secretKeyMode: secretMode,
      webhookSecretPresent: wh.length >= 20,
      webhookSecretWhsecPrefix: wh.startsWith('whsec_'),
      publishableKeySource: publishableSource,
      publishableKeyMode: pkMode === 'invalid' ? null : pkMode,
      publishableMatchesSecret,
      prodProfileMoneyPathLive: moneyPathLive,
      prodProfilePrelaunchLockdown: prelaunch,
      prodProfilePaymentsLockdown: paymentsLockdown,
      prodProfileAllowTestKeysStrict:
        envStrictTrue(prod.ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION),
      paymentsLockdownExplicit: payExplicit,
      prelaunchLockdownExplicit: preExplicit,
      restrictedRegionPolicyOk:
        isRestrictedRegionCode(restrictedSanctionedAlpha2Probe()) &&
        RESTRICTED_REGION_CODES.includes('CU') &&
        RESTRICTED_REGION_CODES.includes('KP'),
      restrictedRegionListLength: RESTRICTED_REGION_CODES.length,
      prodIntentEvaluated: prodIntent,
      productionMoneyPathSafetyOk,
    },
  };
}
