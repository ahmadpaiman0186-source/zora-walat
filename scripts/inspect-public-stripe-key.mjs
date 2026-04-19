/**
 * Local diagnostic: reads root `.env.local` only, prints prefix/length (no full key).
 * Usage: node scripts/inspect-public-stripe-key.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env.local');
if (!fs.existsSync(envPath)) {
  console.log(JSON.stringify({ ok: false, reason: 'missing_env_local' }));
  process.exit(2);
}
const text = fs.readFileSync(envPath, 'utf8');
const line = text.split(/\r?\n/).find((l) => l.startsWith('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY='));
if (!line) {
  console.log(JSON.stringify({ ok: false, reason: 'missing_stripe_publishable_line' }));
  process.exit(2);
}
let v = line.slice('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY='.length).trim();
if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
  v = v.slice(1, -1);
}
const allowed = /^pk_(test|live)_[A-Za-z0-9_]+$/;
const out = {
  ok: true,
  length: v.length,
  prefix12: v.slice(0, 12),
  suffix4: v.slice(-4),
  hasInnerSpace: /\s/.test(v),
  matchesStripePublishablePattern: allowed.test(v),
};
console.log(JSON.stringify(out));
