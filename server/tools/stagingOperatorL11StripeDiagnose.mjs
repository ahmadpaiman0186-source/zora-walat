/**
 * L-11 Stripe read-only diagnostics (no refund, no secrets in output).
 */

import { idSuffix, stripeSecretKeyMode } from './stagingOperatorL11Refund.mjs';
import {
  evaluateDbStripeMapping,
  retrieveCheckoutSessionSafe,
  suffixTailMatch,
} from './stagingOperatorL11StripeMapping.mjs';

/** @typedef {import('stripe').Stripe} Stripe */

export const ROOT_CAUSE = Object.freeze({
  OK: 'ok',
  STRIPE_KEY_MISSING: 'stripe_key_missing',
  STRIPE_KEY_NOT_TEST: 'stripe_key_not_test',
  STRIPE_LIVE_BLOCKED: 'stripe_live_blocked',
  STRIPE_ACCOUNT_UNREACHABLE: 'stripe_account_unreachable',
  STRIPE_PERMISSION_DENIED: 'stripe_permission_denied',
  STRIPE_PAYMENT_INTENT_NOT_FOUND: 'stripe_payment_intent_not_found',
  STRIPE_PAYMENT_INTENT_SUFFIX_MISMATCH: 'stripe_payment_intent_suffix_mismatch',
  STRIPE_ORDER_METADATA_MISMATCH: 'stripe_order_metadata_mismatch',
  STRIPE_CHARGE_NOT_FOUND: 'stripe_charge_not_found',
  STRIPE_AMOUNT_MISMATCH: 'stripe_amount_mismatch',
  STRIPE_CURRENCY_MISMATCH: 'stripe_currency_mismatch',
  STRIPE_LIVEMODE_NOT_FALSE: 'stripe_livemode_not_false',
  STRIPE_REFUND_ALREADY_EXISTS: 'stripe_refund_already_exists',
  STRIPE_PARTIAL_REFUND_EXISTS: 'stripe_partial_refund_exists',
  STRIPE_VERIFICATION_LOGIC_BUG: 'stripe_verification_logic_bug',
});

/**
 * @param {string} code
 */
export function rootCauseToBlockedReason(code) {
  if (code === ROOT_CAUSE.OK) return null;
  if (code === ROOT_CAUSE.STRIPE_ORDER_METADATA_MISMATCH) {
    return 'stripe_account_mismatch';
  }
  if (code === ROOT_CAUSE.STRIPE_LIVE_BLOCKED || code === ROOT_CAUSE.STRIPE_LIVEMODE_NOT_FALSE) {
    return 'stripe_key_not_test';
  }
  if (code === ROOT_CAUSE.STRIPE_PARTIAL_REFUND_EXISTS) {
    return 'stripe_refund_already_exists';
  }
  return code;
}

/**
 * @param {unknown} err
 */
export function mapStripeErrorToRootCause(err) {
  const code = String(
    err && typeof err === 'object' && 'code' in err ? err.code : '',
  ).toLowerCase();
  const type = String(
    err && typeof err === 'object' && 'type' in err ? err.type : '',
  ).toLowerCase();
  const msg = String(
    err && typeof err === 'object' && 'message' in err ? err.message : err ?? '',
  ).toLowerCase();

  if (code === 'stripe_live_mode_forbidden') return ROOT_CAUSE.STRIPE_LIVE_BLOCKED;
  if (type === 'stripe_permission_error' || code === 'account_invalid') {
    return ROOT_CAUSE.STRIPE_PERMISSION_DENIED;
  }
  if (code === 'resource_missing' || msg.includes('no such payment_intent')) {
    return ROOT_CAUSE.STRIPE_PAYMENT_INTENT_NOT_FOUND;
  }
  if (code === 'amount_mismatch') return ROOT_CAUSE.STRIPE_AMOUNT_MISMATCH;
  if (code === 'already_refunded') return ROOT_CAUSE.STRIPE_REFUND_ALREADY_EXISTS;
  if (code === 'partial_refund_exists') return ROOT_CAUSE.STRIPE_PARTIAL_REFUND_EXISTS;
  return ROOT_CAUSE.STRIPE_VERIFICATION_LOGIC_BUG;
}

/**
 * @param {unknown} err
 */
export function stripePermissionCapabilityHint(err) {
  const code = String(
    err && typeof err === 'object' && 'code' in err ? err.code : '',
  );
  const msg = String(
    err && typeof err === 'object' && 'message' in err ? err.message : '',
  ).toLowerCase();
  if (code === 'secret_key_required' || code === 'api_key_expired') {
    return 'STRIPE_CAPABILITY_API_KEY_INVALID';
  }
  if (msg.includes('search') || code === 'permission_denied') {
    return 'STRIPE_CAPABILITY_PAYMENT_INTENT_SEARCH';
  }
  return 'STRIPE_CAPABILITY_PAYMENT_INTENT_READ';
}

/**
 * @param {Stripe} stripe
 */
export async function retrieveStripeAccountSafe(stripe) {
  try {
    const acct = await stripe.accounts.retrieve();
    return {
      reachable: true,
      accountIdSuffix: idSuffix(acct.id, 10),
      livemode: acct.livemode === true,
    };
  } catch (err) {
    return {
      reachable: false,
      accountIdSuffix: 'unknown',
      livemode: null,
      err,
      error: mapStripeErrorToRootCause(err),
    };
  }
}

/**
 * @param {Stripe} stripe
 * @param {string} paymentIntentId
 */
export async function retrievePaymentIntentSafe(stripe, paymentIntentId) {
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge'],
    });
    return { ok: true, pi };
  } catch (err) {
    return { ok: false, error: mapStripeErrorToRootCause(err), err };
  }
}

/**
 * @param {Stripe} stripe
 * @param {string} orderId
 */
export async function searchPaymentIntentByMetadataSafe(stripe, orderId) {
  try {
    const search = await stripe.paymentIntents.search({
      query: `metadata['internalCheckoutId']:'${orderId}'`,
      limit: 5,
    });
    const data = Array.isArray(search?.data) ? search.data : [];
    const exact = data.filter(
      (pi) => pi?.metadata?.internalCheckoutId === orderId,
    );
    return { ok: true, pi: exact[0] ?? data[0] ?? null };
  } catch (err) {
    return { ok: false, error: mapStripeErrorToRootCause(err), err };
  }
}

/**
 * @param {import('stripe').Stripe.PaymentIntent} pi
 * @param {{
 *   orderId: string,
 *   amountUsdCents: number,
 *   currency: string,
 *   expectedPiSuffix: string,
 * }} db
 */
export function buildStripeVerifyFromPaymentIntent(pi, db) {
  const charge =
    typeof pi.latest_charge === 'object' && pi.latest_charge
      ? pi.latest_charge
      : null;
  const chargeId =
    charge?.id ??
    (typeof pi.latest_charge === 'string' ? pi.latest_charge : '');

  const piSuffix = idSuffix(pi.id);
  const metadataOrderId = String(pi.metadata?.internalCheckoutId ?? '').trim();

  return {
    paymentIntentId: pi.id,
    paymentIntentIdSuffix: piSuffix,
    chargeIdSuffix: chargeId ? idSuffix(chargeId) : 'unknown',
    amountCents: Number(pi.amount) || 0,
    currency: String(pi.currency ?? 'usd'),
    stripeMode: pi.livemode ? 'live' : 'test_only',
    livemode: pi.livemode === true,
    metadataOrderId,
    suffixMatch: piSuffix === db.expectedPiSuffix,
    metadataMatch: metadataOrderId === db.orderId,
    amountMatch: Number(pi.amount) === Number(db.amountUsdCents),
    currencyMatch:
      String(pi.currency ?? '').toLowerCase() ===
      String(db.currency ?? '').toLowerCase(),
    chargePresent: Boolean(chargeId),
  };
}

/**
 * @param {Stripe} stripe
 * @param {import('stripe').Stripe.PaymentIntent} pi
 */
export async function listRefundsForPiSafe(stripe, pi) {
  try {
    const refunds = await stripe.refunds.list({
      payment_intent: pi.id,
      limit: 20,
    });
    const rows = Array.isArray(refunds?.data) ? refunds.data : [];
    const refundedTotal = rows
      .filter((r) => r.status === 'succeeded' || r.status === 'pending')
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const amountCents = Number(pi.amount) || 0;
    return {
      ok: true,
      refundAlreadyExists: refundedTotal >= amountCents && amountCents > 0,
      partialRefundExists:
        refundedTotal > 0 && refundedTotal < amountCents,
    };
  } catch (err) {
    return {
      ok: false,
      error: mapStripeErrorToRootCause(err),
      refundAlreadyExists: false,
      partialRefundExists: false,
    };
  }
}

/**
 * Resolve PaymentIntent: DB full id first, then metadata search.
 * @param {Stripe} stripe
 * @param {{
 *   orderId: string,
 *   paymentIntentIdForVerify: string,
 *   stripePaymentIntentIdSuffix: string,
 * }} db
 */
export async function resolvePaymentIntentForL11(stripe, db) {
  const piId = String(db.paymentIntentIdForVerify ?? '').trim();
  const hasFullId = piId.length > 0 && piId.startsWith('pi_');

  if (hasFullId) {
    const retrieved = await retrievePaymentIntentSafe(stripe, piId);
    if (retrieved.ok && retrieved.pi) {
      return {
        pi: retrieved.pi,
        paymentIntentRetrieveByFullId: true,
        paymentIntentSearchByMetadata: false,
      };
    }
    const searched = await searchPaymentIntentByMetadataSafe(stripe, db.orderId);
    return {
      pi: searched.ok ? searched.pi : null,
      paymentIntentRetrieveByFullId: false,
      paymentIntentSearchByMetadata: searched.ok && Boolean(searched.pi),
      retrieveError: retrieved.error,
      searchError: searched.ok ? null : searched.error,
      searchErr: searched.err,
      retrieveErr: retrieved.err,
    };
  }

  const searched = await searchPaymentIntentByMetadataSafe(stripe, db.orderId);
  return {
    pi: searched.ok ? searched.pi : null,
    paymentIntentRetrieveByFullId: false,
    paymentIntentSearchByMetadata: searched.ok && Boolean(searched.pi),
    searchError: searched.ok ? null : searched.error,
    searchErr: searched.err,
  };
}

/**
 * @param {{
 *   secretRaw: string,
 *   db: {
 *     orderId: string,
 *     paymentIntentIdForVerify: string,
 *     stripePaymentIntentIdSuffix: string,
 *     amountUsdCents: number | null,
 *     currency: string,
 *     checkoutSessionIdForVerify?: string,
 *   },
 *   stripe: Stripe | null,
 * }} input
 */
export async function diagnoseL11StripePayment(input) {
  const out = {
    stripeKeyPresent: false,
    stripeKeyPrefixTest: false,
    stripeAccountReachable: false,
    stripeAccountIdSuffix: 'unknown',
    stripeAccountMode: 'unknown',
    paymentIntentIdPresent: false,
    paymentIntentRetrieveByFullId: false,
    paymentIntentSearchByMetadata: false,
    paymentIntentSuffixMatch: false,
    metadataOrderMatch: false,
    chargeIdPresent: false,
    chargeRetrieveOk: false,
    amountMatch: false,
    currencyMatch: false,
    livemodeFalse: false,
    refundAlreadyExists: false,
    rootCauseCode: ROOT_CAUSE.STRIPE_KEY_MISSING,
    stripePermissionCapability: 'none',
    mapping: null,
  };

  const secret = String(input.secretRaw ?? '').trim();
  out.stripeKeyPresent = secret.length > 0;
  const keyMode = stripeSecretKeyMode(secret);
  out.stripeKeyPrefixTest = keyMode === 'test';

  if (!out.stripeKeyPresent) {
    out.rootCauseCode = ROOT_CAUSE.STRIPE_KEY_MISSING;
    return out;
  }
  if (keyMode === 'live') {
    out.rootCauseCode = ROOT_CAUSE.STRIPE_KEY_NOT_TEST;
    out.stripeAccountMode = 'live_blocked';
    return out;
  }
  if (keyMode !== 'test') {
    out.rootCauseCode = ROOT_CAUSE.STRIPE_KEY_NOT_TEST;
    return out;
  }

  if (!input.stripe) {
    out.rootCauseCode = ROOT_CAUSE.STRIPE_KEY_MISSING;
    return out;
  }

  const acct = await retrieveStripeAccountSafe(input.stripe);
  out.stripeAccountReachable = acct.reachable;
  out.stripeAccountIdSuffix = acct.accountIdSuffix;
  out.stripeAccountMode = acct.reachable
    ? acct.livemode
      ? 'live_blocked'
      : 'test_only'
    : 'unknown';

  if (!acct.reachable) {
    out.rootCauseCode = acct.error ?? ROOT_CAUSE.STRIPE_ACCOUNT_UNREACHABLE;
    if (acct.error === ROOT_CAUSE.STRIPE_PERMISSION_DENIED) {
      out.stripePermissionCapability = stripePermissionCapabilityHint(acct.err);
    }
    return out;
  }

  const piId = String(input.db.paymentIntentIdForVerify ?? '').trim();
  out.paymentIntentIdPresent = piId.length > 0 && piId.startsWith('pi_');

  const resolved = await resolvePaymentIntentForL11(input.stripe, {
    orderId: input.db.orderId,
    paymentIntentIdForVerify: input.db.paymentIntentIdForVerify,
    stripePaymentIntentIdSuffix: input.db.stripePaymentIntentIdSuffix,
  });

  out.paymentIntentRetrieveByFullId = resolved.paymentIntentRetrieveByFullId;
  out.paymentIntentSearchByMetadata = resolved.paymentIntentSearchByMetadata;

  if (!resolved.pi) {
    if (resolved.retrieveError === ROOT_CAUSE.STRIPE_PERMISSION_DENIED) {
      out.rootCauseCode = ROOT_CAUSE.STRIPE_PERMISSION_DENIED;
      out.stripePermissionCapability = stripePermissionCapabilityHint(
        resolved.retrieveErr,
      );
      return out;
    }
    if (resolved.searchError === ROOT_CAUSE.STRIPE_PERMISSION_DENIED) {
      out.rootCauseCode = ROOT_CAUSE.STRIPE_PERMISSION_DENIED;
      out.stripePermissionCapability = stripePermissionCapabilityHint(
        resolved.searchErr,
      );
      return out;
    }
    out.rootCauseCode =
      resolved.retrieveError ??
      resolved.searchError ??
      ROOT_CAUSE.STRIPE_PAYMENT_INTENT_NOT_FOUND;
    return out;
  }

  const snap = buildStripeVerifyFromPaymentIntent(resolved.pi, {
    orderId: input.db.orderId,
    amountUsdCents: input.db.amountUsdCents ?? 0,
    currency: input.db.currency,
    expectedPiSuffix: input.db.stripePaymentIntentIdSuffix,
  });

  let checkoutSession = null;
  const csId = String(input.db.checkoutSessionIdForVerify ?? '').trim();
  if (csId.startsWith('cs_')) {
    const cs = await retrieveCheckoutSessionSafe(input.stripe, csId);
    checkoutSession = cs.ok ? cs.session : null;
  }

  const mapping = evaluateDbStripeMapping({
    pi: resolved.pi,
    orderId: input.db.orderId,
    expectedPiSuffix: input.db.stripePaymentIntentIdSuffix,
    paymentIntentIdForVerify: input.db.paymentIntentIdForVerify,
    checkoutSession,
  });
  out.mapping = mapping;

  out.paymentIntentSuffixMatch = mapping.suffixMatch;
  out.metadataOrderMatch = mapping.linkageOk;
  out.chargeIdPresent = snap.chargePresent;
  out.chargeRetrieveOk = snap.chargePresent;
  out.amountMatch = snap.amountMatch;
  out.currencyMatch = snap.currencyMatch;
  out.livemodeFalse = snap.livemode === false;

  const refundState = await listRefundsForPiSafe(input.stripe, resolved.pi);
  if (!refundState.ok) {
    out.rootCauseCode = refundState.error;
    return out;
  }
  out.refundAlreadyExists = refundState.refundAlreadyExists;

  if (snap.livemode) {
    out.rootCauseCode = ROOT_CAUSE.STRIPE_LIVEMODE_NOT_FALSE;
    return out;
  }
  if (!mapping.suffixMatch) {
    out.rootCauseCode = ROOT_CAUSE.STRIPE_PAYMENT_INTENT_SUFFIX_MISMATCH;
    return out;
  }
  if (!mapping.linkageOk) {
    out.rootCauseCode = ROOT_CAUSE.STRIPE_ORDER_METADATA_MISMATCH;
    return out;
  }
  if (!snap.amountMatch) {
    out.rootCauseCode = ROOT_CAUSE.STRIPE_AMOUNT_MISMATCH;
    return out;
  }
  if (!snap.currencyMatch) {
    out.rootCauseCode = ROOT_CAUSE.STRIPE_CURRENCY_MISMATCH;
    return out;
  }
  if (!snap.chargePresent) {
    out.rootCauseCode = ROOT_CAUSE.STRIPE_CHARGE_NOT_FOUND;
    return out;
  }
  if (refundState.partialRefundExists) {
    out.rootCauseCode = ROOT_CAUSE.STRIPE_PARTIAL_REFUND_EXISTS;
    return out;
  }
  if (refundState.refundAlreadyExists) {
    out.rootCauseCode = ROOT_CAUSE.STRIPE_REFUND_ALREADY_EXISTS;
    return out;
  }

  out.rootCauseCode = ROOT_CAUSE.OK;
  return out;
}

/**
 * @param {Stripe} stripe
 * @param {{
 *   orderId: string,
 *   paymentIntentIdForVerify: string,
 *   stripePaymentIntentIdSuffix: string,
 *   amountUsdCents: number | null,
 *   currency: string,
 * }} db
 */
export async function resolveStripePaymentForL11(stripe, db) {
  const diag = await diagnoseL11StripePayment({
    secretRaw: 'sk_test_internal',
    db: {
      orderId: db.orderId,
      paymentIntentIdForVerify: db.paymentIntentIdForVerify,
      stripePaymentIntentIdSuffix: db.stripePaymentIntentIdSuffix,
      amountUsdCents: db.amountUsdCents,
      currency: db.currency,
      checkoutSessionIdForVerify: db.checkoutSessionIdForVerify ?? '',
    },
    stripe,
  });

  if (diag.rootCauseCode !== ROOT_CAUSE.OK) {
    return {
      verified: false,
      reason: diag.rootCauseCode,
      blockedReason: rootCauseToBlockedReason(diag.rootCauseCode),
    };
  }

  const resolved = await resolvePaymentIntentForL11(stripe, db);
  if (!resolved.pi) {
    return {
      verified: false,
      reason: ROOT_CAUSE.STRIPE_VERIFICATION_LOGIC_BUG,
      blockedReason: 'stripe_verification_logic_bug',
    };
  }

  const snap = buildStripeVerifyFromPaymentIntent(resolved.pi, {
    orderId: db.orderId,
    amountUsdCents: db.amountUsdCents ?? 0,
    currency: db.currency,
    expectedPiSuffix: db.stripePaymentIntentIdSuffix,
  });
  const refundState = await listRefundsForPiSafe(stripe, resolved.pi);
  const mapping = diag.mapping;

  return {
    verified: true,
    reason: ROOT_CAUSE.OK,
    paymentIntentId: resolved.pi.id,
    paymentIntentIdSuffix: mapping?.piSuffixDisplay ?? snap.paymentIntentIdSuffix,
    chargeIdSuffix: mapping?.chargeIdSuffix ?? snap.chargeIdSuffix,
    amountCents: snap.amountCents,
    currency: snap.currency,
    stripeMode: snap.stripeMode,
    livemode: snap.livemode,
    refundAlreadyExists: refundState.refundAlreadyExists,
    partialRefundExists: refundState.partialRefundExists,
    accountIdSuffix: diag.stripeAccountIdSuffix,
  };
}
