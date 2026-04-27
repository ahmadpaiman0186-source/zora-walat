import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { prisma } from '../db.js';
import { buildPricingPolicySnapshotFields } from '../domain/pricing/pricingSnapshotPolicy.js';

/**
 * @param {object} params
 * @param {string} params.idempotencyKey
 * @param {string} params.fingerprint
 * @param {string} params.userId Authenticated user (JWT sub).
 */
export async function findReusableCheckout({
  idempotencyKey,
  fingerprint,
  userId,
}) {
  const row = await prisma.paymentCheckout.findUnique({
    where: { idempotencyKey },
  });
  if (!row) return null;
  if (row.userId != null && row.userId !== userId) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  if (row.requestFingerprint !== fingerprint) {
    const err = new Error('Idempotency-Key reused with different request body');
    err.status = 409;
    throw err;
  }
  const awaitingPayment =
    row.status === PAYMENT_CHECKOUT_STATUS.PAYMENT_PENDING ||
    row.status === PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED;
  if (awaitingPayment && row.stripeCheckoutUrl) {
    return { url: row.stripeCheckoutUrl, reused: true, id: row.id };
  }
  if (row.status === PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED) {
    const err = new Error('Previous checkout attempt failed; use a new Idempotency-Key');
    err.status = 409;
    throw err;
  }
  if (
    row.status === PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED ||
    row.status === PAYMENT_CHECKOUT_STATUS.RECHARGE_COMPLETED ||
    row.orderStatus === ORDER_STATUS.PAID ||
    row.orderStatus === ORDER_STATUS.PROCESSING ||
    row.orderStatus === ORDER_STATUS.FULFILLED
  ) {
    const err = new Error('Payment already completed for this Idempotency-Key');
    err.status = 409;
    throw err;
  }
  const err = new Error('Checkout already in progress for this Idempotency-Key');
  err.status = 409;
  throw err;
}

/**
 * @returns {Promise<{ id: string }>}
 */
export async function createInitiatedRow({
  idempotencyKey,
  fingerprint,
  userId,
  amountCents,
  currency,
  senderCountryCode,
  operatorKey,
  recipientNational,
  packageId,
  clientOrigin,
  pricing,
  pricingMeta,
}) {
  const meta = {
    source: 'checkout_api',
    phase: 'mobile_topup',
  };
  return prisma.paymentCheckout.create({
    data: {
      idempotencyKey,
      requestFingerprint: fingerprint,
      userId,
      status: PAYMENT_CHECKOUT_STATUS.INITIATED,
      amountUsdCents: amountCents,
      currency,
      senderCountryCode: senderCountryCode ?? null,
      productType: 'mobile_topup',
      providerCostUsdCents: pricing?.providerCostCents ?? null,
      stripeFeeEstimateUsdCents: pricing?.stripeFeeEstimateCents ?? null,
      stripeFeeActualUsdCents: null,
      fxBufferUsdCents: pricing?.fxBufferCents ?? null,
      riskBufferUsdCents: pricing?.riskBufferCents ?? null,
      targetProfitUsdCents: pricing?.targetProfitCents ?? null,
      projectedNetMarginBp: pricing?.projectedNetMarginBp ?? null,
      actualNetMarginBp: null,
      pricingSnapshot: pricing
        ? {
            ...(pricingMeta ?? buildPricingPolicySnapshotFields()),
            providerCostCents: pricing.providerCostCents,
            fxBufferCents: pricing.fxBufferCents,
            fxOnlyCents: pricing.fxOnlyCents,
            taxBufferCents: pricing.taxBufferCents,
            riskBufferCents: pricing.riskBufferCents,
            stripeFeeEstimateCents: pricing.stripeFeeEstimateCents,
            targetProfitCents: pricing.targetProfitCents,
            projectedNetMarginBp: pricing.projectedNetMarginBp,
            finalPriceCents: pricing.finalPriceCents,
            customerProductValueUsdCents: pricing.customerProductValueCents,
            customerGovernmentTaxUsdCents: pricing.customerGovernmentTaxCents,
            customerZoraServiceFeeUsdCents: pricing.customerZoraServiceFeeCents,
            finalPriceUsdCents: pricing.finalPriceCents,
            formula:
              'total = product_value + government_sales_tax(product) + zora_service_fee; margin on total; COGS buffers internal only',
          }
        : undefined,
      operatorKey,
      recipientNational,
      packageId,
      orderStatus: ORDER_STATUS.PENDING,
      provider: 'stripe',
      clientOrigin: clientOrigin ?? null,
      metadata: meta,
    },
    select: { id: true },
  });
}

export async function getCheckoutByIdempotencyKey(idempotencyKey) {
  return prisma.paymentCheckout.findUnique({
    where: { idempotencyKey },
  });
}

export async function markCheckoutCreated(
  id,
  { stripeCheckoutSessionId, stripeCheckoutUrl },
) {
  await prisma.paymentCheckout.update({
    where: { id },
    data: {
      stripeCheckoutSessionId,
      stripeCheckoutUrl,
      /** Stripe session exists; user has not completed payment until webhook confirms. */
      status: PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED,
    },
  });
}

export async function markCheckoutFailed(id) {
  await prisma.paymentCheckout.updateMany({
    where: { id, status: PAYMENT_CHECKOUT_STATUS.INITIATED },
    data: {
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED,
      orderStatus: ORDER_STATUS.FAILED,
      failedAt: new Date(),
      failureReason: 'stripe_checkout_session_creation_failed',
    },
  });
}