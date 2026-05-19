/**
 * L-11 refund operator guards (read-only evaluation + Stripe test-mode helpers).
 * No secrets in logs; suffix-only identifiers for output.
 */

export const L11_TARGET_ORDER_ID = 'cmp95a2kc0003jy04pvq0dr78';

export const L11_REFUND_APPROVAL_PHRASE = 'Approved: L-11 execute full refund';

/**
 * @param {string} id
 * @param {number} [len]
 */
export function idSuffix(id, len = 10) {
  const s = String(id ?? '').trim();
  if (s.length < len) return '(short)';
  return `…${s.slice(-len)}`;
}

/**
 * @param {string | null | undefined} key
 */
export function stripeSecretKeyMode(key) {
  const k = String(key ?? '').trim();
  if (k.startsWith('sk_test_') || k.startsWith('rk_test_')) return 'test';
  if (k.startsWith('sk_live_') || k.startsWith('rk_live_')) return 'live';
  return 'unknown';
}

/**
 * @param {string | null | undefined} key
 */
export function isStripeTestModeSecret(key) {
  return stripeSecretKeyMode(key) === 'test';
}

/**
 * @param {string | null | undefined} orderId
 */
export function orderIdMatchesL11Target(orderId) {
  return String(orderId ?? '').trim() === L11_TARGET_ORDER_ID;
}

/**
 * @param {string | null | undefined} approval
 */
export function refundApprovalPhraseMatches(approval) {
  return String(approval ?? '') === L11_REFUND_APPROVAL_PHRASE;
}

/**
 * @param {{
 *   preflightPass: boolean,
 *   orderId: string,
 *   db: {
 *     orderFound: boolean,
 *     paymentIntentMapped: boolean,
 *     stripePaymentIntentIdSuffix: string,
 *     amountUsdCents: number | null,
 *     currency: string,
 *     postPaymentIncidentStatus: string,
 *     orderStatus: string,
 *     paymentStatus: string,
 *   },
 *   stripe?: {
 *     verified: boolean,
 *     stripeMode: string,
 *     paymentIntentIdSuffix: string,
 *     chargeIdSuffix: string,
 *     amountCents: number,
 *     currency: string,
 *     refundAlreadyExists: boolean,
 *     livemode: boolean,
 *   } | null,
 * }} input
 */
export function evaluateL11RefundTarget(input) {
  const checks = {
    preflight_pass: input.preflightPass === true,
    order_id_exact: orderIdMatchesL11Target(input.orderId),
    order_found: input.db.orderFound === true,
    payment_intent_mapped: input.db.paymentIntentMapped === true,
    amount_present:
      typeof input.db.amountUsdCents === 'number' &&
      Number.isFinite(input.db.amountUsdCents) &&
      input.db.amountUsdCents > 0,
    currency_present: String(input.db.currency ?? '').length > 0,
    incident_not_refunded: input.db.postPaymentIncidentStatus !== 'REFUNDED',
    order_fulfilled: input.db.orderStatus === 'FULFILLED',
    payment_recharge_completed: input.db.paymentStatus === 'RECHARGE_COMPLETED',
    stripe_verified: Boolean(input.stripe?.verified),
    stripe_test_only:
      input.stripe?.verified === true && input.stripe.stripeMode === 'test_only',
    stripe_amount_matches:
      input.stripe?.verified === true &&
      input.stripe.amountCents === input.db.amountUsdCents,
    stripe_currency_matches:
      input.stripe?.verified === true &&
      String(input.stripe.currency).toLowerCase() ===
        String(input.db.currency).toLowerCase(),
    stripe_pi_suffix_matches:
      input.stripe?.verified === true &&
      input.stripe.paymentIntentIdSuffix === input.db.stripePaymentIntentIdSuffix,
    no_prior_refund:
      input.stripe?.verified === true && input.stripe.refundAlreadyExists !== true,
  };

  const pass = Object.values(checks).every(Boolean);
  let blockedReason = null;
  if (!checks.order_id_exact) blockedReason = 'order_id_not_l11_target';
  else if (!checks.preflight_pass) blockedReason = 'preflight_not_pass';
  else if (!checks.payment_intent_mapped) blockedReason = 'payment_intent_not_mapped';
  else if (!checks.amount_present) blockedReason = 'amount_not_verified';
  else if (!checks.incident_not_refunded) blockedReason = 'already_refunded_incident';
  else if (!checks.stripe_verified) {
    blockedReason = input.stripe?.blockedReason ?? 'stripe_key_missing';
  } else if (input.stripe?.stripeMode === 'live') blockedReason = 'stripe_key_not_test';
  else if (input.stripe?.refundAlreadyExists) blockedReason = 'stripe_refund_already_exists';
  else if (!checks.stripe_amount_matches) blockedReason = 'stripe_amount_mismatch';
  else if (!checks.stripe_currency_matches) blockedReason = 'stripe_currency_mismatch';
  else if (!checks.stripe_pi_suffix_matches) {
    blockedReason = 'stripe_payment_intent_suffix_mismatch';
  }
  else if (!pass) blockedReason = 'refund_target_guard_failed';

  return { pass, blockedReason, checks };
}

/**
 * @param {{
 *   targetPass: boolean,
 *   orderId: string,
 *   approvalPhrase: string,
 *   stripeKeyMode: string,
 *   db: { postPaymentIncidentStatus: string, paymentStatus: string, amountUsdCents: number | null },
 *   stripe?: { verified: boolean, refundAlreadyExists: boolean, livemode: boolean } | null,
 * }} input
 */
export function evaluateL11RefundExecuteGuards(input) {
  const checks = {
    target_pass: input.targetPass === true,
    order_id_exact: orderIdMatchesL11Target(input.orderId),
    approval_phrase_exact: refundApprovalPhraseMatches(input.approvalPhrase),
    stripe_test_key: input.stripeKeyMode === 'test',
    incident_not_refunded: input.db.postPaymentIncidentStatus !== 'REFUNDED',
    payment_recharge_completed: input.db.paymentStatus === 'RECHARGE_COMPLETED',
    amount_verified:
      typeof input.db.amountUsdCents === 'number' && input.db.amountUsdCents > 0,
    stripe_verified: Boolean(input.stripe?.verified),
    no_prior_stripe_refund: input.stripe?.refundAlreadyExists !== true,
    not_livemode: input.stripe?.livemode !== true,
  };

  const pass = Object.values(checks).every(Boolean);
  let blockedReason = null;
  if (!checks.approval_phrase_exact) blockedReason = 'refund_approval_missing';
  else if (!checks.stripe_test_key) blockedReason = 'stripe_test_key_required';
  else if (!checks.order_id_exact) blockedReason = 'order_id_not_l11_target';
  else if (!checks.target_pass) blockedReason = 'refund_target_not_pass';
  else if (!checks.no_prior_stripe_refund) blockedReason = 'stripe_refund_already_exists';
  else if (!checks.stripe_verified) {
    blockedReason = input.stripe?.blockedReason ?? 'stripe_key_missing';
  } else if (!pass) blockedReason = 'refund_execute_guard_failed';

  return { pass, blockedReason, checks };
}

/**
 * @param {{
 *   status: { http: number | string, orderFound: boolean, orderStatus: string, paymentStatus: string, paidConfirmed: boolean, fulfillmentAttemptCount: number },
 *   truth: { http: number | string, postPaymentIncidentStatus: string },
 * }} input
 */
export function evaluateL11PostRefundVerify(input) {
  const checks = {
    status_check_http_200: input.status.http === 200,
    order_found: input.status.orderFound === true,
    order_status_fulfilled: input.status.orderStatus === 'FULFILLED',
    payment_status_recharge_completed:
      input.status.paymentStatus === 'RECHARGE_COMPLETED',
    paid_confirmed: input.status.paidConfirmed === true,
    fulfillment_attempt_count_1: input.status.fulfillmentAttemptCount === 1,
    phase1_truth_http_200: input.truth.http === 200,
    post_payment_incident_refunded:
      input.truth.postPaymentIncidentStatus === 'REFUNDED',
  };

  const pass = Object.values(checks).every(Boolean);
  return {
    pass,
    blockedReason: pass ? null : 'post_refund_verify_failed',
    checks,
  };
}

/**
 * @param {string} piSuffix
 * @param {string} orderIdSuffix
 */
export function buildDashboardSearchHint(piSuffix, orderIdSuffix) {
  return `stripe_dashboard_test_mode_payments_search_metadata_internalCheckoutId_${orderIdSuffix}_or_pi_suffix_${piSuffix}`;
}

/**
 * @param {import('stripe').Stripe} stripe
 * @param {string} orderId
 */
export async function lookupStripePaymentForOrder(stripe, orderId) {
  const search = await stripe.paymentIntents.search({
    query: `metadata['internalCheckoutId']:'${orderId}'`,
    limit: 5,
  });
  const data = Array.isArray(search?.data) ? search.data : [];
  const exact = data.filter(
    (pi) => pi?.metadata?.internalCheckoutId === orderId,
  );
  const pi = exact[0] ?? data[0] ?? null;
  if (!pi?.id) {
    return { verified: false, reason: 'payment_intent_not_found' };
  }

  const retrieved = await stripe.paymentIntents.retrieve(pi.id, {
    expand: ['latest_charge'],
  });

  const charge =
    typeof retrieved.latest_charge === 'object' && retrieved.latest_charge
      ? retrieved.latest_charge
      : null;
  const chargeId =
    charge?.id ??
    (typeof retrieved.latest_charge === 'string' ? retrieved.latest_charge : '');

  const refunds = await stripe.refunds.list({
    payment_intent: retrieved.id,
    limit: 20,
  });
  const refundRows = Array.isArray(refunds?.data) ? refunds.data : [];
  const refundedTotal = refundRows
    .filter((r) => r.status === 'succeeded' || r.status === 'pending')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const amountCents = Number(retrieved.amount) || 0;
  const refundAlreadyExists = refundedTotal >= amountCents && amountCents > 0;
  const partialExists =
    refundedTotal > 0 && refundedTotal < amountCents;

  return {
    verified: true,
    paymentIntentId: retrieved.id,
    paymentIntentIdSuffix: idSuffix(retrieved.id),
    chargeIdSuffix: chargeId ? idSuffix(chargeId) : 'unknown',
    amountCents,
    currency: String(retrieved.currency ?? 'usd'),
    stripeMode: retrieved.livemode ? 'live' : 'test_only',
    livemode: retrieved.livemode === true,
    refundAlreadyExists,
    partialRefundExists: partialExists,
  };
}

/**
 * Full refund only — no amount param (Stripe defaults to full remaining).
 * @param {import('stripe').Stripe} stripe
 * @param {string} paymentIntentId
 * @param {number} expectedAmountCents
 */
export async function createFullPaymentIntentRefund(
  stripe,
  paymentIntentId,
  expectedAmountCents,
) {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (pi.livemode) {
    const err = new Error('stripe_live_mode_forbidden');
    err.code = 'stripe_live_mode_forbidden';
    throw err;
  }
  if (Number(pi.amount) !== Number(expectedAmountCents)) {
    const err = new Error('amount_mismatch');
    err.code = 'amount_mismatch';
    throw err;
  }

  const refunds = await stripe.refunds.list({
    payment_intent: paymentIntentId,
    limit: 20,
  });
  const refundRows = Array.isArray(refunds?.data) ? refunds.data : [];
  const refundedTotal = refundRows
    .filter((r) => r.status === 'succeeded' || r.status === 'pending')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  if (refundedTotal >= pi.amount) {
    const err = new Error('already_refunded');
    err.code = 'already_refunded';
    throw err;
  }
  if (refundedTotal > 0) {
    const err = new Error('partial_refund_exists');
    err.code = 'partial_refund_exists';
    throw err;
  }

  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
  });

  return {
    created: true,
    refundIdSuffix: idSuffix(refund.id),
    status: String(refund.status ?? 'unknown'),
  };
}
