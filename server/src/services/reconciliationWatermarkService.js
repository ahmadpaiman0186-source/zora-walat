import { prisma } from '../db.js';

/** @type {const} */
export const RECONCILE_WM = {
  PC_UPDATED_AT: 'payment_checkout_updatedAt',
  REFERRAL_UPDATED_AT: 'referral_updatedAt',
  FULL_PC_ID: 'payment_checkout_full_id',
};

/**
 * @param {string} key
 * @returns {Promise<{ cursorAt: Date | null, cursorId: string | null }>}
 */
export async function getReconciliationWatermark(key) {
  const row = await prisma.reconciliationWatermark.findUnique({
    where: { key },
    select: { cursorAt: true, cursorId: true },
  });
  return {
    cursorAt: row?.cursorAt ?? null,
    cursorId: row?.cursorId ?? null,
  };
}

/**
 * @param {string} key
 * @param {{ cursorAt?: Date | null, cursorId?: string | null }} patch
 */
export async function setReconciliationWatermark(key, patch) {
  await prisma.reconciliationWatermark.upsert({
    where: { key },
    create: {
      key,
      cursorAt: patch.cursorAt ?? null,
      cursorId: patch.cursorId ?? null,
    },
    update: {
      ...(patch.cursorAt !== undefined ? { cursorAt: patch.cursorAt } : {}),
      ...(patch.cursorId !== undefined ? { cursorId: patch.cursorId } : {}),
    },
  });
}
