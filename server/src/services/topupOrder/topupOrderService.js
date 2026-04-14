import { randomUUID } from 'node:crypto';

import { FULFILLMENT_STATUS, PAYMENT_STATUS } from '../../domain/topupOrder/statuses.js';
import { assertWebTopupPaymentTransition } from '../../domain/topupOrder/webtopupStateMachine.js';
import { isStripeKeyAllowedForWebTopupCharges } from '../../config/stripeEnv.js';
import { computeTopupOrderPayloadHash, sanitizeBoundedString } from '../../lib/topupOrderPayload.js';
import { getStripeClient } from '../stripe.js';
import { prisma } from '../../db.js';
import {
  getTopupOrderById,
  insertTopupOrder,
  listTopupOrdersBySession,
  listTopupOrdersByUserId,
  linkTopupOrderPaymentIntent,
  markTopupOrderPaidClientAtomic,
  verifyUpdateToken,
} from './topupOrderRepository.js';
import { recordWebTopupOrderVelocitySignals } from '../webtopVelocitySignals.js';
import { assertWebTopupOrderCreateRiskOrThrow } from '../risk/assertWebTopupOrderCreateRisk.js';
import { MONEY_PATH_OUTCOME } from '../../constants/moneyPathOutcome.js';
import { timingSafeEqualUtf8 } from '../../lib/timingSafeString.js';

/** @typedef {import('./topupOrderTypes.js').TopupOrderRecord} TopupOrderRecord */

const TW_ORDER_ID_RE = /^tw_ord_[0-9a-f-]{36}$/i;

export function isValidTopupOrderId(id) {
  return typeof id === 'string' && TW_ORDER_ID_RE.test(id);
}

/**
 * @param {TopupOrderRecord} row
 * @param {{ viewerUserId?: string | null }} [viewer]
 */
export function toPublicTopupOrder(row, viewer = {}) {
  const viewerUserId = viewer.viewerUserId ?? null;
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
    /** True when this order was created with a logged-in account (no raw user id exposed). */
    accountLinked: Boolean(row.userId),
    ...(viewerUserId && row.userId === viewerUserId
      ? { viewerIsBoundUser: true }
      : {}),
    /** Deterministic reconciliation handle (no PII beyond public order id). */
    reconciliation: {
      orderId: row.id,
      paymentIntentId: row.paymentIntentId ?? null,
      paymentStatus: row.paymentStatus,
      fulfillmentStatus: row.fulfillmentStatus,
      accountLinked: Boolean(row.userId),
    },
  };
}

/**
 * Mark-paid session proof: explicit sessionKey (timing-safe) OR JWT matches bound userId.
 * @param {TopupOrderRecord} row
 * @param {string | null | undefined} sessionKey
 * @param {string | null | undefined} jwtUserId
 */
export function assertWebTopupMarkPaidSessionProof(row, sessionKey, jwtUserId) {
  if (sessionKey) {
    return timingSafeEqualUtf8(row.sessionKey, sessionKey);
  }
  if (jwtUserId && row.userId && row.userId === jwtUserId) {
    return true;
  }
  return false;
}

/**
 * @param {Record<string, unknown>} rawInput
 * @param {string | null} idempotencyKey
 * @param {{ boundUserId?: string | null, riskLog?: import('pino').Logger, riskTraceId?: string | null }} [options]
 */
export async function createTopupOrder(rawInput, idempotencyKey, options = {}) {
  const boundUserId = options.boundUserId ?? null;
  const sessionKey =
    typeof rawInput.sessionKey === 'string' && rawInput.sessionKey.length > 0
      ? rawInput.sessionKey
      : randomUUID();

  const input = {
    sessionKey,
    userId: boundUserId,
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

  await assertWebTopupOrderCreateRiskOrThrow({
    sessionKey,
    rawInput: {
      phoneNumber: input.phoneNumber,
      destinationCountry: input.destinationCountry,
      amountCents: input.amountCents,
    },
    log: options.riskLog,
    traceId: options.riskTraceId ?? null,
  });

  const payloadHash = computeTopupOrderPayloadHash({
    ...input,
    sessionKey,
    boundUserId,
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
    order: toPublicTopupOrder(record, { viewerUserId: record.userId }),
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

/**
 * Read policy: valid `sessionKey` (capability) **or** matching JWT user for a user-bound order (recovery).
 * Wrong session alone does not grant access unless JWT matches `row.userId`.
 *
 * @param {string | null | undefined} sessionKey
 * @param {string | null | undefined} jwtUserId
 */
export async function resolveTopupOrderForRead(orderId, sessionKey, jwtUserId) {
  if (!isValidTopupOrderId(orderId)) return null;
  const row = await getTopupOrderById(orderId);
  if (!row) return null;

  if (sessionKey && timingSafeEqualUtf8(row.sessionKey, sessionKey)) {
    return toPublicTopupOrder(row, { viewerUserId: jwtUserId ?? null });
  }
  if (jwtUserId && row.userId && row.userId === jwtUserId) {
    return toPublicTopupOrder(row, { viewerUserId: jwtUserId });
  }
  return null;
}

export async function getTopupOrderForClient(orderId, sessionKey) {
  return resolveTopupOrderForRead(orderId, sessionKey, null);
}

export async function listTopupOrdersForClient(sessionKey, limit, jwtUserId) {
  const rows = await listTopupOrdersBySession(sessionKey, limit);
  return rows.map((r) =>
    toPublicTopupOrder(r, { viewerUserId: jwtUserId ?? null }),
  );
}

export async function listTopupOrdersForBoundUser(userId, limit) {
  const rows = await listTopupOrdersByUserId(userId, limit);
  return rows.map((r) => toPublicTopupOrder(r, { viewerUserId: userId }));
}

/**
 * Client confirmation path — reconciles with Stripe; idempotent if webhook already paid.
 * @param {{ jwtUserId?: string | null }} [options]
 */
export async function markTopupOrderPaidFromStripe(
  orderId,
  sessionKey,
  updateToken,
  paymentIntentId,
  options = {},
) {
  const jwtUserId = options.jwtUserId ?? null;
  if (!isValidTopupOrderId(orderId)) {
    const err = new Error('invalid_order');
    err.code = 'invalid_order';
    throw err;
  }
  const row = await getTopupOrderById(orderId);
  if (!row || !assertWebTopupMarkPaidSessionProof(row, sessionKey, jwtUserId)) {
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

  const transitionCheck = assertWebTopupPaymentTransition(
    row.paymentStatus,
    PAYMENT_STATUS.PAID,
    'client_mark_paid',
  );
  if (!transitionCheck.ok) {
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
    row.sessionKey,
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
