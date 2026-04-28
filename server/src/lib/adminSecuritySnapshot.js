/**
 * Safe operator snapshot of admin security controls (no secrets).
 */

import { env } from '../config/env.js';
import { isAdminIpAllowlistActive } from '../middleware/adminIpAllowlist.js';
import { getAdminAuthModeSummary } from '../middleware/adminSecretAuth.js';

export const WEBTOPUP_ADMIN_RATE_WINDOW_MS = 15 * 60 * 1000;

function allowWebtopTestEnvOverrides() {
  return (
    process.env.NODE_ENV === 'test' || process.env.npm_lifecycle_event === 'test'
  );
}

/**
 * Production/staging: values from frozen `webtopConfig` via `env`.
 * Under the test runner (`NODE_ENV=test` or `npm test`), honor live `process.env` so integration tests can tune limits without reloading modules.
 */
export function getWebtopupAdminMutationMaxPerWindow() {
  if (allowWebtopTestEnvOverrides()) {
    const raw = process.env.WEBTOPUP_ADMIN_MUTATION_MAX_PER_15M;
    if (raw !== undefined && raw !== '') {
      const n = parseInt(String(raw), 10);
      if (Number.isFinite(n) && n >= 1) return Math.min(10_000, n);
    }
  }
  return env.webtopupAdminMutationMaxPer15m;
}

export function getWebtopupAdminReadMaxPerWindow() {
  if (allowWebtopTestEnvOverrides()) {
    const raw = process.env.WEBTOPUP_ADMIN_READ_MAX_PER_15M;
    if (raw !== undefined && raw !== '') {
      const n = parseInt(String(raw), 10);
      if (Number.isFinite(n) && n >= 1) return Math.min(50_000, n);
    }
  }
  return env.webtopupAdminReadMaxPer15m;
}

export function getAdminSecuritySnapshot() {
  const auth = getAdminAuthModeSummary();
  const allowActive = isAdminIpAllowlistActive();
  return {
    auth,
    ipAllowlist: {
      enabled: allowActive,
      entryCount: allowActive ? String(process.env.ADMIN_ALLOWED_IPS ?? '').split(',').filter((x) => x.trim()).length : 0,
    },
    rateLimits: {
      windowMs: WEBTOPUP_ADMIN_RATE_WINDOW_MS,
      webtopupAdminMutationMaxPerWindow: getWebtopupAdminMutationMaxPerWindow(),
      webtopupAdminReadMaxPerWindow: getWebtopupAdminReadMaxPerWindow(),
    },
  };
}
