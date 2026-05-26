/**
 * Durable, non-money Stripe webhook audit support.
 *
 * This module records allowlisted lifecycle metadata only. It must never store
 * raw Stripe payloads, signatures, secrets, card/bank data, customer PII, or
 * unredacted metadata, and it must never drive money-path behavior.
 */

const ALLOWED_FIELDS = new Set([
  'event_id',
  'event_type',
  'stripe_account_mode',
  'route',
  'received_at',
  'signature_verification_status',
  'idempotency_status',
  'handler_stage',
  'response_status',
  'ack_latency_ms',
  'correlation_id',
  'redacted_error_code',
  'created_at',
  'updated_at',
]);

const FIELD_LIMITS = {
  event_id: 128,
  event_type: 128,
  stripe_account_mode: 16,
  route: 256,
  received_at: 64,
  signature_verification_status: 32,
  idempotency_status: 64,
  handler_stage: 96,
  correlation_id: 128,
  redacted_error_code: 96,
  created_at: 64,
  updated_at: 64,
};

const SIGNATURE_STATUSES = new Set([
  'missing',
  'invalid',
  'verified',
  'not_attempted',
  'error',
]);

const STRIPE_ACCOUNT_MODES = new Set(['test', 'sandbox']);

const IDEMPOTENCY_STATUSES = new Set([
  'not_applicable',
  'new',
  'duplicate_shadow_ack',
  'duplicate_db',
  'duplicate',
  'skipped',
  'error',
]);

/**
 * @param {unknown} value
 * @param {number} limit
 */
function safeString(value, limit) {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    return undefined;
  }
  const s = String(value).trim();
  if (!s) return undefined;
  return s.slice(0, limit);
}

/**
 * @param {unknown} value
 */
function safeInteger(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.round(value));
}

/**
 * @param {unknown} value
 */
function safeTimestamp(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  const s = safeString(value, 64);
  if (!s) return undefined;
  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

/**
 * Keep only path-like route text. Query strings may carry tokens or metadata.
 *
 * @param {unknown} value
 */
function safeRoute(value) {
  const s = safeString(value, FIELD_LIMITS.route);
  if (!s) return undefined;
  const q = s.indexOf('?');
  const withoutQuery = q === -1 ? s : s.slice(0, q);
  if (/^https?:\/\//i.test(withoutQuery)) {
    try {
      return new URL(withoutQuery).pathname.slice(0, FIELD_LIMITS.route);
    } catch {
      return undefined;
    }
  }
  return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
}

/**
 * @param {unknown} err
 */
export function redactedStripeWebhookAuditErrorCode(err) {
  const raw =
    (err && typeof err === 'object' && 'code' in err && err.code) ||
    (err && typeof err === 'object' && 'name' in err && err.name) ||
    'STRIPE_WEBHOOK_AUDIT_ERROR';
  return String(raw)
    .replace(/[^a-zA-Z0-9_:-]+/g, '_')
    .slice(0, FIELD_LIMITS.redacted_error_code);
}

/**
 * @param {Record<string, unknown>} [input]
 * @returns {Record<string, string | number>}
 */
export function sanitizeStripeWebhookAuditInput(input = {}) {
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    if (value == null || typeof value === 'object') continue;

    if (key === 'response_status' || key === 'ack_latency_ms') {
      const n = safeInteger(value);
      if (n !== undefined) output[key] = n;
      continue;
    }

    if (key === 'route') {
      const route = safeRoute(value);
      if (route) output[key] = route;
      continue;
    }

    if (key === 'received_at' || key === 'created_at' || key === 'updated_at') {
      const ts = safeTimestamp(value);
      if (ts) output[key] = ts;
      continue;
    }

    const s = safeString(value, FIELD_LIMITS[key] ?? 128);
    if (!s) continue;

    if (key === 'signature_verification_status' && !SIGNATURE_STATUSES.has(s)) continue;
    if (key === 'stripe_account_mode' && !STRIPE_ACCOUNT_MODES.has(s)) continue;
    if (key === 'idempotency_status' && !IDEMPOTENCY_STATUSES.has(s)) continue;

    output[key] = s;
  }
  return output;
}

/**
 * @param {Record<string, unknown>} [input]
 * @returns {Record<string, string | number>}
 */
export function buildStripeWebhookAuditRecord(input = {}) {
  const now = new Date().toISOString();
  return sanitizeStripeWebhookAuditInput({
    ...input,
    created_at: input.created_at ?? now,
    updated_at: input.updated_at ?? now,
  });
}

/**
 * @param {unknown} event
 */
export function stripeAccountModeFromEvent(event) {
  return event && typeof event === 'object' && event.livemode === false ? 'test' : undefined;
}

/**
 * @param {unknown} req
 */
export function webhookAuditRouteFromRequest(req) {
  const raw = req && typeof req === 'object' && typeof req.url === 'string' ? req.url : '/webhooks/stripe';
  return safeRoute(raw) ?? '/webhooks/stripe';
}

/**
 * Existing durable, non-money audit persistence. Unit tests default to no-op to
 * avoid mutating local databases unless they explicitly inject an adapter.
 *
 * @param {Record<string, string | number>} record
 */
async function writeAuditLogAdapter(record) {
  if (process.env.NODE_ENV === 'test') {
    return { skipped: true, reason: 'test_noop_adapter' };
  }
  const [{ prisma }, { writeOrderAudit }] = await Promise.all([
    import('../src/db.js'),
    import('../src/services/orderAuditService.js'),
  ]);
  await writeOrderAudit(prisma, {
    event: 'stripe_webhook_non_money_audit',
    payload: record,
    ip: null,
  });
  return { persisted: true };
}

function globalAuditAdapter() {
  return typeof globalThis.__zwStripeWebhookAuditAdapter === 'function'
    ? globalThis.__zwStripeWebhookAuditAdapter
    : undefined;
}

/**
 * Best-effort audit recording. Never throw from this function into webhook
 * business processing.
 *
 * @param {Record<string, unknown>} input
 * @param {(record: Record<string, string | number>) => Promise<unknown> | unknown} [adapter]
 */
export async function recordStripeWebhookAudit(input, adapter) {
  const record = buildStripeWebhookAuditRecord(input);
  const selectedAdapter = adapter ?? globalAuditAdapter() ?? writeAuditLogAdapter;
  try {
    const result = await selectedAdapter(record);
    return { ok: true, record, result };
  } catch (err) {
    const redacted_error_code = redactedStripeWebhookAuditErrorCode(err);
    return {
      ok: false,
      redacted_error_code,
      record: {
        ...record,
        redacted_error_code,
        updated_at: new Date().toISOString(),
      },
    };
  }
}

export { ALLOWED_FIELDS as STRIPE_WEBHOOK_AUDIT_ALLOWED_FIELDS };
