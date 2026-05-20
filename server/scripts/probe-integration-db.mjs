/**
 * Probe local Postgres endpoints for integration tests (no credentials printed).
 * Usage: node scripts/probe-integration-db.mjs
 */
import { PrismaClient } from '@prisma/client';

/** @type {Array<{ label: string, url: string }>} */
const candidates = [
  {
    label: 'docker-compose-default-5432',
    url: 'postgresql://postgres:postgres@127.0.0.1:5432/zora_walat_test?schema=public',
  },
  {
    label: 'docker-compose-default-5432-main-db',
    url: 'postgresql://postgres:postgres@127.0.0.1:5432/zora_walat?schema=public',
  },
  {
    label: 'localhost-5433-postgres',
    url: 'postgresql://postgres:postgres@127.0.0.1:5433/zora_walat_test?schema=public',
  },
];

for (const { label, url } of candidates) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1 AS ok`;
    console.log(`OK ${label}`);
  } catch (e) {
    const msg = String(e?.message ?? e).slice(0, 120).replace(/\s+/g, ' ');
    console.log(`FAIL ${label} ${msg}`);
  } finally {
    await prisma.$disconnect();
  }
}
