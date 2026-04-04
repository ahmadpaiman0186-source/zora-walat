/**
 * One-shot: boot app on ephemeral port, register, create checkout session.
 * Run: node scripts/stripe-prep-smoke.mjs
 */
import '../bootstrap.js';
import { createApp } from '../src/app.js';
import { randomUUID } from 'node:crypto';

const app = createApp();
const server = await new Promise((resolve) => {
  const s = app.listen(0, '127.0.0.1', () => resolve(s));
});
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

try {
  const email = `prep_${Date.now()}@test.local`;
  const reg = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'TestPass1234!' }),
  });
  const regText = await reg.text();
  console.log('[register]', reg.status, regText.slice(0, 200));
  if (!reg.ok) process.exit(1);
  const { accessToken } = JSON.parse(regText);
  if (!accessToken || typeof accessToken !== 'string') {
    console.error('[register] missing accessToken');
    process.exit(1);
  }

  const idem = randomUUID();
  const checkoutBody = {
    currency: 'usd',
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
  console.log('[checkout]', co.status, coText.slice(0, 300));
  process.exit(co.ok ? 0 : 1);
} finally {
  server.close();
}
