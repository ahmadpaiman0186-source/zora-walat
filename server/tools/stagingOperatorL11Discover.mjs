/**
 * L-11 read-only refundable order discovery (Stripe test mode + suffix-only output).
 */

import {
  diagnoseL11StripePayment,
  ROOT_CAUSE,
  rootCauseToDiagnosticVerdict,
} from './stagingOperatorL11StripeDiagnose.mjs';
import { idSuffix } from './stagingOperatorL11Refund.mjs';

/**
 * @param {import('stripe').Stripe} stripe
 * @param {{
 *   orderIdForHarness: string,
 *   paymentIntentIdForVerify: string,
 *   checkoutSessionIdForVerify?: string,
 *   stripePaymentIntentIdSuffix: string,
 *   amountUsdCents: number | null,
 *   currency: string,
 *   paidConfirmed?: boolean,
 *   fulfillmentAttemptCount?: number,
 * }} candidate
 * @param {string} secretRaw
 */
export async function scoreL11RefundableCandidate(stripe, candidate, secretRaw) {
  const orderId = String(candidate.orderIdForHarness ?? '').trim();
  const fulfillmentAttemptCount = Number(candidate.fulfillmentAttemptCount ?? 0);
  const paidConfirmed = candidate.paidConfirmed === true;

  if (!orderId) {
    return {
      orderId,
      orderIdSuffix: 'unknown',
      eligible: false,
      diagnosticVerdict: 'BLOCKED',
      rootCauseCode: 'missing_order_id',
      rank: -1,
    };
  }

  if (!paidConfirmed) {
    return {
      orderId,
      orderIdSuffix: idSuffix(orderId),
      eligible: false,
      diagnosticVerdict: 'BLOCKED',
      rootCauseCode: 'paid_not_confirmed',
      rank: -1,
    };
  }

  if (fulfillmentAttemptCount !== 1) {
    return {
      orderId,
      orderIdSuffix: idSuffix(orderId),
      eligible: false,
      diagnosticVerdict: 'BLOCKED',
      rootCauseCode: 'fulfillment_attempt_count_not_one',
      rank: -1,
    };
  }

  const diag = await diagnoseL11StripePayment({
    secretRaw,
    db: {
      orderId,
      paymentIntentIdForVerify: String(candidate.paymentIntentIdForVerify ?? ''),
      stripePaymentIntentIdSuffix: String(
        candidate.stripePaymentIntentIdSuffix ?? 'unknown',
      ),
      amountUsdCents: candidate.amountUsdCents,
      currency: String(candidate.currency ?? 'usd'),
      checkoutSessionIdForVerify: String(candidate.checkoutSessionIdForVerify ?? ''),
    },
    stripe,
  });

  const diagnosticVerdict = rootCauseToDiagnosticVerdict(diag.rootCauseCode);
  const eligible =
    diagnosticVerdict === 'PASS' ||
    diagnosticVerdict === 'PASS_WITH_METADATA_WARNING';

  let rank = -1;
  if (diag.rootCauseCode === ROOT_CAUSE.OK) rank = 100;
  else if (diag.rootCauseCode === ROOT_CAUSE.STRIPE_METADATA_WARNING_STRONG_PI_PROOF) {
    rank = 80;
  }

  return {
    orderId,
    orderIdSuffix: idSuffix(orderId),
    eligible,
    diagnosticVerdict,
    rootCauseCode: diag.rootCauseCode,
    strongPiIdProof: diag.strongPiIdProof === true,
    metadataWarning: diag.metadataWarningStrongPiProof === true,
    rank,
  };
}

/**
 * @param {Array<Awaited<ReturnType<typeof scoreL11RefundableCandidate>>>} scored
 */
export function pickBestL11RefundableCandidate(scored) {
  const eligible = scored.filter((s) => s.eligible && s.rank >= 0);
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => b.rank - a.rank);
  return eligible[0];
}
