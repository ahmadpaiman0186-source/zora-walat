import { prisma } from '../../db.js';

const STALE_PENDING_MS = 600_000;

function normalizeKey(raw) {
  if (raw == null || typeof raw !== 'string') return null;
  const k = raw.trim().slice(0, 128);
  if (k.length < 8) return null;
  return k;
}

/**
 * Begin or resolve client idempotency for an order fulfillment attempt.
 * @returns {Promise<
 *   | { mode: 'proceed'; key: string }
 *   | { mode: 'replay' }
 *   | { mode: 'conflict' }
 * >}
 */
export async function resolveWebTopupFulfillmentIdempotency(orderId, rawKey) {
  const idempotencyKey = normalizeKey(rawKey);
  if (!idempotencyKey) {
    return { mode: 'proceed', key: '' };
  }

  const existing = await prisma.webTopupFulfillmentIdempotency.findUnique({
    where: {
      orderId_idempotencyKey: { orderId, idempotencyKey },
    },
  });

  if (!existing) {
    await prisma.webTopupFulfillmentIdempotency.create({
      data: {
        orderId,
        idempotencyKey,
        status: 'pending',
      },
    });
    return { mode: 'proceed', key: idempotencyKey };
  }

  if (existing.status === 'completed') {
    return { mode: 'replay' };
  }

  if (existing.status === 'pending') {
    const age = Date.now() - existing.updatedAt.getTime();
    if (age < STALE_PENDING_MS) {
      return { mode: 'conflict' };
    }
    await prisma.webTopupFulfillmentIdempotency.update({
      where: { id: existing.id },
      data: { status: 'pending', updatedAt: new Date() },
    });
    return { mode: 'proceed', key: idempotencyKey };
  }

  await prisma.webTopupFulfillmentIdempotency.update({
    where: { id: existing.id },
    data: { status: 'pending', updatedAt: new Date() },
  });
  return { mode: 'proceed', key: idempotencyKey };
}

/**
 * @param {string} orderId
 * @param {string} idempotencyKey
 * @param {{ attemptNumber?: number, fulfillmentStatus?: string | null, fulfillmentErrorCode?: string | null }} snapshot
 */
export async function completeWebTopupFulfillmentIdempotency(
  orderId,
  idempotencyKey,
  snapshot,
) {
  const k = normalizeKey(idempotencyKey);
  if (!k) return;

  await prisma.webTopupFulfillmentIdempotency.updateMany({
    where: { orderId, idempotencyKey: k, status: 'pending' },
    data: {
      status: 'completed',
      attemptNumber: snapshot.attemptNumber ?? null,
      fulfillmentStatusSnapshot: snapshot.fulfillmentStatus ?? null,
      fulfillmentErrorCodeSnapshot: snapshot.fulfillmentErrorCode ?? null,
    },
  });
}

/**
 * @param {string} orderId
 * @param {string} idempotencyKey
 */
export async function failWebTopupFulfillmentIdempotency(orderId, idempotencyKey) {
  const k = normalizeKey(idempotencyKey);
  if (!k) return;

  await prisma.webTopupFulfillmentIdempotency.updateMany({
    where: { orderId, idempotencyKey: k, status: 'pending' },
    data: { status: 'failed' },
  });
}
