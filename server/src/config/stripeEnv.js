import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Stripe secret key resolution (single source for the backend).
 * Prefer: env (after bootstrap loads server/.env), then server/stripe_secret.key.
 */

const PLACEHOLDER_FRAGMENTS = [
  'your_real',
  'your_secret',
  'placeholder',
  'replace_me',
  'sk_test_replace',
  'sk_live_replace',
  'real_key',
  'changeme',
  'xxx',
  'example',
];

/**
 * @param {string | undefined} raw
 * @returns {string | null} Trimmed secret or null if missing / invalid / placeholder.
 */
export function effectiveStripeSecretKey(raw) {
  let k = String(raw ?? '').trim();
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim();
  }
  if (!k) return null;
  const lower = k.toLowerCase();
  if (PLACEHOLDER_FRAGMENTS.some((frag) => lower.includes(frag))) return null;
  if (
    !k.startsWith('sk_test_') &&
    !k.startsWith('sk_live_') &&
    !k.startsWith('rk_test_') &&
    !k.startsWith('rk_live_')
  ) {
    return null;
  }
  /** Stripe secret / restricted keys are long; keep a floor without rejecting valid keys. */
  if (k.length < 60) return null;
  return k;
}

/** Single-line file at server/stripe_secret.key (gitignored). */
function readStripeSecretKeyFile() {
  const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const p = join(serverRoot, 'stripe_secret.key');
  if (!existsSync(p)) return null;
  try {
    const v = readFileSync(p, 'utf8').trim();
    return v || null;
  } catch {
    return null;
  }
}

/**
 * Raw env value or file contents (may be invalid). Used only after bootstrap.
 */
export function resolveStripeSecretRaw() {
  const env = String(process.env.STRIPE_SECRET_KEY ?? '').trim();
  const file = readStripeSecretKeyFile();
  if (effectiveStripeSecretKey(env)) return env;
  if (file && effectiveStripeSecretKey(file)) return file;
  return env || file || '';
}

/** One validated secret for Stripe SDK, or null. */
export function getValidatedStripeSecretKey() {
  return effectiveStripeSecretKey(resolveStripeSecretRaw());
}

/**
 * Web top-up (embedded Payment Element + server PI verification) may use test or live
 * keys. Test/restricted-test keys are allowed in any NODE_ENV. Live/restricted-live
 * keys are allowed only when NODE_ENV is production so preview/dev cannot charge live.
 */
export function isStripeKeyAllowedForWebTopupCharges() {
  const secret = getValidatedStripeSecretKey();
  if (!secret) return false;
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (secret.startsWith('sk_test_') || secret.startsWith('rk_test_')) {
    return true;
  }
  if (secret.startsWith('sk_live_') || secret.startsWith('rk_live_')) {
    return nodeEnv === 'production';
  }
  return false;
}

/**
 * Hosted Stripe Checkout (redirect) may use test or live keys.
 * Safety invariant: refuse live keys unless `NODE_ENV=production` to prevent accidental real charges
 * from preview/dev deployments.
 */
export function isStripeKeyAllowedForHostedCheckout() {
  const secret = getValidatedStripeSecretKey();
  if (!secret) return false;
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (secret.startsWith('sk_test_') || secret.startsWith('rk_test_')) {
    return true;
  }
  if (secret.startsWith('sk_live_') || secret.startsWith('rk_live_')) {
    return nodeEnv === 'production';
  }
  return false;
}
