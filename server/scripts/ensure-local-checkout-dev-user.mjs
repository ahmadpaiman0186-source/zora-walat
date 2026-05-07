#!/usr/bin/env node
/**
 * Ensures a dedicated local dev user exists for DEV_CHECKOUT_BYPASS_USER_ID.
 * Prints only the user id (stdout, one line). Run: node scripts/ensure-local-checkout-dev-user.mjs
 */
import bcrypt from 'bcrypt';

import '../bootstrap.js';
import { prisma } from '../src/db.js';

const EMAIL = 'local-checkout-test@zora-walat.local';

const existing = await prisma.user.findUnique({
  where: { email: EMAIL },
  select: { id: true, email: true, createdAt: true },
});
let row = existing;
if (!row) {
  const passwordHash = await bcrypt.hash('local-checkout-dev-only-not-for-prod', 4);
  row = await prisma.user.create({
    data: {
      email: EMAIL,
      passwordHash,
      role: 'user',
      isActive: true,
    },
    select: { id: true, email: true, createdAt: true },
  });
}
console.log(
  JSON.stringify({
    id: row.id,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
    created: !existing,
  }),
);
await prisma.$disconnect();
