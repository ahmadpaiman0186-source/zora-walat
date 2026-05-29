/**
 * CORE-05 in-memory idempotency registry (fixture/tests only — no DB).
 */

/**
 * @typedef {object} RegistryEntry
 * @property {string} idempotencyKey
 * @property {string} outcome — completed | in_flight | failed | unknown
 * @property {string} [attemptKind]
 * @property {Record<string, string>} [entityIds]
 * @property {string} [providerReference]
 * @property {string} [webhookEventId]
 */

/**
 * @returns {{ byKey: Map<string, RegistryEntry>, byWebhookEventId: Map<string, RegistryEntry>, byProviderRef: Map<string, RegistryEntry> }}
 */
export function createIdempotencyRegistry() {
  return {
    byKey: new Map(),
    byWebhookEventId: new Map(),
    byProviderRef: new Map(),
  };
}

/**
 * @param {ReturnType<typeof createIdempotencyRegistry>} registry
 * @param {RegistryEntry} entry
 */
export function registerIdempotencyOutcome(registry, entry) {
  registry.byKey.set(entry.idempotencyKey, entry);
  if (entry.webhookEventId) {
    registry.byWebhookEventId.set(entry.webhookEventId, entry);
  }
  if (entry.providerReference) {
    registry.byProviderRef.set(entry.providerReference, entry);
  }
}

/**
 * @param {ReturnType<typeof createIdempotencyRegistry>} registry
 * @param {RegistryEntry[]} seeds
 */
export function seedIdempotencyRegistry(registry, seeds = []) {
  for (const entry of seeds) {
    registerIdempotencyOutcome(registry, entry);
  }
  return registry;
}

/**
 * @param {ReturnType<typeof createIdempotencyRegistry>} registry
 * @param {string} key
 */
export function lookupByKey(registry, key) {
  return registry.byKey.get(key) ?? null;
}

/**
 * @param {ReturnType<typeof createIdempotencyRegistry>} registry
 * @param {string} eventId
 */
export function lookupWebhookEvent(registry, eventId) {
  return registry.byWebhookEventId.get(eventId) ?? null;
}

/**
 * @param {ReturnType<typeof createIdempotencyRegistry>} registry
 * @param {string} ref
 */
export function lookupProviderRef(registry, ref) {
  return registry.byProviderRef.get(ref) ?? null;
}
