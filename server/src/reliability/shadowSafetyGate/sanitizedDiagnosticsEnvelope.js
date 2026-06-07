/**
 * L-80 sanitized shadow diagnostics envelope — safe for non-prod observability logs.
 * No raw Stripe payloads, secrets, full IDs, headers, or PII.
 */
import { createHash } from 'node:crypto';

export const SANITIZED_SHADOW_DIAGNOSTICS_ENVELOPE_VERSION = 1;

const SECRET_PATTERN =
  /\b(sk_live_[a-zA-Z0-9]+|sk_test_[a-zA-Z0-9]+|pk_live_[a-zA-Z0-9]+|pk_test_[a-zA-Z0-9]+|rk_live_[a-zA-Z0-9]+|rk_test_[a-zA-Z0-9]+|whsec_[a-zA-Z0-9_]+)\b/gi;

const BEARER_PATTERN = /\bBearer\s+[a-zA-Z0-9._\-+/=]+\b/gi;

const STRIPE_ID_PATTERN =
  /\b(acct_|evt_|cus_|cs_|pi_|ch_|sub_|price_|prod_)[a-zA-Z0-9_]+\b/g;

const URL_PATTERN = /https?:\/\/[^\s"'<>]+/gi;

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const PHONE_PATTERN = /\+?\d[\d\s().-]{7,}\d/g;

/**
 * Deterministic correlation fingerprint (never reverses to raw IDs).
 * @param {string[]} parts
 */
export function fingerprintCorrelation(parts) {
  const material = parts.filter(Boolean).join('|');
  if (!material) return 'fp_empty';
  return createHash('sha256').update(material, 'utf8').digest('hex').slice(0, 16);
}

/**
 * Defense-in-depth string redaction for log serialization.
 * @param {string} value
 */
export function redactSensitiveString(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(SECRET_PATTERN, '[redacted_secret]')
    .replace(BEARER_PATTERN, '[redacted_bearer]')
    .replace(STRIPE_ID_PATTERN, '[redacted_stripe_id]')
    .replace(URL_PATTERN, '[redacted_url]')
    .replace(EMAIL_PATTERN, '[redacted_email]')
    .replace(PHONE_PATTERN, '[redacted_phone]');
}

/**
 * @param {import('./types.js').ShadowSafetyGateReport} report
 */
function extractReasonCodes(report) {
  const codes = [];
  const idem = report.wiredPathReport?.idempotencyDecision;
  const delivery = report.wiredPathReport?.deliveryDecision;
  if (idem?.code) codes.push(String(idem.code));
  if (delivery?.code) codes.push(String(delivery.code));
  return [...new Set(codes)];
}

/**
 * @param {import('./types.js').ShadowSafetyGateReport} report
 */
function classifyScenario(report) {
  const idemDecision = report.wiredPathReport?.idempotencyDecision?.decision;
  const deliveryDecision = report.wiredPathReport?.deliveryDecision?.decision;

  if (idemDecision === 'BLOCK_DUPLICATE') return 'duplicate_webhook_or_attempt';
  if (idemDecision === 'BLOCK_AMBIGUOUS' || idemDecision === 'RETRY_UNSAFE') {
    return 'idempotency_blocked';
  }
  if (deliveryDecision && deliveryDecision !== 'ALLOW_DELIVERY') {
    return 'payment_or_delivery_blocked';
  }
  if (report.fulfillmentIntentAllowed) return 'paid_valid_unique';
  return 'blocked_other';
}

/**
 * @param {import('./types.js').ShadowSafetyGateReport} report
 */
function classifyEventType(report) {
  const raw = report.diagnostics?.stripeEventType;
  if (typeof raw === 'string' && raw.length > 0 && raw.length <= 80) {
    return raw;
  }
  return 'unknown_event_type';
}

/**
 * Build a sanitized observability envelope from a shadow gate report.
 *
 * @param {{
 *   report: import('./types.js').ShadowSafetyGateReport,
 *   shadowModeEnabled: boolean,
 *   component?: string,
 *   correlationMaterial?: { orderId?: string, eventId?: string, eventType?: string },
 *   evaluatedAt?: string,
 * }} params
 */
export function buildSanitizedShadowDiagnosticsEnvelope(params) {
  const { report, shadowModeEnabled } = params;
  const component = params.component ?? 'shadow_safety_gate_webhook_boundary';
  const material = params.correlationMaterial ?? {};
  const idem = report.wiredPathReport.idempotencyDecision;
  const delivery = report.wiredPathReport.deliveryDecision;

  return Object.freeze({
    envelopeVersion: SANITIZED_SHADOW_DIAGNOSTICS_ENVELOPE_VERSION,
    component,
    source: 'shadow_safety_gate',
    timestamp: params.evaluatedAt ?? new Date().toISOString(),
    shadowModeEnabled: shadowModeEnabled === true,
    verdict: report.fulfillmentIntentAllowed ? 'ALLOW' : 'BLOCK',
    reasonCodes: extractReasonCodes(report),
    eventTypeClassification: classifyEventType(report),
    scenarioClassification: classifyScenario(report),
    correlationFingerprint: fingerprintCorrelation([
      material.eventType,
      material.orderId,
      material.eventId,
      report.scenarioId,
    ]),
    wouldScheduleFulfillment: false,
    fulfillmentIntentAllowed: report.fulfillmentIntentAllowed === true,
    idempotencyDecision: idem?.decision ?? 'UNKNOWN',
    deliveryDecision: delivery?.decision ?? 'UNKNOWN',
    boundary: report.boundary ?? 'unknown',
    liveRouteEnforcement: false,
    diagnosticsOnly: true,
  });
}

/**
 * JSON-safe log payload with defense-in-depth redaction on serialized output.
 * @param {ReturnType<typeof buildSanitizedShadowDiagnosticsEnvelope>} envelope
 */
export function serializeSanitizedEnvelopeForLog(envelope) {
  const json = JSON.stringify(envelope);
  return JSON.parse(redactSensitiveString(json));
}
