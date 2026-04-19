/**
 * Prisma-backed WebTopupOrder persistence (durable, multi-instance safe).
 * Swap: replace imports with another store implementing the same exports.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { prisma, Prisma } from '../../db.js';
import { timingSafeEqualUtf8 } from '../../lib/timingSafeString.js';
import { FULFILLMENT_STATUS, PAYMENT_STATUS } from '../../domain/topupOrder/statuses.js';
import { computePhoneAnalyticsHash } from '../topupFulfillment/webtopPhoneAnalytics.js';

/** @typedef {import('./topupOrderTypes.js').TopupOrderRecord} TopupOrderRecord */

export function hashToken(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function verifyUpdateToken(record, plainToken) {
  if (!plainToken || typeof plainToken !== 'string') return false;
  return hashToken(plainToken) === record.updateTokenHash;
}

/**
 * @param {import('@prisma/client').WebTopupOrder} row
 * @returns {TopupOrderRecord}
 */
export function rowToRecord(row) {
  return {
    id: row.id,
    userId: row.userId ?? null,
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
    amountUsd: row.amountCents / 100,
    amountCents: row.amountCents,
    currency: row.currency,
    paymentIntentId: row.paymentIntentId,
    paymentStatus: row.paymentStatus,
    fulfillmentStatus: row.fulfillmentStatus,
    fulfillmentProvider: row.fulfillmentProvider,
    fulfillmentAttemptCount: row.fulfillmentAttemptCount,
    fulfillmentRequestedAt: row.fulfillmentRequestedAt?.toISOString() ?? null,
    fulfillmentCompletedAt: row.fulfillmentCompletedAt?.toISOString() ?? null,
    fulfillmentFailedAt: row.fulfillmentFailedAt?.toISOString() ?? null,
    fulfillmentReference: row.fulfillmentReference,
    fulfillmentErrorCode: row.fulfillmentErrorCode,
    fulfillmentErrorMessageSafe: row.fulfillmentErrorMessageSafe,
    fulfillmentNextRetryAt: row.fulfillmentNextRetryAt?.toISOString() ?? null,
    lastProviderPayloadHash: row.lastProviderPayloadHash,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    updateTokenHash: row.updateTokenHash,
  };
}

/**
 * @param {Omit<TopupOrderRecord, 'id' | 'paymentIntentId' | 'paymentStatus' | 'fulfillmentStatus' | 'createdAt' | 'updatedAt' | 'updateTokenHash' | 'amountUsd'> & { amountCents: number }} input
 * @param {string | null} idempotencyKey
 * @param {string} payloadHash
 * @returns {Promise<{ record: TopupOrderRecord, updateToken: string | null, idempotentReplay: boolean }>}
 */
export async function insertTopupOrder(input, idempotencyKey, payloadHash) {
  if (idempotencyKey) {
    const existing = await prisma.webTopupOrder.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      if (existing.payloadHash !== payloadHash) {
        const err = new Error('idempotency_conflict');
        err.code = 'idempotency_conflict';
        throw err;
      }
      return {
        record: rowToRecord(existing),
        updateToken: null,
        idempotentReplay: true,
      };
    }
  }

  const id = `tw_ord_${randomUUID()}`;
  const updateToken = randomBytes(32).toString('hex');
  const tokenHash = hashToken(updateToken);
  const phoneAnalyticsHash = computePhoneAnalyticsHash(
    input.destinationCountry,
    input.phoneNumber,
  );

  try {
    const row = await prisma.webTopupOrder.create({
      data: {
        id,
        sessionKey: input.sessionKey,
        idempotencyKey: idempotencyKey ?? null,
        payloadHash,
        phoneAnalyticsHash,
        originCountry: input.originCountry,
        destinationCountry: input.destinationCountry,
        productType: input.productType,
        operatorKey: input.operatorKey,
        operatorLabel: input.operatorLabel,
        phoneNumber: input.phoneNumber,
        productId: input.productId,
        productName: input.productName,
        selectedAmountLabel: input.selectedAmountLabel,
        amountCents: input.amountCents,
        currency: input.currency ?? 'usd',
        userId: input.userId ?? null,
        paymentIntentId: null,
        paymentStatus: PAYMENT_STATUS.PENDING,
        fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
        updateTokenHash: tokenHash,
      },
    });
    return {
      record: rowToRecord(row),
      updateToken,
      idempotentReplay: false,
    };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002' &&
      idempotencyKey
    ) {
      const raced = await prisma.webTopupOrder.findUnique({
        where: { idempotencyKey },
      });
      if (raced && raced.payloadHash === payloadHash) {
        return {
          record: rowToRecord(raced),
          updateToken: null,
          idempotentReplay: true,
        };
      }
    }
    throw e;
  }
}

/** @param {string} id */
export async function getTopupOrderById(id) {
  const row = await prisma.webTopupOrder.findUnique({ where: { id } });
  return row ? rowToRecord(row) : null;
}

/**
 * @param {string} sessionKey
 * @param {number} limit
 * @returns {Promise<TopupOrderRecord[]>}
 */
export async function listTopupOrdersBySession(sessionKey, limit) {
  const rows = await prisma.webTopupOrder.findMany({
    where: { sessionKey },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows.map(rowToRecord);
}

/**
 * @param {string} userId
 * @param {number} limit
 * @returns {Promise<import('./topupOrderTypes.js').TopupOrderRecord[]>}
 */
export async function listTopupOrdersByUserId(userId, limit) {
  const rows = await prisma.webTopupOrder.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows.map(rowToRecord);
}

/**
 * @param {string} id
 * @param {Partial<Pick<TopupOrderRecord, 'paymentIntentId' | 'paymentStatus' | 'fulfillmentStatus'>>} patch
 */
export async function updateTopupOrder(id, patch) {
  try {
    const row = await prisma.webTopupOrder.update({
      where: { id },
      data: {
        ...patch,
      },
    });
    return rowToRecord(row);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return null;
    }
    throw e;
  }
}

/**
 * Bind the first PaymentIntent to this order (exactly once while pending).
 * @returns {Promise<boolean>} true if linked or already same PI
 */
export async function linkTopupOrderPaymentIntent(orderId, paymentIntentId) {
  const row = await prisma.webTopupOrder.findUnique({ where: { id: orderId } });
  if (!row) return false;
  if (row.paymentIntentId === paymentIntentId) return true;
  if (row.paymentIntentId != null) return false;
  const n = await prisma.webTopupOrder.updateMany({
    where: {
      id: orderId,
      paymentStatus: PAYMENT_STATUS.PENDING,
      paymentIntentId: null,
    },
    data: { paymentIntentId },
  });
  return n.count === 1;
}

/**
 * Client-driven paid transition (Stripe verify already done in service).
 * `transitioned: false` means the row was already PAID with this PI (idempotent replay).
 * @returns {Promise<{ record: TopupOrderRecord, transitioned: boolean } | null>}
 */
export async function markTopupOrderPaidClientAtomic(
  orderId,
  sessionKey,
  paymentIntentId,
) {
  const n = await prisma.webTopupOrder.updateMany({
    where: {
      id: orderId,
      sessionKey,
      paymentStatus: PAYMENT_STATUS.PENDING,
    },
    data: {
      paymentIntentId,
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.PENDING,
      paidAt: new Date(),
    },
  });
  if (n.count === 1) {
    const row = await prisma.webTopupOrder.findUnique({ where: { id: orderId } });
    return row ? { record: rowToRecord(row), transitioned: true } : null;
  }
  const row = await prisma.webTopupOrder.findUnique({ where: { id: orderId } });
  if (
    row &&
    timingSafeEqualUtf8(row.sessionKey, sessionKey) &&
    row.paymentStatus === PAYMENT_STATUS.PAID &&
    row.paymentIntentId === paymentIntentId
  ) {
    return { record: rowToRecord(row), transitioned: false };
  }
  return null;
}

/** @param {string | undefined | null} idempotencyKey */
export async function __clearWebTopupOrdersDevOnly(idempotencyKey) {
  if (process.env.NODE_ENV === 'production') return;
  if (idempotencyKey === '__tests__') {
    await prisma.webTopupOrder.deleteMany({});
  }
}
