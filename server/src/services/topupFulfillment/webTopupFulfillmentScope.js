import {
  RELOADLY_WEBTOPUP_ENABLED_COUNTRY,
  RELOADLY_WEBTOPUP_ENABLED_PRODUCT,
} from '../../domain/fulfillment/reloadlyWebTopupFulfillment.js';

/**
 * Pre-dispatch guard: Reloadly is only registered for the narrow web top-up rollout.
 * @param {string} providerId
 * @param {{ destinationCountry: string, productType: string }} row
 * @returns {{ ok: true } | { ok: false, code: string }}
 */
export function assertProviderMatchesWebTopupScope(providerId, row) {
  const pid = String(providerId ?? '').trim().toLowerCase();
  if (pid !== 'reloadly') {
    return { ok: true };
  }
  const cc = String(row.destinationCountry ?? '').trim().toUpperCase();
  if (cc !== RELOADLY_WEBTOPUP_ENABLED_COUNTRY) {
    return { ok: false, code: 'reloadly_scope_country' };
  }
  if (String(row.productType) !== RELOADLY_WEBTOPUP_ENABLED_PRODUCT) {
    return { ok: false, code: 'reloadly_scope_product' };
  }
  return { ok: true };
}
