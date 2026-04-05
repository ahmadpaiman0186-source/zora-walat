import { createHash, randomBytes } from 'node:crypto';

/** @typedef {import('./topupProviderTypes.js').TopupFulfillmentRequest} TopupFulfillmentRequest */
/** @typedef {import('./topupProviderTypes.js').TopupFulfillmentResult} TopupFulfillmentResult */
/** @typedef {import('./topupProviderTypes.js').TopupProviderCapabilities} TopupProviderCapabilities */

const MOCK_PREFIX = 'mock:';

/**
 * Deterministic test scenarios — no network.
 * - `mock:success`, `mock:retry`, `mock:terminal`, `mock:unsupported`, `mock:invalid_product`, `mock:amount_mismatch`
 * - Else: last two digits of `phoneNationalDigits`: 90=retry, 91=terminal, 92=unsupported, 93=invalid_product, 94=amount_mismatch
 */
export function resolveMockScenario(req) {
  const key = String(req.operatorKey ?? '');
  if (key.startsWith(MOCK_PREFIX)) {
    const s = key.slice(MOCK_PREFIX.length);
    if (
      [
        'success',
        'retry',
        'terminal',
        'unsupported',
        'invalid_product',
        'amount_mismatch',
      ].includes(s)
    ) {
      return /** @type {const} */ (s);
    }
  }
  const d = String(req.phoneNationalDigits ?? '').replace(/\D/g, '');
  const tail = d.slice(-2);
  if (tail === '90') return 'retry';
  if (tail === '91') return 'terminal';
  if (tail === '92') return 'unsupported';
  if (tail === '93') return 'invalid_product';
  if (tail === '94') return 'amount_mismatch';
  return 'success';
}

export class MockTopupProvider {
  get id() {
    return 'mock';
  }

  /** @returns {TopupProviderCapabilities} */
  getCapabilities() {
    return {
      productTypes: ['airtime', 'data', 'calling'],
      destinationCountries: ['*'],
      operatorsWildcard: true,
    };
  }

  /**
   * @param {TopupFulfillmentRequest} req
   * @returns {Promise<TopupFulfillmentResult>}
   */
  async sendTopup(req) {
    const scenario = resolveMockScenario(req);
    const refBase = `mock_${createHash('sha256').update(req.orderId, 'utf8').digest('hex').slice(0, 12)}`;

    switch (scenario) {
      case 'success':
        return {
          outcome: 'succeeded',
          providerReference: `${refBase}_${randomBytes(3).toString('hex')}`,
        };
      case 'retry':
        return {
          outcome: 'failed_retryable',
          errorCode: 'MOCK_PROVIDER_TRANSIENT',
          errorMessageSafe: 'Simulated provider timeout',
        };
      case 'terminal':
        return {
          outcome: 'failed_terminal',
          errorCode: 'MOCK_PROVIDER_REJECTED',
          errorMessageSafe: 'Simulated hard decline',
        };
      case 'unsupported':
        return {
          outcome: 'unsupported_route',
          errorCode: 'UNSUPPORTED_ROUTE',
          errorMessageSafe: 'Destination or operator not enabled on mock provider',
        };
      case 'invalid_product':
        return {
          outcome: 'invalid_request',
          errorCode: 'INVALID_PRODUCT',
          errorMessageSafe: 'Product not found for operator',
        };
      case 'amount_mismatch':
        return {
          outcome: 'invalid_request',
          errorCode: 'AMOUNT_MISMATCH',
          errorMessageSafe: 'Charged amount does not match product price',
        };
      default:
        return {
          outcome: 'succeeded',
          providerReference: `${refBase}_${randomBytes(3).toString('hex')}`,
        };
    }
  }
}
