/**
 * Deployment preflight for a **production** profile (read-only; no network; no secrets in output).
 * Evaluates a merged env snapshot with `NODE_ENV=production` so operators can run locally:
 * `npm --prefix server run preflight:production`
 */
import { effectiveStripeSecretKey } from './stripeEnv.js';
import { evaluateProductionMoneyPathSafety } from './productionSafetyGates.js';
import { corsOriginsHaveNoWildcards } from '../lib/corsPolicy.js';
import {
  mergeReloadlyOperatorMaps,
  RELOADLY_OPERATOR_ID_DEFAULTS,
} from './reloadlyOperatorIdDefaults.js';
import { envStrictTrue } from '../lib/localCheckoutProofRuntime.js';

/**
 * @param {string | undefined} raw
 */
function parseReloadlySandboxFromEnv(raw) {
  const s = String(raw ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

/**
 * @param {string | undefined} raw
 * @returns {Record<string, string>}
 */
function parseReloadlyOperatorMapSilent(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return {};
  try {
    const obj = JSON.parse(s);
    if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) {
      return {};
    }
    /** @type {Record<string, string>} */
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      const key = String(k).trim().toLowerCase();
      if (!key) continue;
      out[key] = String(v).trim();
    }
    return out;
  } catch {
    return {};
  }
}

function parseCorsOriginsList(raw, prelaunchLockdown) {
  const s = String(raw ?? '').trim();
  if (!s) {
    if (prelaunchLockdown) {
      return [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ];
    }
    return [];
  }
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function isPostgresUrl(url) {
  return /^postgres(ql)?:\/\//i.test(String(url ?? '').trim());
}

const OWNER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {NodeJS.ProcessEnv} [sourceEnv]
 * @returns {{
 *   ok: boolean,
 *   blockers: string[],
 *   warnings: string[],
 *   checks: Record<string, unknown>,
 * }}
 */
export function evaluateProductionDeploymentPreflight(sourceEnv = process.env) {
  /** Production profile: same gates as a real production process would apply. */
  const p = { ...sourceEnv, NODE_ENV: 'production' };

  /** @type {string[]} */
  const blockers = [];
  /** @type {string[]} */
  const warnings = [];

  const prelaunch = p.PRELAUNCH_LOCKDOWN === 'true';
  const paymentsLockdown = p.PAYMENTS_LOCKDOWN_MODE === 'true';
  const moneyPathLive = !prelaunch && !paymentsLockdown;

  const wh = String(p.STRIPE_WEBHOOK_SECRET ?? '').trim();
  if (wh.length < 8) {
    blockers.push(
      'stripe_webhook_secret: STRIPE_WEBHOOK_SECRET must be set (length >= 8) for production webhook verification',
    );
  }

  const stripeKey = effectiveStripeSecretKey(
    String(p.STRIPE_SECRET_KEY ?? '').trim(),
  );
  if (!stripeKey) {
    blockers.push(
      'stripe_secret_key: STRIPE_SECRET_KEY must be a valid Stripe secret (sk_/rk_) for production',
    );
  } else {
    const testModeKey =
      stripeKey.startsWith('sk_test_') || stripeKey.startsWith('rk_test_');
    const allowTestKeys = envStrictTrue(p.ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION);
    if (testModeKey && moneyPathLive && !allowTestKeys) {
      blockers.push(
        'stripe_key_mode: production with live money surface (not PRELAUNCH_LOCKDOWN / not PAYMENTS_LOCKDOWN_MODE) requires live Stripe keys — set sk_live_/rk_live_ or set ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION=true only for supervised staging',
      );
    }
  }

  const money = evaluateProductionMoneyPathSafety(p);
  if (!money.ok) {
    blockers.push(`production_money_path: ${money.code} — ${money.message}`);
  }

  if (moneyPathLive) {
    if (!envStrictTrue(p.ZW_REQUIRE_OWNER_ALLOWED_EMAIL)) {
      blockers.push(
        'owner_gate: live money surface requires ZW_REQUIRE_OWNER_ALLOWED_EMAIL=true',
      );
    }
    const owner = String(p.OWNER_ALLOWED_EMAIL ?? '').trim();
    if (!OWNER_EMAIL_RE.test(owner)) {
      blockers.push(
        'owner_gate: OWNER_ALLOWED_EMAIL must be set to a valid email when live money surface is enabled',
      );
    }
  }

  const db = String(p.DATABASE_URL ?? '').trim();
  if (!db || !isPostgresUrl(db)) {
    blockers.push('database: DATABASE_URL must be a PostgreSQL URL for production');
  }

  if (!String(p.CLIENT_URL ?? '').trim()) {
    blockers.push('client_url: CLIENT_URL must be set in production');
  }

  const corsList = parseCorsOriginsList(p.CORS_ORIGINS, prelaunch);
  if (corsList.length === 0) {
    blockers.push('cors: CORS_ORIGINS must be non-empty in production (comma-separated explicit origins)');
  } else if (!corsOriginsHaveNoWildcards(corsList)) {
    blockers.push('cors: CORS_ORIGINS must not use * or wildcards in production');
  }

  if (p.ZW_ALLOW_LOCAL_FLUTTER_WEB_CORS === 'true') {
    blockers.push(
      'cors: ZW_ALLOW_LOCAL_FLUTTER_WEB_CORS=true is unsafe for production deployment',
    );
  }

  if (envStrictTrue(p.DEV_CHECKOUT_AUTH_BYPASS)) {
    blockers.push('dev_bypass: DEV_CHECKOUT_AUTH_BYPASS must not be enabled for production profile');
  }

  const jwtAccess = String(p.JWT_ACCESS_SECRET ?? '');
  const jwtRefresh = String(p.JWT_REFRESH_SECRET ?? '');
  if (jwtAccess.length < 32 || jwtRefresh.length < 32) {
    blockers.push(
      'jwt: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must each be at least 32 characters in production',
    );
  }

  if (!String(p.ACCESS_TOKEN_TTL ?? '').trim()) {
    blockers.push('jwt: ACCESS_TOKEN_TTL must be set in production');
  }
  if (!String(p.REFRESH_TOKEN_TTL ?? '').trim()) {
    blockers.push('jwt: REFRESH_TOKEN_TTL must be set in production');
  }

  const fq = p.FULFILLMENT_QUEUE_ENABLED === 'true';
  const redisUrl = String(p.REDIS_URL ?? '').trim();
  if (fq && !redisUrl) {
    blockers.push(
      'queue: FULFILLMENT_QUEUE_ENABLED=true requires REDIS_URL in production',
    );
  }

  const airtime = String(p.AIRTIME_PROVIDER ?? 'mock').trim().toLowerCase();
  const outboundOn = p.PHASE1_FULFILLMENT_OUTBOUND_ENABLED === 'true';
  const reloadlySandbox = parseReloadlySandboxFromEnv(p.RELOADLY_SANDBOX);
  if (outboundOn && airtime === 'reloadly' && !reloadlySandbox) {
    const jsonRaw = String(p.RELOADLY_OPERATOR_MAP_JSON ?? '').trim();
    const parsedOverride = parseReloadlyOperatorMapSilent(p.RELOADLY_OPERATOR_MAP_JSON);
    if (!jsonRaw || Object.keys(parsedOverride).length === 0) {
      blockers.push(
        'reloadly: PHASE1_FULFILLMENT_OUTBOUND_ENABLED=true with AIRTIME_PROVIDER=reloadly and live Reloadly (RELOADLY_SANDBOX not true) requires non-empty RELOADLY_OPERATOR_MAP_JSON with operator ids',
      );
    }
    const merged = mergeReloadlyOperatorMaps(
      RELOADLY_OPERATOR_ID_DEFAULTS,
      parsedOverride,
    );
    let hasNonPlaceholder = false;
    for (const v of Object.values(merged)) {
      const id = String(v ?? '').trim();
      if (id && !/^911\d{3}$/.test(id)) {
        hasNonPlaceholder = true;
        break;
      }
    }
    if (!hasNonPlaceholder && !envStrictTrue(p.PHASE1_RELOADLY_LIVE_OUTBOUND_APPROVED)) {
      blockers.push(
        'reloadly: live outbound requires real Reloadly operator ids (not 911xxx placeholders) in RELOADLY_OPERATOR_MAP_JSON, or set PHASE1_RELOADLY_LIVE_OUTBOUND_APPROVED=true after operator review',
      );
    }
  }

  const checks = {
    profile: 'production',
    prelaunchLockdown: prelaunch,
    paymentsLockdownMode: paymentsLockdown,
    moneyPathLiveSurface: moneyPathLive,
    stripeWebhookSecretPresent: wh.length >= 8,
    stripeSecretPresent: Boolean(stripeKey),
    databaseUrlPostgres: isPostgresUrl(db),
    corsOriginCount: corsList.length,
    zwLocalFlutterWebCors: p.ZW_ALLOW_LOCAL_FLUTTER_WEB_CORS === 'true',
    devCheckoutAuthBypass: envStrictTrue(p.DEV_CHECKOUT_AUTH_BYPASS),
    airtimeProvider: airtime,
    phase1FulfillmentOutboundEnabled: outboundOn,
    reloadlySandbox: reloadlySandbox,
    reloadlyOperatorMapJsonBytes: String(p.RELOADLY_OPERATOR_MAP_JSON ?? '').trim().length,
    reloadlyLiveOutboundApproved: envStrictTrue(p.PHASE1_RELOADLY_LIVE_OUTBOUND_APPROVED),
    productionMoneyPathSafetyOk: money.ok,
    ownerRequiredForLiveMoney: moneyPathLive
      ? envStrictTrue(p.ZW_REQUIRE_OWNER_ALLOWED_EMAIL)
      : null,
  };

  if (prelaunch && paymentsLockdown) {
    warnings.push('Both PRELAUNCH_LOCKDOWN and PAYMENTS_LOCKDOWN_MODE are true — unusual; confirm intent.');
  }

  const uniqueBlockers = [...new Set(blockers)];

  return {
    ok: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
    warnings,
    checks,
  };
}
