#!/usr/bin/env node
/**
 * Real Stripe **test-mode** API round-trip (read-only: balance). Proves `STRIPE_SECRET_KEY`
 * authenticates to Stripe. Does not create charges or PaymentIntents.
 *
 * Rejects the sprint4 integration placeholder key (`sk_test_` + repeated `b`).
 *
 * Run: node scripts/stripe-test-mode-api-proof.mjs
 *   or: npm run proof:sprint5:stripe-api
 */
import '../bootstrap.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Stripe from 'stripe';

import { getValidatedStripeSecretKey } from '../src/config/stripeEnv.js';

/**
 * @param {string | null | undefined} k
 * @returns {boolean}
 */
export function looksLikeSprint4CiPlaceholderStripeKey(k) {
  const s = String(k ?? '');
  if (!s.startsWith('sk_test_')) return false;
  const rest = s.slice('sk_test_'.length);
  if (rest.length < 50) return false;
  return /^b+$/.test(rest);
}

/**
 * @returns {Promise<{ exitCode: number; evidence: Record<string, unknown> | null }>}
 */
export async function runStripeTestModeApiProof() {
  const key = getValidatedStripeSecretKey();
  if (!key) {
    console.error(
      '[BLOCKER] No valid STRIPE_SECRET_KEY (see server/src/config/stripeEnv.js).',
    );
    return { exitCode: 1, evidence: null };
  }
  if (looksLikeSprint4CiPlaceholderStripeKey(key)) {
    console.error(
      '[BLOCKER] Key matches CI integration placeholder (sk_test_ + repeated b). Use a real Dashboard test secret.',
    );
    return { exitCode: 1, evidence: null };
  }
  if (!key.startsWith('sk_test_') && !key.startsWith('rk_test_')) {
    console.warn(
      '[warn] Key is not sk_test_/rk_test_; this proof targets test-mode — verify you intend non-test keys.',
    );
  }

  const stripe = new Stripe(key);
  try {
    const balance = await stripe.balance.retrieve();
    const evidence = {
      kind: 'stripe_balance_retrieve',
      livemode: balance.livemode,
      object: balance.object,
      available: (balance.available ?? []).map((a) => ({
        currency: a.currency,
        amount: a.amount,
      })),
      pending: (balance.pending ?? []).map((a) => ({
        currency: a.currency,
        amount: a.amount,
      })),
    };
    console.log('[ok] Stripe API accepted the secret key (read-only balance.retrieve).');
    console.log(JSON.stringify(evidence, null, 2));
    if (balance.livemode !== false) {
      console.warn('[warn] balance.livemode is not false — confirm you are not hitting live mode.');
    }
    return { exitCode: 0, evidence };
  } catch (e) {
    const msg = e?.message ?? String(e);
    console.error('[BLOCKER] Stripe API error:', msg.slice(0, 400));
    return { exitCode: 1, evidence: null };
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const { exitCode } = await runStripeTestModeApiProof();
  process.exit(exitCode);
}
