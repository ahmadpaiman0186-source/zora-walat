/**
 * Create integration test database if missing (local dev only).
 * Uses docker-compose default credentials on 127.0.0.1:5432 — does not print secrets.
 */
import { PrismaClient } from '@prisma/client';

const adminUrl =
  'postgresql://postgres:postgres@127.0.0.1:5432/zora_walat?schema=public';
const testDbName = 'zora_walat_test';

const prisma = new PrismaClient({ datasources: { db: { url: adminUrl } } });
try {
  await prisma.$executeRawUnsafe(`CREATE DATABASE ${testDbName}`);
  console.log('integration_test_database_created');
} catch (e) {
  const m = String(e?.message ?? e);
  if (m.includes('already exists')) {
    console.log('integration_test_database_exists');
  } else {
    console.error('integration_test_database_create_failed', m.slice(0, 200));
    process.exit(1);
  }
} finally {
  await prisma.$disconnect();
}
