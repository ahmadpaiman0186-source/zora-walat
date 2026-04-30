/**
 * Loaded first from server/index.js. Loads `server/.env`, then optional `server/.env.local`
 * (override). All `src/` code should see `process.env` after this runs.
 */
import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

/** True when `STRIPE_WEBHOOK_SECRET` was set before bootstrap and restored after dotenv (local/CI listen alignment). */
let stripeWebhookSecretEffectiveSource = 'dotenv_or_platform';
if (
  inheritedStripeWebhookSecret.startsWith('whsec_') &&
  inheritedStripeWebhookSecret.length >= 20
) {
  process.env.STRIPE_WEBHOOK_SECRET = inheritedStripeWebhookSecret;
  stripeWebhookSecretEffectiveSource = 'process_inheritance';
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
          ? 'verification codes print on this Node process (not the Flutter terminal).'
          : 'for local OTP in this terminal, set OTP_TRANSPORT=console in server/.env.local'
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
      '❌ STRIPE_SECRET_KEY missing — copy sk_test_… from the Stripe Dashboard into server/.env and restart the server.',
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

/** Share Redis rate-limit connection across any entry that imports bootstrap before `app.js` (API, smoke scripts, prisma-cli). */
await import('./src/lib/rateLimitRedisInit.js').then((m) =>
  m.initRateLimitRedisOptional(),
);
