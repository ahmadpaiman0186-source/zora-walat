/**
 * Redis-backed outcomes for **provider-issued** idempotency keys (multi-path).
 * Keyed by (scope, externalKey) — never infer SUCCESS without provider-truth fields.
 *
 * Stripe webhook durable idempotency is DB (`StripeWebhookEvent`); see `moneyPathRedisRegistry.js`
 * for optional Redis shadow fast-ack on redelivery (supplemental only).
 */
import { createHash } from 'node:crypto';
import { withRedis } from './redisClient.js';
import { env } from '../config/env.js';

/** Namespaces isolate Phase1 PaymentCheckout top-ups vs WebTopup Reloadly, etc. */
export const PROVIDER_OUTCOME_REGISTRY_SCOPE = Object.freeze({
  PHASE1_PAYMENT_CHECKOUT_RELOADLY: 'phase1_payment_checkout_reloadly',
  WEBTOP_RELOADLY: 'webtop_reloadly',
});

const KEY_PREFIX = 'zora:idemp:provider:v2:';

function storageKey(scope, externalKey) {
  const s = String(scope ?? '').trim();
  const id = String(externalKey ?? '').trim().slice(0, 240);
  if (!s || !id) return '';
  const h = createHash('sha256').update(`${s}\0${id}`).digest('hex').slice(0, 56);
  return `${KEY_PREFIX}${h}`;
}

/**
 * @typedef {Object} ProviderOutcomeRegistryEntry
 * @property {number} v
 * @property {string} scope
 * @property {string} externalKey
 * @property {'SUCCESS' | 'PENDING_VERIFICATION'} airtimeOutcome
 * @property {string | null} providerReference
 * @property {number} recordedAt
 * @property {string} source
 */

/**
 * @param {string} scope
 * @param {string} externalKey
 * @returns {Promise<ProviderOutcomeRegistryEntry | null>}
 */
export async function getProviderOutcomeRegistryEntry(scope, externalKey) {
  const key = storageKey(scope, externalKey);
  if (!key) return null;
  const r = await withRedis((c) => c.get(key));
  if (!r.ok || r.value == null) return null;
  try {
    const o = JSON.parse(String(r.value));
    if (!o || typeof o !== 'object') return null;
    if (String(o.scope ?? '') !== String(scope).trim()) return null;
    if (String(o.externalKey ?? '').trim() !== String(externalKey).trim()) return null;
    const ao = String(o.airtimeOutcome ?? '');
    if (ao !== 'SUCCESS' && ao !== 'PENDING_VERIFICATION') return null;
    return /** @type {ProviderOutcomeRegistryEntry} */ (o);
  } catch {
    return null;
  }
}

/**
 * @param {string} scope
 * @param {string} externalKey
 * @param {Omit<ProviderOutcomeRegistryEntry, 'v' | 'recordedAt' | 'scope' | 'externalKey'> & { recordedAt?: number }} entry
 */
export async function setProviderOutcomeRegistryEntry(scope, externalKey, entry) {
  const key = storageKey(scope, externalKey);
  if (!key) return { ok: false };
  const ttl = env.reloadlyIdempotencyRegistryTtlSeconds;
  if (entry.airtimeOutcome === 'PENDING_VERIFICATION' && !entry.providerReference) {
    return { ok: false };
  }
  const body = JSON.stringify({
    v: 2,
    scope: String(scope).trim(),
    externalKey: String(externalKey).trim(),
    airtimeOutcome: entry.airtimeOutcome,
    providerReference: entry.providerReference ?? null,
    recordedAt: entry.recordedAt ?? Date.now(),
    source: entry.source,
  });
  return withRedis((c) => c.set(key, body, { EX: ttl }));
}
