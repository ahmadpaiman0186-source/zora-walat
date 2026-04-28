/**
 * Reads server/.env STRIPE_SECRET_KEY and root .env.local NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
 * Prints whether the standard-mode account prefix matches (no full secrets).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
function readKey(file, prefix) {
  const t = fs.readFileSync(file, 'utf8');
  const line = t.split(/\r?\n/).find((l) => l.startsWith(prefix));
  if (!line) return null;
  return line.slice(prefix.length).trim().replace(/^["']|["']$/g, '');
}
const sk = readKey(path.join(root, 'server', '.env'), 'STRIPE_SECRET_KEY=');
const pk = readKey(path.join(root, '.env.local'), 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=');
if (!sk || !pk) {
  console.log(JSON.stringify({ ok: false, reason: 'missing_key' }));
  process.exit(2);
}
const skRest = sk.replace(/^sk_(test|live)_/, '');
const pkRest = pk.replace(/^pk_(test|live)_/, '');
/** Stripe standard keys: shared 24-char-ish account id at start of payload. */
const skHead = skRest.slice(0, 24);
const pkHead = pkRest.slice(0, 24);
console.log(
  JSON.stringify({
    ok: true,
    skMode: sk.startsWith('sk_test') ? 'test' : sk.startsWith('sk_live') ? 'live' : 'other',
    pkMode: pk.startsWith('pk_test') ? 'test' : pk.startsWith('pk_live') ? 'live' : 'other',
    accountPrefixMatch: skHead === pkHead,
    skHead24: skHead,
    pkHead24: pkHead,
    skLen: sk.length,
    pkLen: pk.length,
  }),
);
