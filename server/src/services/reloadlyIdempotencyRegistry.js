/**
 * Phase1 PaymentCheckout Reloadly path — delegates to scoped {@link ./providerOutcomeRegistry.js}.
 */
import {
  getProviderOutcomeRegistryEntry,
  setProviderOutcomeRegistryEntry,
  PROVIDER_OUTCOME_REGISTRY_SCOPE,
} from './providerOutcomeRegistry.js';

const SCOPE = PROVIDER_OUTCOME_REGISTRY_SCOPE.PHASE1_PAYMENT_CHECKOUT_RELOADLY;

/** @param {string} customIdentifier */
export function getReloadlyTopupRegistryEntry(customIdentifier) {
  return getProviderOutcomeRegistryEntry(SCOPE, customIdentifier);
}

/** @param {string} customIdentifier @param {Parameters<typeof setProviderOutcomeRegistryEntry>[2]} entry */
export function setReloadlyTopupRegistryEntry(customIdentifier, entry) {
  return setProviderOutcomeRegistryEntry(SCOPE, customIdentifier, entry);
}

export { PROVIDER_OUTCOME_REGISTRY_SCOPE };
