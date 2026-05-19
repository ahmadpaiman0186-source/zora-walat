/**
 * Shared L-11 harness orchestration (staging API reads). No refund side effects.
 */

import { evaluateL11Preflight } from './stagingOperatorL11Preflight.mjs';

/**
 * @param {{
 *   orderId: string,
 *   token: string,
 *   loginHttp: number | string,
 *   runStatusCheckCore: (token: string, opts: { verbose?: boolean }) => Promise<object>,
 *   runPhase1TruthCheckCore: (token: string, opts: { verbose?: boolean }) => Promise<object>,
 *   phase1TruthPrefix: string,
 *   verbose?: boolean,
 * }} deps
 */
export async function runL11PreflightEvaluation(deps) {
  const status = await deps.runStatusCheckCore(deps.token, {
    verbose: deps.verbose === true,
  });
  const truth = await deps.runPhase1TruthCheckCore(deps.token, {
    verbose: deps.verbose === true,
  });

  const evaluation = evaluateL11Preflight({
    tokenOk: true,
    loginHttp: deps.loginHttp,
    status: {
      http: status.http,
      orderFound: status.orderFound,
      orderStatus: status.orderStatus,
      paymentStatus: status.paymentStatus,
      paidConfirmed: status.paidConfirmed,
      fulfillmentAttemptCount: status.fulfillmentAttemptCount,
      endpoint: status.endpoint,
    },
    phase1Truth: {
      http: truth.http,
      orderFound: truth.orderFound,
      postPaymentIncidentStatus: truth.postPaymentIncidentStatus,
      endpoint: truth.endpoint,
      usedSlimPath: String(truth.endpoint ?? '').startsWith(deps.phase1TruthPrefix),
    },
  });

  return { evaluation, status, truth };
}

/**
 * @param {object} apiJson
 */
export function dbMappingFromRefundTargetApi(apiJson) {
  return {
    orderFound: apiJson?.orderFound === true,
    paymentIntentMapped: apiJson?.paymentIntentMapped === true,
    stripePaymentIntentIdSuffix: String(
      apiJson?.stripePaymentIntentIdSuffix ?? 'unknown',
    ),
    paymentIntentIdForVerify: String(apiJson?.paymentIntentIdForVerify ?? '').trim(),
    amountUsdCents:
      typeof apiJson?.amountUsdCents === 'number' ? apiJson.amountUsdCents : null,
    currency: String(apiJson?.currency ?? 'usd'),
    postPaymentIncidentStatus: String(
      apiJson?.postPaymentIncidentStatus ?? 'unknown',
    ),
    orderStatus: String(apiJson?.orderStatus ?? 'unknown'),
    paymentStatus: String(apiJson?.paymentStatus ?? 'unknown'),
    paidConfirmed: apiJson?.paidConfirmed === true,
    refundAlreadyRecordedInApp: apiJson?.refundAlreadyRecordedInApp === true,
  };
}
