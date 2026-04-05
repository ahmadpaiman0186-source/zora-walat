import { env } from '../../../config/env.js';
import { sendReloadlyTopupRequest } from '../../../domain/fulfillment/reloadlyTopup.js';
import {
  buildWebTopupReloadlyPayload,
  mapReloadlyTokenFailureToFulfillmentResult,
  mapReloadlyTopupSendResultToFulfillmentResult,
  mapReloadlyWebTopupBuildFailureToFulfillmentResult,
  RELOADLY_WEBTOPUP_ENABLED_COUNTRY,
  RELOADLY_WEBTOPUP_ENABLED_PRODUCT,
} from '../../../domain/fulfillment/reloadlyWebTopupFulfillment.js';
import { getReloadlyAccessTokenCached } from '../../reloadlyAuthService.js';

/** @typedef {import('./topupProviderTypes.js').TopupFulfillmentRequest} TopupFulfillmentRequest */
/** @typedef {import('./topupProviderTypes.js').TopupFulfillmentResult} TopupFulfillmentResult */

/**
 * Reloadly Topups adapter for WebTopupOrder — **AF + airtime only** (see `buildWebTopupReloadlyPayload`).
 * Uses existing OAuth cache + HTTP client; never logs tokens.
 */
export class ReloadlyWebTopupProvider {
  /**
   * @param {object} [deps]
   * @param {() => Promise<object>} [deps.getToken]
   * @param {(p: object) => Promise<object>} [deps.sendTopup]
   * @param {() => Record<string, string>} [deps.operatorMap]
   */
  constructor(deps = {}) {
    this._getToken = deps.getToken ?? getReloadlyAccessTokenCached;
    this._sendTopup = deps.sendTopup ?? sendReloadlyTopupRequest;
    this._operatorMap = deps.operatorMap ?? (() => env.reloadlyOperatorMap);
  }

  get id() {
    return 'reloadly';
  }

  getCapabilities() {
    return {
      productTypes: [RELOADLY_WEBTOPUP_ENABLED_PRODUCT],
      destinationCountries: [RELOADLY_WEBTOPUP_ENABLED_COUNTRY],
      operatorsWildcard: false,
    };
  }

  /**
   * @param {TopupFulfillmentRequest} req
   * @returns {Promise<TopupFulfillmentResult>}
   */
  async sendTopup(req) {
    const tokenResult = await this._getToken();
    if (!tokenResult.ok) {
      return mapReloadlyTokenFailureToFulfillmentResult(tokenResult);
    }

    const built = buildWebTopupReloadlyPayload(req, this._operatorMap());
    if (!built.ok) {
      return mapReloadlyWebTopupBuildFailureToFulfillmentResult(built);
    }

    const sendResult = await this._sendTopup({
      accessToken: tokenResult.accessToken,
      sandbox: env.reloadlySandbox,
      body: built.body,
      timeoutMs: env.airtimeProviderTimeoutMs,
      baseUrl: env.reloadlyBaseUrl,
    });

    return mapReloadlyTopupSendResultToFulfillmentResult(sendResult);
  }
}
