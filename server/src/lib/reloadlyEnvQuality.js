import { env } from '../config/env.js';

/** Substrings that strongly suggest template / docs values, not live Reloadly credentials. */
const TEMPLATE_MARKERS = [
  'your_real',
  'changeme',
  'placeholder',
  'real_id',
  'example',
  'todo:',
  'todo ',
  'xxx',
  'fill_me',
  'replace_me',
  'dummy',
  'skiptest',
];

function valueLooksLikeTemplate(value) {
  const s = String(value ?? '').trim().toLowerCase();
  if (!s) return false;
  return TEMPLATE_MARKERS.some((m) => s.includes(m));
}

/**
 * Non-secret quality checks for operator clarity (dev/staging). Never logs raw env values.
 * @returns {string[]} Human-readable issue lines; empty if none.
 */
export function getReloadlyEnvQualityIssues() {
  const issues = [];
  if (valueLooksLikeTemplate(env.reloadlyClientId)) {
    issues.push('RELOADLY_CLIENT_ID appears to be a template or placeholder');
  }
  if (valueLooksLikeTemplate(env.reloadlyClientSecret)) {
    issues.push('RELOADLY_CLIENT_SECRET appears to be a template or placeholder');
  }
  const map = env.reloadlyOperatorMap;
  if (map && typeof map === 'object' && !Array.isArray(map)) {
    for (const [k, v] of Object.entries(map)) {
      if (valueLooksLikeTemplate(v)) {
        issues.push(
          `RELOADLY operator map key "${String(k).slice(0, 48)}" maps to a template value`,
        );
        break;
      }
    }
  }
  return issues;
}

/** Warn once at startup when Reloadly is selected but env looks like docs, not production credentials. */
export function logReloadlyEnvQualityWarningsIfDev() {
  if (env.nodeEnv === 'production' || env.nodeEnv === 'test') return;
  const webTopup = String(env.webTopupFulfillmentProvider ?? '').trim().toLowerCase();
  const usesReloadly = env.airtimeProvider === 'reloadly' || webTopup === 'reloadly';
  if (!usesReloadly) return;
  const issues = getReloadlyEnvQualityIssues();
  if (issues.length === 0) return;
  console.warn(
    '[startup] reloadly_env_quality: Reloadly is enabled but some values look like placeholders — real top-ups may fail until credentials and operator IDs are real.',
  );
  for (const line of issues) {
    console.warn(`[startup] reloadly_env_quality: • ${line}`);
  }
}
