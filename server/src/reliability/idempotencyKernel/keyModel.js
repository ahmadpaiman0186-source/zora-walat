/**
 * CORE-05 canonical idempotency key builder — pure, deterministic, fail-closed.
 */

/** @typedef {'checkout' | 'webhook' | 'provider_attempt' | 'wallet' | 'refund' | 'order_retry'} IdempotencyScope */

/** @typedef {'client' | 'stripe' | 'internal' | 'provider' | 'system'} IdempotencySource */

/**
 * @typedef {object} KeyMaterial
 * @property {IdempotencyScope} scope
 * @property {IdempotencySource} source
 * @property {string} type — operation type within scope
 * @property {string} [clientKey]
 * @property {string} [orderId]
 * @property {string} [userId]
 * @property {string} [eventId]
 * @property {string} [attemptId]
 * @property {string} [providerReference]
 * @property {string} [paymentIntentId]
 * @property {string} [walletIntentId]
 */

const VALID_SCOPES = new Set(['checkout', 'webhook', 'provider_attempt', 'wallet', 'refund', 'order_retry']);
const VALID_SOURCES = new Set(['client', 'stripe', 'internal', 'provider', 'system']);

/**
 * Stable normalization for key parts (no secrets).
 * @param {unknown} value
 */
export function normalizeKeyPart(value) {
  if (value == null) return '';
  const s = String(value).trim();
  if (!s) return '';
  return s.replace(/\s+/g, '_').slice(0, 128);
}

/**
 * @param {KeyMaterial} material
 * @returns {{ ok: true, key: string } | { ok: false, reason: string, ambiguous?: boolean }}
 */
export function validateKeyMaterial(material) {
  if (!material || typeof material !== 'object') {
    return { ok: false, reason: 'missing_key_material', ambiguous: true };
  }

  const scope = normalizeKeyPart(material.scope).toLowerCase();
  const source = normalizeKeyPart(material.source).toLowerCase();
  const type = normalizeKeyPart(material.type);

  if (!scope || !VALID_SCOPES.has(scope)) {
    return { ok: false, reason: 'invalid_or_missing_scope', ambiguous: true };
  }
  if (!source || !VALID_SOURCES.has(source)) {
    return { ok: false, reason: 'invalid_or_missing_source', ambiguous: true };
  }
  if (!type) {
    return { ok: false, reason: 'missing_operation_type', ambiguous: true };
  }

  const anchors = {
    clientKey: normalizeKeyPart(material.clientKey),
    orderId: normalizeKeyPart(material.orderId),
    userId: normalizeKeyPart(material.userId),
    eventId: normalizeKeyPart(material.eventId),
    attemptId: normalizeKeyPart(material.attemptId),
    providerReference: normalizeKeyPart(material.providerReference),
    paymentIntentId: normalizeKeyPart(material.paymentIntentId),
    walletIntentId: normalizeKeyPart(material.walletIntentId),
  };

  const anchorCount = Object.values(anchors).filter(Boolean).length;
  if (anchorCount === 0) {
    return { ok: false, reason: 'no_entity_anchor', ambiguous: true };
  }

  if (scope === 'checkout' && !anchors.clientKey && !anchors.orderId) {
    return { ok: false, reason: 'checkout_requires_client_key_or_order', ambiguous: true };
  }
  if (scope === 'webhook' && !anchors.eventId) {
    return { ok: false, reason: 'webhook_requires_event_id', ambiguous: true };
  }
  if (scope === 'provider_attempt' && !anchors.orderId && !anchors.attemptId) {
    return { ok: false, reason: 'provider_attempt_requires_order_or_attempt', ambiguous: true };
  }
  if (scope === 'wallet' && !anchors.walletIntentId && !anchors.clientKey) {
    return { ok: false, reason: 'wallet_requires_intent_or_client_key', ambiguous: true };
  }

  if (scope === 'checkout' && anchors.clientKey && anchors.orderId) {
    const parts = anchors.clientKey.split('|');
    if (parts.length > 1 && parts.some((p) => p.includes('..'))) {
      return { ok: false, reason: 'ambiguous_client_key_encoding', ambiguous: true };
    }
  }

  return { ok: true, key: buildCanonicalKey({ scope, source, type, ...anchors }) };
}

/**
 * Payment-safe / provider-safe boundary: keys never embed raw PAN, tokens, or webhook secrets.
 * @param {KeyMaterial & { scope: string, source: string, type: string }} parts
 */
export function buildCanonicalKey(parts) {
  const segments = [
    'v1',
    parts.scope,
    parts.source,
    parts.type,
    parts.clientKey,
    parts.orderId,
    parts.userId,
    parts.eventId,
    parts.attemptId,
    parts.providerReference,
    parts.paymentIntentId,
    parts.walletIntentId,
  ]
    .map((s) => normalizeKeyPart(s))
    .filter(Boolean);

  return segments.join('|');
}

/**
 * Provider dispatch key aligned with Reloadly customIdentifier pattern (read-only spec).
 * @param {{ orderId: string, attemptId?: string, attemptNumber?: number }} p
 */
export function buildProviderAttemptKey(p) {
  const orderId = normalizeKeyPart(p.orderId);
  const attemptId = normalizeKeyPart(p.attemptId);
  const attemptNumber = p.attemptNumber != null ? String(p.attemptNumber) : '';
  if (attemptId) {
    return buildCanonicalKey({
      scope: 'provider_attempt',
      source: 'internal',
      type: 'dispatch',
      orderId,
      attemptId,
    });
  }
  if (orderId && attemptNumber) {
    return buildCanonicalKey({
      scope: 'provider_attempt',
      source: 'internal',
      type: 'dispatch',
      orderId,
      attemptId: `a${attemptNumber}`,
    });
  }
  return '';
}
