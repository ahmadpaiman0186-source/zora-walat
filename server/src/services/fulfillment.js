import { config } from '../config.js';
import { sendTopup, reloadlyOperatorId } from './reloadly.js';
import { creditCommission } from './wallet.js';
import { recordVelocity } from './fraud.js';
import { normalizeAfghanNational } from '../lib/phone.js';

function commissionFromStripeCents(amountReceivedCents) {
  return Math.floor(amountReceivedCents * 0.1);
}

/**
 * After Stripe successful payment: provider API first (airtime), then commission.
 * Refunds Stripe payment if Reloadly fails after capture.
 */
export async function fulfillTopupOrder({
  prisma,
  logger,
  stripe,
  paymentIntent,
  order,
}) {
  const pi = paymentIntent;
  const received = pi.amount_received ?? pi.amount;
  const commission = commissionFromStripeCents(received);

  await prisma.topupOrder.update({
    where: { id: order.id },
    data: { status: 'FULFILLING' },
  });

  const serviceLine = pi.metadata?.service_line || '';

  if (serviceLine !== 'airtime') {
    await creditCommission({
      prisma,
      stripePaymentId: pi.id,
      commissionCents: commission,
      metadata: {
        operator: order.operatorKey,
        productId: order.productId,
      },
    });

    await prisma.topupOrder.update({
      where: { id: order.id },
      data: {
        status: 'FULFILLED',
        commissionCents: commission,
        failureReason: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        event: 'FULFILL_SKIPPED_NON_AIRTIME',
        payload: JSON.stringify({
          paymentIntentId: pi.id,
          serviceLine,
        }),
        ip: null,
      },
    });

    await recordVelocity(prisma, order.recipientNational, order.amountUsdCents);
    return { mode: 'skipped_provider' };
  }

  const operatorNumericId = reloadlyOperatorId(order.operatorKey);
  if (!operatorNumericId) {
    await tryRefund(stripe, pi.id, logger);

    await prisma.topupOrder.update({
      where: { id: order.id },
      data: {
        status: 'FULFILLMENT_FAILED',
        failureReason: 'MISSING_RELOADLY_OPERATOR_ID',
      },
    });

    await prisma.auditLog.create({
      data: {
        event: 'FULFILLMENT_CONFIG_ERROR',
        payload: JSON.stringify({
          operatorKey: order.operatorKey,
          paymentIntentId: pi.id,
        }),
        ip: null,
      },
    });

    logger.error(
      { operatorKey: order.operatorKey },
      'Configure RELOADLY_OPERATOR_* env — payment refunded',
    );
    return { mode: 'config_error' };
  }

  const national =
    normalizeAfghanNational(order.recipientNational) ||
    order.recipientNational;
  const amountUsd = order.amountUsdCents / 100;

  try {
    const result = await sendTopup({
      operatorId: operatorNumericId,
      amountUsd,
      nationalNumber: national,
      customIdentifier: pi.id,
    });

    await creditCommission({
      prisma,
      stripePaymentId: pi.id,
      commissionCents: commission,
      metadata: {
        operator: order.operatorKey,
        productId: order.productId,
      },
    });

    await prisma.topupOrder.update({
      where: { id: order.id },
      data: {
        status: 'FULFILLED',
        commissionCents: commission,
        reloadlyTransactionId: result.transactionId || null,
        reloadlyReference: result.operatorReference || null,
        failureReason: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        event: 'RELOADLY_TOPUP_OK',
        payload: JSON.stringify({
          paymentIntentId: pi.id,
          reloadlyTransactionId: result.transactionId,
        }),
        ip: null,
      },
    });

    await recordVelocity(prisma, order.recipientNational, order.amountUsdCents);
    return { mode: 'reloadly', result };
  } catch (e) {
    logger.error({ err: e, pi: pi.id }, 'Reloadly topup failed — refunding');

    await tryRefund(stripe, pi.id, logger);

    await prisma.topupOrder.update({
      where: { id: order.id },
      data: {
        status: 'FULFILLMENT_FAILED',
        failureReason: String(e.message || e).slice(0, 500),
        commissionCents: 0,
      },
    });

    await prisma.auditLog.create({
      data: {
        event: 'RELOADLY_TOPUP_FAILED',
        payload: JSON.stringify({
          paymentIntentId: pi.id,
          error: String(e.message || e),
          reloadly: e.reloadlyBody || null,
        }),
        ip: null,
      },
    });

    return { mode: 'provider_error', error: e };
  }
}

async function tryRefund(stripe, paymentIntentId, logger) {
  try {
    if (!config.stripeSecretKey) return;
    await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: 'requested_by_customer',
    });
    logger.info({ paymentIntentId }, 'Stripe refund issued after fulfillment failure');
  } catch (re) {
    logger.error({ err: re, paymentIntentId }, 'Stripe refund failed — manual reconciliation');
  }
}
