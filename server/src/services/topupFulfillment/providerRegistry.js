import { MockTopupProvider } from './providers/mockTopupProvider.js';
import { ReloadlyWebTopupProvider } from './providers/reloadlyWebTopupProvider.js';

const mock = new MockTopupProvider();
const reloadly = new ReloadlyWebTopupProvider();

/** @type {Record<string, MockTopupProvider | ReloadlyWebTopupProvider>} */
const registry = {
  mock,
  reloadly,
};

/**
 * @param {string} providerId
 * @returns {typeof mock | null}
 */
export function resolveTopupFulfillmentProvider(providerId) {
  const id = String(providerId ?? '').trim().toLowerCase();
  return registry[id] ?? null;
}

/**
 * @param {string} providerId
 * @returns {boolean}
 */
export function isRegisteredTopupProvider(providerId) {
  return resolveTopupFulfillmentProvider(providerId) != null;
}
