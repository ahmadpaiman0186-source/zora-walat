/**
 * Sanitize zw-doctor / smoke JSON for Ap786 archives (no secrets, suffix-only Stripe ids).
 */
import { redactSecrets } from './redact.mjs';
import {
  buildJwtMaterialPattern,
  buildLiveStripeSecretPattern,
} from './secretPatterns.mjs';

const SENSITIVE_KEY_RE =
  /secret|password|token|authorization|database_url|db_url|api_key|bearer|jwt|cookie|credential/i;

const STRIPE_ID_RE =
  /\b(pi|cs|ch|evt|re|seti|sub|cus|in)_[A-Za-z0-9]{8,}\b/g;

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_RE = /\b\+?[0-9][0-9\s\-()]{8,}[0-9]\b/g;

const WEBHOOK_PAYLOAD_KEYS = new Set([
  'rawBody',
  'raw_body',
  'webhookPayload',
  'webhook_payload',
  'stripeEvent',
  'stripe_event',
]);

/**
 * @param {string} id
 */
export function stripeIdToSuffix(id) {
  const s = String(id ?? '').trim();
  if (!s || s.length < 8) return s ? '[redacted_short]' : '';
  return `…${s.slice(-8)}`;
}

/**
 * @param {unknown} value
 * @param {string} key
 * @returns {unknown}
 */
function sanitizeValue(value, key) {
  if (value == null) return value;

  if (WEBHOOK_PAYLOAD_KEYS.has(key)) {
    return '[REDACTED_WEBHOOK_PAYLOAD]';
  }

  if (typeof value === 'string') {
    let s = value;
    if (SENSITIVE_KEY_RE.test(key)) {
      return '[REDACTED_SENSITIVE_FIELD]';
    }
    s = s.replace(STRIPE_ID_RE, (m) => stripeIdToSuffix(m));
    s = s.replace(EMAIL_RE, '[REDACTED_EMAIL]');
    s = s.replace(PHONE_RE, '[REDACTED_PHONE]');
    return redactSecrets(s);
  }

  if (Array.isArray(value)) {
    return value.map((item, i) => sanitizeValue(item, `${key}[${i}]`));
  }

  if (typeof value === 'object') {
    return sanitizeObject(value);
  }

  return value;
}

/**
 * @param {Record<string, unknown>} obj
 */
export function sanitizeObject(obj) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (WEBHOOK_PAYLOAD_KEYS.has(k)) {
      out[k] = '[REDACTED_WEBHOOK_PAYLOAD]';
      continue;
    }
    out[k] = sanitizeValue(v, k);
  }
  return out;
}

/**
 * @param {import('./types.mjs').ZwDoctorReport} report
 */
export function sanitizeZwDoctorReport(report) {
  const cloned = structuredClone(report);
  cloned.invariants = cloned.invariants.map((inv) => ({
    ...inv,
    evidence: redactSecrets(
      String(inv.evidence ?? '').replace(STRIPE_ID_RE, (m) => stripeIdToSuffix(m)),
    ),
    proposed_next_action: redactSecrets(String(inv.proposed_next_action ?? '')),
    risk: redactSecrets(String(inv.risk ?? '')),
  }));
  cloned.proposals = cloned.proposals.map((p) => ({
    ...p,
    title: redactSecrets(String(p.title ?? '')),
    steps: (p.steps ?? []).map((step) => redactSecrets(String(step))),
  }));
  return sanitizeObject(cloned);
}

/**
 * @param {unknown} report
 */
export function assertSanitizedReportSafe(report) {
  const blob = JSON.stringify(report);
  if (blob.length > 500_000) {
    throw new Error('sanitized_report_too_large');
  }
  if (buildLiveStripeSecretPattern().test(blob)) {
    throw new Error('sanitized_report_contains_stripe_key_material');
  }
  if (buildJwtMaterialPattern().test(blob)) {
    throw new Error('sanitized_report_contains_jwt_material');
  }
  const whPrefix = `${['wh', 'sec'].join('')}_`;
  if (new RegExp(`\\b${whPrefix}[A-Za-z0-9]{20,}\\b`).test(blob)) {
    throw new Error('sanitized_report_contains_webhook_secret_material');
  }
  if (/\bpostgresql:\/\//i.test(blob)) {
    throw new Error('sanitized_report_contains_database_url');
  }
}
