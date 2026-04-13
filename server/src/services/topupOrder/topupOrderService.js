import { randomUUID } from 'node:crypto';

import { FULFILLMENT_STATUS, PAYMENT_STATUS } from '../../domain/topupOrder/statuses.js';
import { isStripeKeyAllowedForWebTopupCharges } from '../../config/stripeEnv.js';
import { computeTopupOrderPayloadHash, sanitizeBoundedString } from '../../lib/topupOrderPayload.js';
import { getStripeClient } from '../stripe.js';
import { prisma } from '../../db.js';
import {
  getTopupOrderById,
  insertTopupOrder,
  listTopupOrdersBySession,
  linkTopupOrderPaymentIntent,
  markTopupOrderPaidClientAtomic,
  verifyUpdateToken,
} from './topupOrderRepository.js';
import { recordWebTopupOrderVelocitySignals } from '../webtopVelocitySignals.js';
import { MONEY_PATH_OUTCOME } from '../../constants/moneyPathOutcome.js';

/** @typedef {import('./topupOrderTypes.js').TopupOrderRecord} TopupOrderRecord */

const TW_ORDER_ID_RE = /^tw_ord_[0-9a-f-]{36}$/i;

export function isValidTopupOrderId(id) {
  return typeof id === 'string' && TW_ORDER_ID_RE.test(id);
}

/**
 * @param {TopupOrderRecord} row
 */
export function toPublicTopupOrder(row) {
  return {
    id: row.id,
    sessionKey: row.sessionKey,
    originCountry: row.originCountry,
    destinationCountry: row.destinationCountry,
    productType: row.productType,
    operatorKey: row.operatorKey,
    operatorLabel: row.operatorLabel,
    phoneNumber: row.phoneNumber,
    productId: row.productId,
    productName: row.productName,
    selectedAmountLabel: row.selectedAmountLabel,
    amountUsd: row.amountUsd,
    amountCents: row.amountCents,
    currency: row.currency,
    paymentIntentId: row.paymentIntentId,
    paymentStatus: row.paymentStatus,
    fulfillmentStatus: row.fulfillmentStatus,
    fulfillmentAttemptCount: row.fulfillmentAttemptCount,
    fulfillmentProvider: row.fulfillmentProvider ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * @param {Record<string, unknown>} rawInput
 * @param {string | null} idempotencyKey
 */
export async function createTopupOrder(rawInput, idempotencyKey) {
  const sessionKey =
    typeof rawInput.sessionKey === 'string' && rawInput.sessionKey.length > 0
      ? rawInput.sessionKey
      : randomUUID();

  const input = {
    sessionKey,
    originCountry: sanitizeBoundedString(String(rawInput.originCountry ?? ''), 8),
    destinationCountry: sanitizeBoundedString(
      String(rawInput.destinationCountry ?? ''),
      8,
    ),
    productType: String(rawInput.productType ?? ''),
    operatorKey: sanitizeBoundedString(String(rawInput.operatorKey ?? ''), 64),
    operatorLabel: sanitizeBoundedString(String(rawInput.operatorLabel ?? ''), 200),
    phoneNumber: String(rawInput.phoneNumber ?? ''),
    productId: sanitizeBoundedString(String(rawInput.productId ?? ''), 128),
    productName: sanitizeBoundedString(String(rawInput.productName ?? ''), 200),
    selectedAmountLabel: sanitizeBoundedString(
      String(rawInput.selectedAmountLabel ?? ''),
      200,
    ),
    amountCents: Number(rawInput.amountCents),
    currency: String(rawInput.currency ?? 'usd').toLowerCase(),
  };

  const payloadHash = computeTopupOrderPayloadHash({
    ...input,
    sessionKey,
  });

  const { record, updateToken, idempotentReplay } = await insertTopupOrder(
    input,
    idempotencyKey,
    payloadHash,
  );

  if (!idempotentReplay) {
    try {
      const row = await prisma.webTopupOrder.findUnique({
        where: { id: record.id },
      });
      if (row) {
        await recordWebTopupOrderVelocitySignals(row);
      }
    } catch {
      /* velocity / fraud flags are best-effort */
    }
  }

  return {
    order: toPublicTopupOrder(record),
    updateToken,
    sessionKey: record.sessionKey,
    idempotentReplay,
    moneyPathOutcome: idempotentReplay
      ? MONEY_PATH_OUTCOME.REPLAYED
      : MONEY_PATH_OUTCOME.ACCEPTED,
  };
}

/**
 * @param {string} orderId
 * @param {number} amountCents
 */
export async function assertTopupOrderEligibleForPaymentIntent(orderId, amountCents) {
  if (!isValidTopupOrderId(orderId)) {
    const err = new Error('invalid_order');
    err.code = 'invalid_order';
    throw err;
  }
  const row = await getTopupOrderById(orderId);
  if (!row) {
    const err = new Error('not_found');
    err.code = 'not_found';
    throw err;
  }
  if (row.paymentStatus !== PAYMENT_STATUS.PENDING) {
    const err = new Error('order_not_pending');
    err.code = 'order_not_pending';
    throw err;
  }
  if (row.paymentIntentId != null) {
    const err = new Error('order_already_linked');
    err.code = 'order_already_linked';
    throw err;
  }
  if (row.amountCents !== amountCents) {
    const err = new Error('amount_mismatch');
    err.code = 'amount_mismatch';
    throw err;
  }
  return row;
}

/**
 * @param {string} orderId
 * @param {string} paymentIntentId
 */
export async function linkWebTopupPaymentIntent(orderId, paymentIntentId) {
  return linkTopupOrderPaymentIntent(orderId, paymentIntentId);
}

export async function getTopupOrderForClient(orderId, sessionKey) {
  if (!isValidTopupOrderId(orderId)) return null;
  const row = await getTopupOrderById(orderId);
  if (!row || row.sessionKey !== sessionKey) return null;
  return toPublicTopupOrder(row);
}

export async function listTopupOrdersForClient(sessionKey, limit) {
  const rows = await listTopupOrdersBySession(sessionKey, limit);
  return rows.map(toPublicTopupOrder);
}

/**
 * Client confirmation path — reconciles with Stripe; idempotent if webhook already paid.
 */
export async function markTopupOrderPaidFromStripe(
  orderId,
  sessionKey,
  updateToken,
  paymentIntentId,
) {
  if (!isValidTopupOrderId(orderId)) {
    const err = new Error('invalid_order');
    err.code = 'invalid_order';
    throw err;
  }
  const row = await getTopupOrderById(orderId);
  if (!row || row.sessionKey !== sessionKey) {
    const err = new Error('not_found');
    err.code = 'not_found';
    throw err;
  }
  if (!verifyUpdateToken(row, updateToken)) {
    const err = new Error('forbidden');
    err.code = 'forbidden';
    throw err;
  }

  if (
    row.paymentStatus === PAYMENT_STATUS.PAID &&
    row.paymentIntentId === paymentIntentId
  ) {
    return { order: toPublicTopupOrder(row), markPaidReplay: true };
  }

  if (row.paymentStatus === PAYMENT_STATUS.PAID) {
    const err = new Error('order_not_pending');
    err.code = 'order_not_pending';
    throw err;
  }

  if (row.paymentStatus !== PAYMENT_STATUS.PENDING) {
    const err = new Error('order_not_pending');
    err.code = 'order_not_pending';
    throw err;
  }

  if (!isStripeKeyAllowedForWebTopupCharges()) {
    const err = new Error('stripe_key_mode');
    err.code = 'stripe_key_mode';
    throw err;
  }
  const stripe = getStripeClient();
  if (!stripe) {
    const err = new Error('stripe_missing');
    err.code = 'stripe_missing';
    throw err;
  }

  if (typeof paymentIntentId !== 'string' || !paymentIntentId.startsWith('pi_')) {
    const err = new Error('invalid_pi');
    err.code = 'invalid_pi';
    throw err;
  }

  if (row.paymentIntentId != null && row.paymentIntentId !== paymentIntentId) {
    const err = new Error('pi_mismatch_order');
    err.code = 'pi_mismatch_order';
    throw err;
  }

  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (pi.currency !== 'usd') {
    const err = new Error('pi_currency');
    err.code = 'pi_currency';
    throw err;
  }
  if (pi.amount !== row.amountCents) {
    const err = new Error('pi_amount');
    err.code = 'pi_amount';
    throw err;
  }
  if (pi.status !== 'succeeded') {
    const err = new Error('pi_not_succeeded');
    err.code = 'pi_not_succeeded';
    err.detail = pi.status;
    throw err;
  }
  const metaOrder = pi.metadata?.topup_order_id;
  if (
    metaOrder != null &&
    String(metaOrder).length > 0 &&
    metaOrder !== row.id
  ) {
    const err = new Error('pi_metadata_order');
    err.code = 'pi_metadata_order';
    throw err;
  }

  const atomic = await markTopupOrderPaidClientAtomic(
    row.id,
    sessionKey,
    paymentIntentId,
  );
  if (!atomic) {
    const err = new Error('concurrent_update');
    err.code = 'concurrent_update';
    throw err;
  }
  return {
    order: toPublicTopupOrder(atomic.record),
    markPaidReplay: !atomic.transitioned,
  };
}
