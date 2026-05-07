import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Run fn inside a transaction that is always rolled back.
 * @template T
 * @param {(tx: import('@prisma/client').Prisma.TransactionClient) => Promise<T>} fn
 * @returns {Promise<T|undefined>}
 */
export async function runInRollbackTxn(fn) {
  try {
    /** @type {T} */
    let out;
    await prisma.$transaction(async (tx) => {
      out = await fn(tx);
      // Force rollback (never commit).
      throw new Error('__ROLLBACK__');
    });
    return out;
  } catch (e) {
    if (e && typeof e === 'object' && e.message === '__ROLLBACK__') return;
    if (typeof e?.message === 'string' && e.message === '__ROLLBACK__') return;
    throw e;
  }
}

