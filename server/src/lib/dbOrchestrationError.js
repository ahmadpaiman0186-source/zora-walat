import { Prisma } from '@prisma/client';

/**
 * DB / driver failures where applying a terminal FAIL may be unsafe or misleading.
 * @param {unknown} err
 */
export function isDbOrchestrationFragileError(err) {
  if (!err) return false;
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P2024', 'P1001', 'P1008', 'P1017', 'P2034'].includes(err.code);
  }
  const msg = String(
    err instanceof Error ? err.message : (err?.message ?? err),
  ).toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('connection') ||
    msg.includes('deadlock') ||
    msg.includes('socket')
  );
}
