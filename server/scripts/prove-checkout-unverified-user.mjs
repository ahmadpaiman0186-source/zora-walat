/**
 * Proves POST /create-checkout-session for an authenticated but email-unverified user
 * matches `env.allowUnverifiedCheckoutInDev` (no Stripe Dashboard needed).
 *
 * Run from server/: node scripts/prove-checkout-unverified-user.mjs
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import '../bootstrap.js';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db.js';
import { signAccessToken } from '../src/services/authTokenService.js';
import bcrypt from 'bcrypt';

const app = createApp();
const server = await new Promise((resolve) => {
  const s = app.listen(0, '127.0.0.1', () => resolve(s));
});
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

let exitCode = 1;
try {
  console.log(
    JSON.stringify({
      probe: 'checkout_unverified_user',
      nodeEnv: env.nodeEnv,
      allowUnverifiedCheckoutInDev: env.allowUnverifiedCheckoutInDev,
      allowUnverifiedRaw: process.env.ALLOW_UNVERIFIED_CHECKOUT ?? null,
    }),
  );

  const email = `unver_${randomUUID()}@test.local`;
  const passwordHash = await bcrypt.hash('x', 4);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'user',
      isActive: true,
      emailVerifiedAt: null,
    },
  });
  const token = signAccessToken(user);

  const idem = randomUUID();
  const res = await fetch(`${base}/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': idem,
      Origin: 'http://localhost:3000',
    },
    body: JSON.stringify({
      currency: 'usd',
      senderCountry: 'US',
      packageId: 'mock_airtime_10',
    }),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  if (env.allowUnverifiedCheckoutInDev) {
    assert.notEqual(
      res.status,
      403,
      `expected not 403 when bypass is on; got ${res.status} ${text}`,
    );
    assert.notEqual(
      body?.code,
      'auth_verification_required',
      `unexpected verification gate: ${text}`,
    );
    console.log(
      '[prove-checkout-unverified-user] PASS — bypass active; HTTP',
      res.status,
      String(text).slice(0, 200),
    );
  } else {
    assert.equal(res.status, 403);
    assert.equal(body?.code, 'auth_verification_required');
    console.log(
      '[prove-checkout-unverified-user] PASS — gate enforced (no bypass); HTTP 403 auth_verification_required',
    );
  }
  exitCode = 0;

  await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
} catch (e) {
  console.error('[prove-checkout-unverified-user] FAIL', e);
  exitCode = 1;
} finally {
  await new Promise((resolve) => {
    if (server.listening) server.close(() => resolve(undefined));
    else resolve(undefined);
  });
  await prisma.$disconnect().catch(() => {});
}
process.exit(exitCode);
