/**
 * Layer 5 local proof: Stripe `constructEvent` + webhook truth contract (no HTTP, no charges).
 * Prints safe JSON summary — never prints secrets.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import Stripe from 'stripe';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import {
  WEBHOOK_PAYMENT_TRUTH_FAILURE,
  validateStripeCheckoutSessionTruth,
} from '../src/payment/webhookTruthContract.js';
import { getStripeClient } from '../src/services/stripe.js';

const secret = String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();

/** Must satisfy `isLikelyPaymentCheckoutId` (lowercase alnum 20–36) for truth validation. */
const oid = `cm${randomBytes(16).toString('hex').slice(0, 23)}`;
const order = {
  id: oid,
  userId: 'usr_proof',
  orderStatus: ORDER_STATUS.PENDING,
  status: PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED,
  amountUsdCents: 1000,
  currency: 'usd',
  stripeCheckoutSessionId: null,
};

const sessionPaid = {
  id: `cs_proof_${randomUUID().slice(0, 8)}`,
  object: 'checkout.session',
  mode: 'payment',
  payment_status: 'paid',
  amount_total: 1000,
  currency: 'usd',
  payment_intent: 'pi_proof',
  customer: 'cus_proof',
  metadata: { internalCheckoutId: oid },
};

const eventBody = (session, eid) => ({
  id: eid,
  object: 'event',
  type: 'checkout.session.completed',
  data: { object: session },
});

const out = {
  ok: false,
  validPaidAccepted: false,
  duplicateIdempotent: false,
  mismatchRejected: false,
  invalidSignatureRejected: false,
  fulfillmentDuplicatePrevented: false,
  notes: [],
};

const stripe = getStripeClient();

if (!secret.startsWith('whsec_') || secret.length < 20) {
  out.notes.push('STRIPE_WEBHOOK_SECRET missing or too short — signature proofs skipped');
} else if (!stripe) {
  out.notes.push('Stripe client not configured — signature proofs skipped');
} else {
  const e1 = `evt_proof_truth_${randomUUID().slice(0, 8)}`;
  const payloadOk = JSON.stringify(eventBody(sessionPaid, e1));
  const headerOk = Stripe.webhooks.generateTestHeaderString({
    payload: payloadOk,
    secret,
  });
  try {
    stripe.webhooks.constructEvent(payloadOk, headerOk, secret);
    out.validPaidAccepted = true;
  } catch (e) {
    out.notes.push(`constructEvent valid: ${String(e?.message ?? e).slice(0, 120)}`);
  }

  const payloadBad = JSON.stringify(
    eventBody(sessionPaid, `evt_proof_bad_${randomUUID().slice(0, 8)}`),
  );
  const headerBad = Stripe.webhooks.generateTestHeaderString({
    payload: payloadBad,
    secret: `whsec_${'m'.repeat(32)}`,
  });
  try {
    stripe.webhooks.constructEvent(payloadBad, headerBad, secret);
    out.invalidSignatureRejected = false;
  } catch {
    out.invalidSignatureRejected = true;
  }
}

const truthOk = validateStripeCheckoutSessionTruth({
  session: sessionPaid,
  order,
  stripeEventType: 'checkout.session.completed',
});
out.validPaidAccepted = out.validPaidAccepted && truthOk.ok;

const truthMismatch = validateStripeCheckoutSessionTruth({
  session: { ...sessionPaid, amount_total: 1 },
  order,
  stripeEventType: 'checkout.session.completed',
});
out.mismatchRejected =
  !truthMismatch.ok && truthMismatch.failureClass === WEBHOOK_PAYMENT_TRUTH_FAILURE.AMOUNT_MISMATCH;

const truthDup = validateStripeCheckoutSessionTruth({
  session: sessionPaid,
  order: {
    ...order,
    orderStatus: ORDER_STATUS.PAID,
    status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
  },
  stripeEventType: 'checkout.session.completed',
});
out.duplicateIdempotent =
  !truthDup.ok && truthDup.failureClass === WEBHOOK_PAYMENT_TRUTH_FAILURE.DUPLICATE_EVENT;

out.fulfillmentDuplicatePrevented = out.duplicateIdempotent && out.mismatchRejected;

const sigProofSkipped =
  !secret.startsWith('whsec_') || secret.length < 20 || !stripe;
out.ok =
  out.validPaidAccepted &&
  out.mismatchRejected &&
  out.duplicateIdempotent &&
  (sigProofSkipped || out.invalidSignatureRejected);

console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);
