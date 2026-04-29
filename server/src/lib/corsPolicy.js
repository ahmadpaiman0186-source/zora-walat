import { env } from '../config/env.js';

/** Allowed browser origins when `PRELAUNCH_LOCKDOWN=true` (exact match only). */
export const PRELAUNCH_CORS_ALLOWLIST = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

/**
 * Strict loopback match for the production opt-in override only:
 * `http://localhost:<port>` or `http://127.0.0.1:<port>` (no https, no IPv6, no 0.0.0.0).
 * @param {string} origin
 * @returns {boolean}
 */
export function isStrictLoopbackHttpOrigin(origin) {
  try {
    const u = new URL(origin);
    if (u.protocol !== 'http:') return false;
    if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') return false;
    if (u.username || u.password) return false;
    return true;
  } catch {
    return false;
  }
}

function isNonProductionLoopbackOrigin(origin) {
  try {
    const u = new URL(origin);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Pre-launch dev: allow http(s) on loopback (variable port) when not production.
 * @param {string} origin
 */
function isPrelaunchDevLoopbackHttpOrHttps(origin) {
  try {
    const u = new URL(origin);
    if (
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1') &&
      (u.protocol === 'http:' || u.protocol === 'https:')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * @typedef {{ allowed: boolean, reason: string, CORS_ALLOW: boolean }} CorsAllowDecision
 * `CORS_ALLOW` mirrors `allowed` (explicit for log grep).
 */

/**
 * Authoritative CORS allow/deny with machine-readable `reason` for debug logs and audits.
 * @param {string | undefined} origin
 * @returns {CorsAllowDecision}
 */
export function getCorsAllowDecision(origin) {
  if (env.prelaunchLockdown) {
    if (!origin) {
      return { allowed: true, CORS_ALLOW: true, reason: 'no_origin' };
    }
    if (PRELAUNCH_CORS_ALLOWLIST.includes(origin)) {
      return { allowed: true, CORS_ALLOW: true, reason: 'prelaunch_allowlist' };
    }
    if (env.nodeEnv !== 'production') {
      if (isPrelaunchDevLoopbackHttpOrHttps(origin)) {
        return { allowed: true, CORS_ALLOW: true, reason: 'prelaunch_dev_loopback' };
      }
    }
    return { allowed: false, CORS_ALLOW: false, reason: 'denied' };
  }
  if (!origin) {
    return { allowed: true, CORS_ALLOW: true, reason: 'no_origin' };
  }
  if (env.corsOrigins.includes(origin)) {
    return { allowed: true, CORS_ALLOW: true, reason: 'whitelist_cors_origins' };
  }
  if (env.nodeEnv === 'production' && env.clientUrl) {
    try {
      if (new URL(env.clientUrl).origin === origin) {
        return { allowed: true, CORS_ALLOW: true, reason: 'whitelist_client_url' };
      }
    } catch {
      /* invalid CLIENT_URL */
    }
  }
  if (env.nodeEnv === 'production' && env.allowLocalFlutterWebCorsInProduction) {
    if (isStrictLoopbackHttpOrigin(origin)) {
      return { allowed: true, CORS_ALLOW: true, reason: 'local_override' };
    }
  }
  if (env.nodeEnv !== 'production') {
    if (isNonProductionLoopbackOrigin(origin)) {
      return { allowed: true, CORS_ALLOW: true, reason: 'nonprod_localhost' };
    }
  }
  return { allowed: false, CORS_ALLOW: false, reason: 'denied' };
}

/**
 * @deprecated Use {@link getCorsAllowDecision}. Kept for call sites and tests.
 * @param {string | undefined} origin
 * @returns {boolean}
 */
export function isCorsOriginAllowed(origin) {
  return getCorsAllowDecision(origin).allowed;
}

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
 * Fails the process if `ZW_ALLOW_LOCAL_FLUTTER_WEB_CORS` is set in the shell but not bound
 * in `env.js`, or if the local-override path does not allow a dedicated probe origin in production.
 */
export function assertLocalCorsOverrideWiredOrExit() {
  const raw = String(process.env.ZW_ALLOW_LOCAL_FLUTTER_WEB_CORS ?? '').trim();
  if (raw === '') return;
  if (raw !== 'true') {
    console.error(
      '[fatal] ZW_ALLOW_LOCAL_FLUTTER_WEB_CORS is set but must be exactly the string "true" (got: %j)',
      raw,
    );
    process.exit(1);
  }
  if (!env.allowLocalFlutterWebCorsInProduction) {
    console.error(
      '[fatal] ZW_ALLOW_LOCAL_FLUTTER_WEB_CORS=true in process.env but env.allowLocalFlutterWebCorsInProduction is false — check server/src/config/env.js binding',
    );
    process.exit(1);
  }
  if (env.nodeEnv === 'production') {
    if (!isStrictLoopbackHttpOrigin('http://127.0.0.1:1')) {
      console.error('[fatal] internal: isStrictLoopbackHttpOrigin broken');
      process.exit(1);
    }
    const probe = 'http://127.0.0.1:1';
    const d = getCorsAllowDecision(probe);
    if (!d.allowed) {
      console.error(
        '[fatal] local CORS override is enabled in production but probe origin %s was denied (reason=%s) — check CORS wiring',
        probe,
        d.reason,
      );
      process.exit(1);
    }
  }
  if (process.env.NODE_ENV !== 'test') {
    console.log(
      '[startup] local CORS override ENABLED (ZW_ALLOW_LOCAL_FLUTTER_WEB_CORS) — http://localhost and http://127.0.0.1 only, any port; set flag off in real production',
    );
  }
}

/** Log-safe hostname from an Origin header (no path/credentials). */
export function originHostnameForLog(origin) {
  try {
    return new URL(origin).hostname;
  } catch {
    return 'invalid-origin';
  }
}
