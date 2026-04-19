/**
 * One-shot: boot app on ephemeral port, register, create Stripe Checkout session (test keys).
 * Body matches checkoutSessionBodySchema (Phase 1): senderCountry + packageId | amount.
 * Run: node scripts/stripe-prep-smoke.mjs
 *
 * Browser checkout uses Origin http://localhost:3000 → success_url is /success on the Next app (port 3000).
 * API-only local flow: set CLIENT_URL=http://127.0.0.1:8787 (no Origin) so redirects hit GET /success on this API (non-production).
 *
 * Requires: STRIPE_SECRET_KEY (sk_test_*), DATABASE_URL with enabled SenderCountry row for chosen code.
 */
import '../bootstrap.js';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { randomUUID } from 'node:crypto';

const app = createApp();
const server = await new Promise((resolve) => {
  const s = app.listen(0, '127.0.0.1', () => resolve(s));
});
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

let exitCode = 1;

try {
  const email = `prep_${Date.now()}@test.local`;
  const reg = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'TestPass1234!' }),
  });
  const regText = await reg.text();
  console.log('[register]', reg.status, regText.slice(0, 200));
  if (!reg.ok) throw new Error(`register failed: ${reg.status}`);
  const regJson = JSON.parse(regText);
  const { accessToken, user } = regJson;
  if (!accessToken || typeof accessToken !== 'string') {
    throw new Error('[register] missing accessToken');
  }
  /** `requireEmailVerified` on checkout — mark smoke user verified in DB (auth loads user from DB). */
  const uid = user && typeof user.id === 'string' ? user.id : null;
  if (!uid) throw new Error('[register] missing user.id');
  await prisma.user.update({
    where: { id: uid },
    data: { emailVerifiedAt: new Date() },
  });

  const idem = randomUUID();
  const checkoutBody = {
    currency: 'usd',
    senderCountry: 'US',
    packageId: 'mock_airtime_10',
  };
  const co = await fetch(`${base}/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Idempotency-Key': idem,
      Origin: 'http://localhost:3000',
    },
    body: JSON.stringify(checkoutBody),
  });
  const coText = await co.text();
  console.log('[checkout]', co.status, coText.slice(0, 500));
  exitCode = co.ok ? 0 : 1;
} catch (e) {
  console.error('[stripe-prep-smoke]', e);
  exitCode = 1;
} finally {
  await new Promise((resolve) => {
    if (server.listening) server.close(() => resolve(undefined));
    else resolve(undefined);
  });
  await prisma.$disconnect().catch(() => {});
}

process.exit(exitCode);
