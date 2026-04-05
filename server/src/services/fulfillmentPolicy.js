import { env } from '../config/env.js';
import { FULFILLMENT_SERVICE_CODE } from '../domain/topupOrder/fulfillmentErrors.js';

function serviceError(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

/**
 * Throws if fulfillment dispatch/retry must not proceed (kill switch, global off, Reloadly gate).
 * @param {string} [providerId] normalized provider id for this attempt (`mock` | `reloadly` | …)
 */
export function assertFulfillmentDispatchAllowed(providerId) {
  const pid = String(providerId ?? '')
    .trim()
    .toLowerCase();
  if (env.fulfillmentDispatchKillSwitch) {
    throw serviceError(
      FULFILLMENT_SERVICE_CODE.FULFILLMENT_SUSPENDED,
      'Fulfillment dispatch is temporarily suspended (operations kill switch)',
    );
  }
  if (!env.fulfillmentDispatchEnabled) {
    throw serviceError(
      FULFILLMENT_SERVICE_CODE.FULFILLMENT_SUSPENDED,
      'Fulfillment dispatch is disabled by configuration',
    );
  }
  if (pid === 'reloadly' && !env.reloadlyWebTopupProviderActive) {
    throw serviceError(
      FULFILLMENT_SERVICE_CODE.FULFILLMENT_SUSPENDED,
      'Reloadly web top-up dispatch is disabled by configuration (provider feature flag)',
    );
  }
}
