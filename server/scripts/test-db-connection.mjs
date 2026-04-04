/**
 * Quick DB reachability check (no P1001 = success).
 * Usage: node scripts/test-db-connection.mjs
 */
import '../bootstrap.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
try {
  await prisma.$connect();
  const rows = await prisma.$queryRaw`SELECT 1 AS ok`;
  console.log('connection: ok', rows);
} catch (e) {
  console.error('connection: failed', e.code ?? e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
