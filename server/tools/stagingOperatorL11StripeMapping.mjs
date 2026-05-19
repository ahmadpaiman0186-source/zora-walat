/**
 * L-11 DB ↔ Stripe linkage helpers (suffix-safe, no secrets in logs).
 */

import { idSuffix } from './stagingOperatorL11Refund.mjs';

/** Metadata keys checked for order correlation (enum-only lists). */
export const STRIPE_ORDER_METADATA_KEYS = Object.freeze([
  'internalCheckoutId',
  'orderId',
  'checkoutId',
]);

/**
 * Normalize suffix tails for compare (API uses safeSuffix without ellipsis; harness uses idSuffix).
 * @param {string | null | undefined} value
 * @param {number} [len]
 */
export function normalizeSuffixTail(value, len = 10) {
  const s = String(value ?? '')
    .trim()
    .replace(/^…+/, '');
  if (!s) return '';
  return s.length <= len ? s : s.slice(-len);
}

/**
 * @param {string | null | undefined} a
 * @param {string | null | undefined} b
 * @param {number} [len]
 */
export function suffixTailMatch(a, b, len = 10) {
  const ta = normalizeSuffixTail(a, len);
  const tb = normalizeSuffixTail(b, len);
  if (!ta || !tb) return false;
  return ta === tb;
}

/**
 * @param {import('stripe').Stripe.PaymentIntent} pi
 */
export function stripeMetadataKeyNames(pi) {
  const meta = pi?.metadata && typeof pi.metadata === 'object' ? pi.metadata : {};
  return Object.keys(meta)
    .map((k) => String(k).trim())
    .filter((k) => /^[a-zA-Z0-9_]+$/.test(k))
    .sort();
}

/**
 * @param {import('stripe').Stripe.PaymentIntent} pi
 * @param {string} key
 */
export function stripeMetadataValue(pi, key) {
  const meta = pi?.metadata && typeof pi.metadata === 'object' ? pi.metadata : {};
  return String(meta[key] ?? '').trim();
}

/**
 * @param {import('stripe').Stripe.PaymentIntent} pi
 * @param {string} orderId
 */
export function metadataOrderIdCandidatesFromPi(pi, orderId) {
  const candidates = [];
  for (const key of STRIPE_ORDER_METADATA_KEYS) {
    const v = stripeMetadataValue(pi, key);
    if (v) candidates.push({ source: `pi.metadata.${key}`, value: v });
  }
  return candidates;
}

/**
 * @param {import('stripe').Stripe.Checkout.Session | null | undefined} session
 * @param {string} orderId
 */
export function metadataOrderIdCandidatesFromSession(session, orderId) {
  if (!session?.metadata || typeof session.metadata !== 'object') return [];
  const candidates = [];
  for (const key of STRIPE_ORDER_METADATA_KEYS) {
    const v = String(session.metadata[key] ?? '').trim();
    if (v) candidates.push({ source: `session.metadata.${key}`, value: v });
  }
  const ref = String(session.client_reference_id ?? '').trim();
  if (ref) {
    candidates.push({ source: 'session.client_reference_id', value: ref });
  }
  return candidates;
}

/**
 * @param {Array<{ source: string, value: string }>} candidates
 * @param {string} orderId
 */
export function orderIdMatchesAnyCandidate(candidates, orderId) {
  const want = String(orderId ?? '').trim();
  if (!want) return { match: false, matchedSource: null };
  for (const c of candidates) {
    if (c.value === want) {
      return { match: true, matchedSource: c.source };
    }
  }
  return { match: false, matchedSource: null };
}

/**
 * @param {import('stripe').Stripe} stripe
 * @param {string} sessionId
 */
export async function retrieveCheckoutSessionSafe(stripe, sessionId) {
  const id = String(sessionId ?? '').trim();
  if (!id.startsWith('cs_')) {
    return { ok: false, session: null };
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(id);
    return { ok: true, session };
  } catch {
    return { ok: false, session: null };
  }
}

/**
 * @param {{
 *   pi: import('stripe').Stripe.PaymentIntent,
 *   orderId: string,
 *   expectedPiSuffix: string,
 *   paymentIntentIdForVerify: string,
 *   checkoutSession?: import('stripe').Stripe.Checkout.Session | null,
 * }} input
 */
export function evaluateDbStripeMapping(input) {
  const pi = input.pi;
  const orderId = String(input.orderId ?? '').trim();
  const dbPiId = String(input.paymentIntentIdForVerify ?? '').trim();

  const piSuffixDisplay = idSuffix(pi.id);
  const dbPiSuffixDisplay = idSuffix(dbPiId || pi.id);
  const suffixMatch = suffixTailMatch(piSuffixDisplay, input.expectedPiSuffix);
  const dbPiIdMatchesRetrieved =
    dbPiId.length > 0 && dbPiId === String(pi.id ?? '').trim();

  const piCandidates = metadataOrderIdCandidatesFromPi(pi, orderId);
  const sessionCandidates = metadataOrderIdCandidatesFromSession(
    input.checkoutSession,
    orderId,
  );
  const allCandidates = [...piCandidates, ...sessionCandidates];

  const internalFromPi = stripeMetadataValue(pi, 'internalCheckoutId');
  const internalFromSession = input.checkoutSession
    ? String(input.checkoutSession.metadata?.internalCheckoutId ?? '').trim()
    : '';

  const piInternalMatch = internalFromPi === orderId;
  const sessionInternalMatch = internalFromSession === orderId;
  const orderIdFromPiMeta = stripeMetadataValue(pi, 'orderId');
  const orderIdMetaMatch = orderIdFromPiMeta === orderId;

  const anyMatch = orderIdMatchesAnyCandidate(allCandidates, orderId);

  /** Hosted Checkout: metadata on session, not PI — accept DB PI linkage + session metadata. */
  const hostedCheckoutLinkage =
    dbPiIdMatchesRetrieved &&
    suffixMatch &&
    (sessionInternalMatch ||
      String(input.checkoutSession?.client_reference_id ?? '').trim() === orderId);

  const linkageOk =
    dbPiIdMatchesRetrieved &&
    suffixMatch &&
    (anyMatch.match || piInternalMatch || sessionInternalMatch || hostedCheckoutLinkage);

  let rootCauseCode = 'ok';
  if (!dbPiIdMatchesRetrieved) {
    rootCauseCode = 'stripe_payment_intent_not_found';
  } else if (!suffixMatch) {
    rootCauseCode = 'stripe_payment_intent_suffix_mismatch';
  } else if (!linkageOk) {
    rootCauseCode = 'stripe_order_metadata_mismatch';
  }

  return {
    suffixMatch,
    dbPiIdMatchesRetrieved,
    metadataMatch: linkageOk,
    piInternalMatch,
    sessionInternalMatch,
    orderIdMetaMatch,
    hostedCheckoutLinkage,
    metadataMatchedSource: anyMatch.matchedSource,
    stripeMetadataKeysPresent: stripeMetadataKeyNames(pi),
    linkageOk,
    rootCauseCode,
    piSuffixDisplay,
    dbPiSuffixDisplay,
    internalCheckoutIdSuffix: idSuffix(orderId),
    checkoutSessionIdSuffix: input.checkoutSession?.id
      ? idSuffix(input.checkoutSession.id)
      : 'unknown',
    chargeIdSuffix:
      typeof pi.latest_charge === 'object' && pi.latest_charge?.id
        ? idSuffix(pi.latest_charge.id)
        : typeof pi.latest_charge === 'string'
          ? idSuffix(pi.latest_charge)
          : 'unknown',
  };
}
