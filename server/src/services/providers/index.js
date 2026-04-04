import * as mock from './mockRechargeProvider.js';

/**
 * Single factory — later: select by env PROVIDER_RECHARGE=mock|reloadly etc.
 */
export function getRechargeProvider() {
  return {
    getQuote: mock.getQuote,
    createOrder: mock.createOrder,
  };
}
