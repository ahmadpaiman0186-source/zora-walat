/**
 * Redis-backed **shadow** acknowledgements for money-adjacent paths (supplemental to DB truth).
 *
 * - Stripe webhook durable idempotency remains `StripeWebhookEvent.id` (PK) inside the webhook transaction.
 * - Shadow keys allow a cheap early 200 on Stripe retries when Redis is healthy, without weakening safety:
 *   if shadow is missing, delivery still dedupes via DB P2002.
 */
import { createHash } from 'node:crypto';
import { withRedis } from './redisClient.js';
import { env } from '../config/env.js';

const STRIPE_WEBHOOK_SHADOW_PREFIX = 'zora:money:stripe_webhook_shadow:v1:';

/**
 * @param {string} stripeEventId
 */
function shadowKeyForStripeEvent(stripeEventId) {
  const id = String(stripeEventId ?? '').trim();
  if (!id) return '';
  const h = createHash('sha256').update(id).digest('hex').slice(0, 40);
  return `${STRIPE_WEBHOOK_SHADOW_PREFIX}${h}`;
}

/**
 * Fast-path: Stripe event already observed post-commit on a previous delivery.
 * @param {string} stripeEventId
 */
export async function isStripeWebhookEventShadowAck(stripeEventId) {
  const k = shadowKeyForStripeEvent(stripeEventId);
  if (!k) return false;
  const r = await withRedis((c) => c.get(k));
  return r.ok === true && r.value != null;
}

/**
 * Call only after webhook `StripeWebhookEvent` row is durably committed.
 * @param {string} stripeEventId
 */
export async function setStripeWebhookEventShadowAck(stripeEventId) {
  const k = shadowKeyForStripeEvent(stripeEventId);
  if (!k) return { ok: false };
  const ttl = env.reloadlyIdempotencyRegistryTtlSeconds;
  return withRedis((c) => c.set(k, '1', { EX: ttl }));
}
