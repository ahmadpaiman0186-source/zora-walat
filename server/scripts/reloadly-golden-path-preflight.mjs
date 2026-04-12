/**
 * Bounded checks before executing docs/runbooks/RELOADLY_SANDBOX_GOLDEN_PATH.md.
 * Does not call Reloadly HTTP APIs — static + operator map shape only.
 *
 * Usage: npm run reloadly:golden-path-preflight
 */
import '../bootstrap.js';

import { env } from '../src/config/env.js';

const GOLDEN_OPERATOR_KEY = 'roshan';
const GOLDEN_PRODUCT_ID = 'roshan_air_25m';

function fail(msg) {
  console.error(`[reloadly:golden-path-preflight] BLOCKED: ${msg}`);
  process.exit(1);
}

const sandbox =
  String(process.env.RELOADLY_SANDBOX ?? '').trim().toLowerCase() === 'true';
const airtimeReloadly =
  String(process.env.AIRTIME_PROVIDER ?? '')
    .trim()
    .toLowerCase() === 'reloadly';

if (!sandbox) {
  fail('RELOADLY_SANDBOX must be exactly "true" for the golden-path drill.');
}

if (!airtimeReloadly) {
  fail(
    'AIRTIME_PROVIDER=reloadly required for airtime golden path (see runbook if using web-top-up only).',
  );
}

if (!String(process.env.RELOADLY_CLIENT_ID ?? '').trim()) {
  fail('RELOADLY_CLIENT_ID missing.');
}
if (!String(process.env.RELOADLY_CLIENT_SECRET ?? '').trim()) {
  fail('RELOADLY_CLIENT_SECRET missing.');
}

const map = env.reloadlyOperatorMap ?? {};
const opId = map[GOLDEN_OPERATOR_KEY];
if (!opId || !String(opId).trim()) {
  fail(
    `reloadlyOperatorMap missing numeric id for operatorKey "${GOLDEN_OPERATOR_KEY}" (merge defaults + RELOADLY_OPERATOR_MAP_JSON).`,
  );
}

console.log('=== Reloadly golden-path preflight (static) ===\n');
console.log(`Sandbox: ok (RELOADLY_SANDBOX=true)`);
console.log(`AIRTIME_PROVIDER: reloadly`);
console.log(`Golden SKU: ${GOLDEN_PRODUCT_ID}`);
console.log(
  `Operator map: ${GOLDEN_OPERATOR_KEY} -> ${String(opId).trim().slice(0, 6)}… (truncated)`,
);
console.log(`DATABASE_URL set: ${String(process.env.DATABASE_URL ?? '').trim() ? 'yes' : 'no'}`);
console.log(
  `STRIPE_SECRET_KEY set: ${String(process.env.STRIPE_SECRET_KEY ?? '').trim() ? 'yes' : 'no'}`,
);
console.log(
  `STRIPE_WEBHOOK_SECRET set: ${String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim() ? 'yes' : 'no'}`,
);
console.log('\nNext (operator, manual):');
console.log('  1. npm run reloadly:sandbox-readiness');
console.log('  2. Follow docs/runbooks/RELOADLY_SANDBOX_GOLDEN_PATH.md');
console.log('  3. Archive orderId + logs + GET /api/transactions/:id JSON\n');
process.exit(0);
