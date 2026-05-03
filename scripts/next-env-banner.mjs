#!/usr/bin/env node
/**
 * Startup banner for Next.js — reads root .env.local only (no secrets).
 */
import {
  AES_REPO_ROOT,
  NEXT_PUBLIC_API_URL_KEY,
  STRIPE_PK_KEY,
  isStructurallyValidPublishableKey,
  maskPublishableKey,
  readEnvFile,
} from './aes-internal.mjs';

const root = readEnvFile('.env.local');
const pk = root.parsed[STRIPE_PK_KEY] ?? '';
const api = String(root.parsed[NEXT_PUBLIC_API_URL_KEY] ?? '').trim();

console.log('');
console.log('[next-env] ───────────────────────────────────────────────────');
console.log(
  '[next-env] Stripe publishable key:',
  isStructurallyValidPublishableKey(pk) ? 'yes' : 'no',
  '(' + maskPublishableKey(pk) + ')',
);
console.log(
  '[next-env] NEXT_PUBLIC_API_URL:',
  api ? 'yes' : 'no',
  api ? '(' + api + ')' : '(unset — checkout blocked until set)',
);
console.log('[next-env] Repository:', AES_REPO_ROOT);
console.log('[next-env] ───────────────────────────────────────────────────');
console.log('');
