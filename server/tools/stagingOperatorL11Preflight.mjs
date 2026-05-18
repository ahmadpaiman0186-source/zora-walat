/**
 * L-11 preflight evaluation (read-only). No refund, checkout, or Stripe refund APIs.
 */

export const L11_PREFLIGHT_SLIM_PHASE1_TRUTH_PREFIX =
  '/api/ops/staging-operator-phase1-truth/';

/**
 * @param {{
 *   tokenOk: boolean,
 *   loginHttp: number | string,
 *   status: {
 *     http: number | string,
 *     orderFound: boolean,
 *     orderStatus: string,
 *     paymentStatus: string,
 *     paidConfirmed: boolean,
 *     fulfillmentAttemptCount: number,
 *     endpoint?: string,
 *   },
 *   phase1Truth: {
 *     http: number | string,
 *     orderFound: boolean,
 *     postPaymentIncidentStatus: string,
 *     endpoint?: string,
 *     usedSlimPath?: boolean,
 *   },
 * }} input
 * @returns {{
 *   pass: boolean,
 *   blockedReason: string | null,
 *   checks: Record<string, boolean>,
 * }}
 */
export function evaluateL11Preflight(input) {
  const checks = {
    token_ok: input.tokenOk === true,
    login_http_ok:
      input.loginHttp === 'skipped_valid_token' ||
      input.loginHttp === 200,
    status_check_http_200: input.status.http === 200,
    order_found: input.status.orderFound === true,
    order_status_fulfilled: input.status.orderStatus === 'FULFILLED',
    payment_status_recharge_completed:
      input.status.paymentStatus === 'RECHARGE_COMPLETED',
    paid_confirmed: input.status.paidConfirmed === true,
    fulfillment_attempt_count_1: input.status.fulfillmentAttemptCount === 1,
    phase1_truth_http_200: input.phase1Truth.http === 200,
    phase1_truth_slim_endpoint:
      input.phase1Truth.usedSlimPath === true ||
      (typeof input.phase1Truth.endpoint === 'string' &&
        input.phase1Truth.endpoint.startsWith(L11_PREFLIGHT_SLIM_PHASE1_TRUTH_PREFIX)),
    incident_not_refunded: input.phase1Truth.postPaymentIncidentStatus !== 'REFUNDED',
    preflight_refund_eligible:
      input.phase1Truth.postPaymentIncidentStatus !== 'REFUNDED',
  };

  const pass = Object.values(checks).every(Boolean);
  let blockedReason = null;
  if (!checks.token_ok) blockedReason = 'token_missing_or_invalid';
  else if (!checks.login_http_ok) blockedReason = 'login_failed';
  else if (!checks.status_check_http_200) blockedReason = 'status_check_not_http_200';
  else if (!checks.order_found) blockedReason = 'order_not_found';
  else if (!checks.order_status_fulfilled) blockedReason = 'order_status_not_fulfilled';
  else if (!checks.payment_status_recharge_completed) {
    blockedReason = 'payment_status_not_recharge_completed';
  } else if (!checks.paid_confirmed) blockedReason = 'paid_not_confirmed';
  else if (!checks.fulfillment_attempt_count_1) {
    blockedReason = 'fulfillment_attempt_count_not_1';
  } else if (!checks.phase1_truth_http_200) blockedReason = 'phase1_truth_not_http_200';
  else if (!checks.phase1_truth_slim_endpoint) blockedReason = 'phase1_truth_not_slim_endpoint';
  else if (!checks.incident_not_refunded) blockedReason = 'already_refunded_incident';
  else if (!checks.preflight_refund_eligible) blockedReason = 'preflight_refund_not_eligible';

  return { pass, blockedReason: pass ? null : blockedReason, checks };
}

/** L-11 preflight must never invoke refund or payment creation paths. */
export const L11_PREFLIGHT_FORBIDDEN_ACTIONS = Object.freeze([
  'stripe_refund_api',
  'create_checkout',
  'create_payment',
  'dashboard_refund',
]);
