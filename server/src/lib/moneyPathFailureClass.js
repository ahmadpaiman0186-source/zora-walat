import { Prisma } from '@prisma/client';

/**
 * Rough classification for retry policy (ops / workers). Not exhaustive.
 * @param {unknown} err
 * @returns {'transient' | 'permanent' | 'unknown'}
 */
export function classifyMoneyPathFailure(err) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2024' || err.code === 'P2034') return 'transient';
    if (err.code === 'P2002') return 'permanent';
    if (err.code === 'P2025') return 'permanent';
  }
  const msg = String(err?.message ?? err ?? '').toLowerCase();
  if (/timeout|econnreset|econnrefused|socket|network|rate limit|429/.test(msg)) {
    return 'transient';
  }
  return 'unknown';
}
