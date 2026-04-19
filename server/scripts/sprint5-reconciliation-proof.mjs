#!/usr/bin/env node
/**
 * Sprint 5 — live-safe Stripe reconciliation proof (env checklist + optional real proof runners).
 *
 * Default: validates `.env` prefixes and prints automated + manual operator steps (no network).
 *
 * Flags:
 *   --stripe-api     Real read-only Stripe API (`balance.retrieve`); proves Dashboard `sk_test_` works.
 *                      Rejects sprint4 CI placeholder keys.
 *   --checkout ID    PostgreSQL-only linkage JSON for a `PaymentCheckout.id` (after webhook / test).
 *
 * Run:
 *   node scripts/sprint5-reconciliation-proof.mjs
 *   npm run proof:sprint5
 *   npm run proof:sprint5 -- --stripe-api
 *   npm run proof:sprint5 -- --checkout <paymentCheckoutId>
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const serverRoot = resolve(__dirname, '..');
dotenv.config({ path: resolve(serverRoot, '.env') });
const local = resolve(serverRoot, '.env.local');
if (existsSync(local)) dotenv.config({ path: local, override: true });

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`sprint5-reconciliation-proof.mjs
  (no args)      Stripe env prefix checklist + operator steps (no I/O to Stripe)
  --stripe-api   Real Stripe test-mode API: balance.retrieve (read-only)
  --checkout ID  DB-only reconciliation JSON for PaymentCheckout id`);
  process.exit(0);
}

if (args.includes('--stripe-api')) {
  const { runStripeTestModeApiProof } = await import('./stripe-test-mode-api-proof.mjs');
  const { exitCode } = await runStripeTestModeApiProof();
  process.exit(exitCode);
}

const coIdx = args.indexOf('--checkout');
if (coIdx >= 0 && args[coIdx + 1]) {
  const { runPhase1ReconciliationDbProof } = await import(
    './stripe-phase1-reconciliation-db-proof.mjs'
  );
  const { exitCode } = await runPhase1ReconciliationDbProof(args[coIdx + 1].trim());
  process.exit(exitCode);
}

const sk = String(process.env.STRIPE_SECRET_KEY ?? '').trim();
const wh = String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();
const port = String(process.env.PORT ?? '8787').trim();

function okSk(v) {
  return v.startsWith('sk_test_') || v.startsWith('sk_live_');
}

let exit = 0;
console.log('=== Sprint 5 — live-safe Stripe reconciliation proof (operator checklist) ===\n');

if (!okSk(sk)) {
  console.error(
    '[BLOCKER] STRIPE_SECRET_KEY must be a real Stripe secret key (sk_test_… or sk_live_…).',
  );
  exit = 1;
} else {
  console.log('[ok] STRIPE_SECRET_KEY is set with a valid prefix.');
}

if (!wh.startsWith('whsec_')) {
  console.error(
    '[BLOCKER] STRIPE_WEBHOOK_SECRET must be the signing secret from Stripe CLI `stripe listen` or the Dashboard endpoint (whsec_…).',
  );
  exit = 1;
} else {
  console.log('[ok] STRIPE_WEBHOOK_SECRET is whsec_-prefixed.');
}

console.log('\n--- Automated proof (sandbox-safe, CI) — signature + DB linkage, synthetic evt ids ---');
console.log('  npm test');
console.log('  npm run test:integration:sprint4');
console.log('  npm run test:integration:sprint5');

console.log('\n--- Stronger proof (same repo, optional) ---');
console.log('  Real Stripe API read-only (needs real Dashboard sk_test_, not CI placeholder):');
console.log('    npm run proof:sprint5:stripe-api');
console.log('  After a completed test payment, DB linkage for a checkout id:');
console.log('    npm run proof:sprint5:db -- <paymentCheckoutId>');

console.log('\n--- Manual proof (real Stripe test-mode objects + CLI-forwarded webhooks) ---');
console.log('  1) Start API:  cd server && node start.js');
console.log(`  2) Stripe CLI: stripe listen --forward-to http://127.0.0.1:${port}/webhooks/stripe`);
console.log('  3) Copy the CLI whsec_ into server/.env as STRIPE_WEBHOOK_SECRET; restart the API.');
console.log('  4) Create session: node scripts/stripe-prep-smoke.mjs — open printed checkout URL; pay with 4242…');
console.log('  5) Confirm logs: ✅ WEBHOOK RECEIVED: checkout.session.completed');
console.log('  6) npm run proof:sprint5:db -- <paymentCheckoutId>   # exit 0 = linkage invariant holds');
console.log('\nFull detail: server/docs/STRIPE_LOCAL_WEBHOOK_FLOW.md\n');

process.exit(exit);
