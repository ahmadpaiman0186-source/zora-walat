import { env } from '../../config/env.js';

/** Web top-up fulfillment adapter key (`WEBTOPUP_FULFILLMENT_PROVIDER`). */
export function getConfiguredWebTopupProviderId() {
  return String(env.webTopupFulfillmentProvider ?? 'mock').trim().toLowerCase();
}
