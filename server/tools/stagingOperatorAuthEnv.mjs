/**
 * Staging operator auth env + JWT diagnostics (no secrets in logs).
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

export const LOGIN_API_PATH = '/api/auth/login';

/**
 * Load server/.env then server/.env.local (override). Does not print values.
 * @param {string} serverRoot
 */
export function loadOperatorDotenv(serverRoot) {
  /**
   * Stripe / general config: `.env` fills unset vars; `.env.local` overrides `.env`.
   * Shell `STRIPE_SECRET_KEY` (set before node) is preserved — not overwritten by `.env`.
   * Operator email/password: when present in shell before node (including explicit empty),
   * file loads must not clobber them — empty password stays fail-closed local validation.
   */
  const shellOperatorKeys = ['STAGING_OPERATOR_EMAIL', 'STAGING_OPERATOR_PASSWORD'];
  /** @type {Record<string, string | undefined>} */
  const shellOperatorValues = {};
  for (const key of shellOperatorKeys) {
    if (Object.hasOwn(process.env, key)) {
      shellOperatorValues[key] = process.env[key];
    }
  }

  dotenv.config({ path: resolve(serverRoot, '.env'), override: false });
  const localPath = resolve(serverRoot, '.env.local');
  if (existsSync(localPath)) {
    dotenv.config({ path: localPath, override: true });
  }

  for (const key of shellOperatorKeys) {
    if (Object.hasOwn(shellOperatorValues, key)) {
      process.env[key] = shellOperatorValues[key];
    }
  }
}

/**
 * @param {NodeJS.ProcessEnv} env
 */
export function readOperatorEmail(env) {
  return String(env.STAGING_OPERATOR_EMAIL ?? '').trim();
}

/**
 * @param {NodeJS.ProcessEnv} env
 */
export function readOperatorPassword(env) {
  return String(env.STAGING_OPERATOR_PASSWORD ?? '').trim();
}

/**
 * @param {NodeJS.ProcessEnv} env
 */
export function credentialEnvDiagnostics(env) {
  const email = readOperatorEmail(env);
  const password = readOperatorPassword(env);
  return {
    hasEmail: email.length > 0,
    hasPassword: password.length > 0,
    passwordLength: password.length,
    emailLength: email.length,
  };
}

/**
 * Decode JWT payload without verification (exp diagnostics only).
 * @param {string} token
 */
export function decodeJwtClaimsUnsafe(token) {
  const t = String(token ?? '').trim();
  const parts = t.split('.');
  if (parts.length !== 3) return null;
  let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  b64 += pad;
  try {
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * @param {string} token
 * @returns {string | null} ISO-8601 expiry when claim present
 */
export function accessTokenExpiryIso(token) {
  const claims = decodeJwtClaimsUnsafe(token);
  if (!claims || typeof claims.exp !== 'number') return null;
  return new Date(claims.exp * 1000).toISOString();
}

/**
 * @param {string} token
 * @param {number} [skewSec]
 * @returns {boolean | null} null when exp claim missing
 */
export function isAccessTokenExpired(token, skewSec = 30) {
  const claims = decodeJwtClaimsUnsafe(token);
  if (!claims || typeof claims.exp !== 'number') return null;
  return Date.now() >= (claims.exp - skewSec) * 1000;
}

/**
 * @param {string} token
 */
export function classifyStoredToken(token) {
  const t = String(token ?? '').trim();
  if (!t) return 'missing';
  const expired = isAccessTokenExpired(t);
  if (expired === true) return 'expired';
  if (expired === false) return 'present';
  return 'present_unknown_exp';
}

/** Safe PowerShell env setup lines (no secret values). */
export function windowsEnvSetupHintLines() {
  return [
    'WINDOWS_POWERSHELL_EXAMPLE',
    '$env:STAGING_OPERATOR_EMAIL = "you@example.com"',
    '$env:STAGING_OPERATOR_PASSWORD = "YourStagingPassword"',
    'node tools/staging-auth-checkout-operator.mjs auth-env-check',
    'node tools/staging-auth-checkout-operator.mjs login',
  ];
}
