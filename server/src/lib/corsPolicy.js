import { env } from '../config/env.js';

/** Allowed browser origins when `PRELAUNCH_LOCKDOWN=true` (exact match only). */
export const PRELAUNCH_CORS_ALLOWLIST = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

/**
 * Production guard: reject wildcard or empty origin entries in `CORS_ORIGINS`.
 * @param {string[]} origins Parsed list (e.g. `env.corsOrigins`)
 * @returns {boolean}
 */
export function corsOriginsHaveNoWildcards(origins) {
  for (const raw of origins) {
    const o = String(raw ?? '').trim();
    if (o === '' || o === '*' || o.includes('*')) {
      return false;
    }
  }
  return true;
}

/**
 * When pre-launch lockdown is on, `CORS_ORIGINS` must match this set exactly (order-independent).
 */
export function corsOriginsMatchPrelaunchAllowlist(origins) {
  const a = new Set(
    origins.map((x) => String(x ?? '').trim()).filter(Boolean),
  );
  const b = new Set(PRELAUNCH_CORS_ALLOWLIST);
  if (a.size !== b.size) return false;
  for (const x of a) {
    if (!b.has(x)) return false;
  }
  return true;
}

/**
 * Same rules as Express `cors` origin callback — used for security logging only.
 */
export function isCorsOriginAllowed(origin) {
  if (env.prelaunchLockdown) {
    if (!origin) return true;
    if (PRELAUNCH_CORS_ALLOWLIST.includes(origin)) return true;
    /**
     * Local Flutter web (`flutter run -d chrome`) uses variable ports (not only :3000).
     * Pre-launch still locks money routes; we only broaden browser Origin matching for dev machines.
     */
    if (env.nodeEnv !== 'production') {
      try {
        const u = new URL(origin);
        if (
          (u.hostname === 'localhost' || u.hostname === '127.0.0.1') &&
          (u.protocol === 'http:' || u.protocol === 'https:')
        ) {
          return true;
        }
      } catch {
        /* ignore */
      }
    }
    return false;
  }
  if (!origin) return true;
  if (env.corsOrigins.includes(origin)) return true;
  /** Production: allow browser Origin that matches CLIENT_URL (same site as checkout redirects). */
  if (env.nodeEnv === 'production' && env.clientUrl) {
    try {
      if (new URL(env.clientUrl).origin === origin) return true;
    } catch {
      /* ignore invalid CLIENT_URL */
    }
  }
  // Non-production: allow any http(s) origin on localhost / 127.0.0.1 (variable port) for local/staging web.
  // Production never hits this branch for disallowed origins — list explicit CORS_ORIGINS only.
  if (env.nodeEnv !== 'production') {
    try {
      const u = new URL(origin);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        return true;
      }
    } catch {
      /* ignore */
    }
  }
  return false;
}

/** Log-safe hostname from an Origin header (no path/credentials). */
export function originHostnameForLog(origin) {
  try {
    return new URL(origin).hostname;
  } catch {
    return 'invalid-origin';
  }
}
