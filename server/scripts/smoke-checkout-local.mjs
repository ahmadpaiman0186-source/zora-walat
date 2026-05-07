#!/usr/bin/env node
/**
 * POST /create-checkout-session against a running local API (default http://127.0.0.1:8787).
 *
 * Auth (in order):
 * 1. If `isDevCheckoutAuthBypassRuntimeConfigured()` after bootstrap — sends `X-ZW-Dev-Checkout`
 *    with secret from env (secret is never printed).
 * 2. Else if `SMOKE_CHECKOUT_BEARER_TOKEN` — `Authorization: Bearer …`
 *
 * Env: CHECKOUT_SMOKE_BASE_URL (default http://127.0.0.1:8787)
 */
import crypto from 'node:crypto';

import '../bootstrap.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db.js';
import {
  devCheckoutBypassExpectedUserId,
  devCheckoutBypassSecretForCompare,
  isDevCheckoutAuthBypassRuntimeConfigured,
} from '../src/lib/devCheckoutAuthBypassRuntime.js';
import { isOwnerOnlyEnforced } from '../src/middleware/ownerOnlyAccessGuard.js';

const base =
  String(process.env.CHECKOUT_SMOKE_BASE_URL ?? '').trim() ||
  'http://127.0.0.1:8787';
const url = `${base.replace(/\/+$/, '')}/create-checkout-session`;

const body = {
  currency: 'usd',
  senderCountry: 'US',
  operatorKey: 'afghanWireless',
  recipientPhone: '701234567',
  packageId: 'afghanWireless_usd_200',
};

const bearer = String(process.env.SMOKE_CHECKOUT_BEARER_TOKEN ?? '').trim();

const canDevBypassHeader =
  isDevCheckoutAuthBypassRuntimeConfigured() &&
  !env.prelaunchLockdown &&
  !isOwnerOnlyEnforced();

/** @type {Record<string, string>} */
const headers = {
  'Content-Type': 'application/json',
  'Idempotency-Key': crypto.randomUUID(),
};

if (canDevBypassHeader) {
  const uid = devCheckoutBypassExpectedUserId();
  const row = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true },
  });
  if (!row) {
    console.error(
      '[smoke:checkout-local] DEV_CHECKOUT_BYPASS_USER_ID does not match any User.id in the database (dev bypass would fall through to 401).',
    );
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
  headers['X-ZW-Dev-Checkout'] = devCheckoutBypassSecretForCompare();
  await prisma.$disconnect().catch(() => {});
} else if (bearer) {
  headers.Authorization = `Bearer ${bearer}`;
} else {
  console.error(
    '[smoke:checkout-local] Missing auth: configure DEV_CHECKOUT_AUTH_BYPASS=true (strict), DEV_CHECKOUT_BYPASS_SECRET (>=16 chars), DEV_CHECKOUT_BYPASS_USER_ID (existing User.id), PRELAUNCH_LOCKDOWN=false, unset OWNER_ALLOWED_EMAIL for dev bypass — or set SMOKE_CHECKOUT_BEARER_TOKEN.',
  );
  console.error(
    `[smoke:checkout-local] dev_bypass_env_ok=${isDevCheckoutAuthBypassRuntimeConfigured()} prelaunch=${env.prelaunchLockdown} owner_only=${isOwnerOnlyEnforced()} bearer_set=${Boolean(bearer)}`,
  );
  process.exit(1);
}

console.log(`[smoke:checkout-local] POST ${url}`);

let res;
try {
  res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
} catch (e) {
  console.error('[smoke:checkout-local] fetch failed:', e?.message ?? e);
  process.exit(1);
}

const text = await res.text();
console.log(`[smoke:checkout-local] HTTP ${res.status}`);

let json;
try {
  json = JSON.parse(text);
} catch {
  console.error('[smoke:checkout-local] response is not JSON (first 400 chars):');
  console.error(text.slice(0, 400));
  process.exit(1);
}

const checkoutUrl =
  typeof json?.url === 'string'
    ? json.url
    : typeof json?.data?.url === 'string'
      ? json.data.url
      : null;

const looksStripe =
  typeof checkoutUrl === 'string' &&
  (checkoutUrl.includes('checkout.stripe.com') ||
    checkoutUrl.includes('stripe.com/c'));

console.log(
  `[smoke:checkout-local] stripe_checkout_url_present=${Boolean(looksStripe)}`,
);

if (res.status !== 200 || !looksStripe) {
  const code = json?.code ?? json?.error ?? '';
  const msg = json?.message ?? json?.error ?? '';
  console.error(
    `[smoke:checkout-local] FAIL status=${res.status} code=${code} message=${String(msg).slice(0, 200)}`,
  );
  if (canDevBypassHeader && res.status === 401 && code === 'auth_required') {
    console.error(
      '[smoke:checkout-local] hint: restart the API (`npm start` in server/) after changing DEV_CHECKOUT_* or OWNER_ALLOWED_EMAIL — Node only reads dotenv at process start.',
    );
  }
  process.exit(1);
}

console.log('[smoke:checkout-local] PASS');
process.exit(0);
