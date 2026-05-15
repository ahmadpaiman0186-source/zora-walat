/**
 * Loaded first from server/index.js. Loads `server/.env`, then optional `server/.env.local`
 * (override). All `src/` code should see `process.env` after this runs.
 */
import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

console.log('[startup] phase=entry_start');

const serverRoot = dirname(fileURLToPath(import.meta.url));
/**
 * Development uses `override: true` so `server/.env` wins over stale shell vars (e.g. DATABASE_URL).
 * Stripe CLI `stripe listen` emits a **new** `whsec_` per session; automation and operators sometimes
 * inject `STRIPE_WEBHOOK_SECRET` into the process environment before Node starts. That value must
 * win over the copy in `.env`, or signature verification fails until `.env` is edited and the server
 * is restarted.
 */
const inheritedStripeWebhookSecret = String(
  process.env.STRIPE_WEBHOOK_SECRET ?? '',
).trim();
/** Preserved when non-empty so dev `dotenv` override does not clobber e.g. `PORT=8798` from a proof child process. */
const inheritedPort = String(process.env.PORT ?? '').trim();
const dotenvQuiet =
  String(process.env.FORTRESS_PROBE_QUIET ?? '')
    .trim()
    .toLowerCase() === 'true';
/** In development, suppress dotenv marketing/tips on stdout; errors still surface via `loaded.error`. */
const dotenvQuietDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
console.log('[startup] phase=env_validate_start');
const loaded = dotenv.config({
  path: join(serverRoot, '.env'),
  /** In development, prefer `server/.env` over inherited shell (stale DATABASE_URL). Production keeps platform env. */
  override: process.env.NODE_ENV !== 'production',
  quiet: dotenvQuiet || dotenvQuietDev,
});
if (loaded.error) {
  console.warn('[dotenv]', loaded.error.message);
}
const envLocalLoaded = existsSync(join(serverRoot, '.env.local'));
if (envLocalLoaded) {
  dotenv.config({
    path: join(serverRoot, '.env.local'),
    override: true,
    quiet: dotenvQuiet || dotenvQuietDev,
  });
}
console.log('[startup] phase=env_validate_done');

/**
 * After `.env` + `.env.local`, pin a supervised production-like profile for
 * `npm run proof:live-simulation-local` (test Stripe + no outbound) without editing local files.
 */
if (String(process.env.ZW_LIVE_SIMULATION_PROOF ?? '').trim().toLowerCase() === 'true') {
  process.env.NODE_ENV = 'production';
  process.env.ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION = 'true';
  process.env.PRELAUNCH_LOCKDOWN = 'false';
  process.env.PAYMENTS_LOCKDOWN_MODE = 'false';
  process.env.DEV_CHECKOUT_AUTH_BYPASS = 'false';
  process.env.ZW_ALLOW_LOCAL_FLUTTER_WEB_CORS = 'false';
  process.env.PHASE1_FULFILLMENT_OUTBOUND_ENABLED = 'false';
}

/** Paths only (no secrets) — for startup diagnostics. */
export const zwDotenvBootstrapReport = Object.freeze({
  serverRoot,
  dotEnvPath: join(serverRoot, '.env'),
  dotEnvLocalPath: join(serverRoot, '.env.local'),
  dotEnvLocalFileExistedAtBoot: envLocalLoaded,
});

/** True when `STRIPE_WEBHOOK_SECRET` was set before bootstrap and restored after dotenv (local/CI listen alignment). */
let stripeWebhookSecretEffectiveSource = 'dotenv_or_platform';
if (
  inheritedStripeWebhookSecret.startsWith('whsec_') &&
  inheritedStripeWebhookSecret.length >= 20
) {
  process.env.STRIPE_WEBHOOK_SECRET = inheritedStripeWebhookSecret;
  stripeWebhookSecretEffectiveSource = 'process_inheritance';
}

/**
 * Live simulation proof (`ZW_LIVE_SIMULATION_PROOF=true`): test Stripe keys only, no Reloadly outbound.
 * When dotenv leaves a non-whsec or too-short placeholder in STRIPE_WEBHOOK_SECRET, pin a well-formed
 * synthetic signing secret so in-process webhook verification exercises real crypto (still test-mode keys).
 */
if (String(process.env.ZW_LIVE_SIMULATION_PROOF ?? '').trim().toLowerCase() === 'true') {
  const whAfter = String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();
  const skSim = String(process.env.STRIPE_SECRET_KEY ?? '').trim();
  const testStripeSecret =
    (skSim.startsWith('sk_test_') || skSim.startsWith('rk_test_')) &&
    skSim.length >= 60;
  if (
    testStripeSecret &&
    (!whAfter.startsWith('whsec_') || whAfter.length < 20)
  ) {
    process.env.STRIPE_WEBHOOK_SECRET =
      'whsec_test_synthetic_live_simulation_proof_webhook_01';
  }
}

if (inheritedPort) {
  process.env.PORT = inheritedPort;
}

const isPrismaCliTooling =
  String(process.env.ZW_PRISMA_CLI ?? '').trim() === '1';

if (process.env.NODE_ENV !== 'test' && !isPrismaCliTooling) {
  console.log(
    `[env] ZW_ALLOW_LOCAL_FLUTTER_WEB_CORS=${String(process.env.ZW_ALLOW_LOCAL_FLUTTER_WEB_CORS ?? '')}`,
  );
  console.log(`[env] NODE_ENV=${String(process.env.NODE_ENV ?? '')}`);
  if (process.env.NODE_ENV !== 'test') {
    const ot = String(process.env.OTP_TRANSPORT ?? '')
      .trim()
      .toLowerCase();
    console.log(
      `[env] OTP_TRANSPORT=${ot || '(unset)'} — ${
        ot === 'console'
          ? 'codes print on this Node process only (not email).'
          : 'SMTP send path; set OTP_TRANSPORT=console for terminal-only codes in dev.'
      }`,
    );
  }
  const port = String(process.env.PORT ?? '').trim();
  if (!port) {
    console.log('[env] PORT unset — using default 8787 (set PORT=8787 in server/.env if you want it explicit)');
  }
  const sk = String(process.env.STRIPE_SECRET_KEY ?? '').trim();
  if (!sk) {
    console.error(
      '❌ STRIPE_SECRET_KEY missing — add your Stripe test secret from the Dashboard to server/.env and restart the server.',
    );
  }
  if (envLocalLoaded) {
    console.warn(
      '[env] server/.env.local exists — it is loaded AFTER server/.env and OVERRIDES duplicate keys (including STRIPE_WEBHOOK_SECRET). Edit the file that actually wins.',
    );
  }
  const whsec = String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();
  const webhookHelp =
    'Run:\n' +
    'stripe listen --forward-to http://127.0.0.1:8787/webhooks/stripe\n' +
    'Copy the whsec_... from that SAME running window into server/.env as:\n' +
    'STRIPE_WEBHOOK_SECRET=whsec_...\n' +
    'Save the file.\n' +
    'Restart the server.';
  if (!whsec) {
    console.error(
      `❌ STRIPE_WEBHOOK_SECRET missing or empty.\n${webhookHelp}`,
    );
  } else if (!whsec.startsWith('whsec_')) {
    console.error(
      `❌ STRIPE_WEBHOOK_SECRET is invalid or placeholder (must start with whsec_).\n${webhookHelp}`,
    );
  } else {
    const tail =
      whsec.length >= 10 ? whsec.slice(-6) : '???';
    const src =
      stripeWebhookSecretEffectiveSource === 'process_inheritance'
        ? 'effective=process_inheritance (not overwritten by server/.env — use for Stripe CLI session alignment)'
        : 'effective=dotenv_or_shell';
    console.log(
      `[env] STRIPE_WEBHOOK_SECRET loaded (${src}; prefix=whsec_, len=${whsec.length}, tail=…${tail}) — must match the **active** stripe listen session exactly; restart Node after any whsec change`,
    );
  }
}

/**
 * DB is validated in `createValidatedApp` / slim `/ready` — bootstrap stays non-blocking for Prisma.
 */
console.log('[startup] phase=db_validate_skipped note=runtime_gates');
console.log('[startup] phase=prisma_init_skipped note=lazy_factory');

/** Share Redis rate-limit connection across any entry that imports bootstrap before `app.js` (API, smoke scripts, prisma-cli). */
console.log('[startup] phase=redis_rate_limit_start');
await import('./src/lib/rateLimitRedisInit.js').then((m) =>
  m.initRateLimitRedisOptional(),
);
console.log('[startup] phase=redis_rate_limit_done');
