/**
 * Safe sandbox validation report for Reloadly top-up (no secrets printed, no API calls).
 * Usage: npm run reloadly:sandbox-readiness
 */
import '../bootstrap.js';

function present(name) {
  const v = process.env[name];
  if (v == null || String(v).trim() === '') {
    return { name, status: 'missing' };
  }
  return { name, status: 'present' };
}

function isNonEmpty(name) {
  const v = process.env[name];
  return v != null && String(v).trim().length > 0;
}

const rows = [
  present('RELOADLY_CLIENT_ID'),
  present('RELOADLY_CLIENT_SECRET'),
  present('RELOADLY_SANDBOX'),
  present('AIRTIME_PROVIDER'),
  present('RELOADLY_OPERATOR_MAP_JSON'),
];

const timeoutOptional = present('AIRTIME_PROVIDER_TIMEOUT_MS');

const sandboxFlag = process.env.RELOADLY_SANDBOX === 'true';
const sandboxSafe = sandboxFlag;

const reloadlyCredsOk =
  isNonEmpty('RELOADLY_CLIENT_ID') &&
  isNonEmpty('RELOADLY_CLIENT_SECRET') &&
  isNonEmpty('RELOADLY_OPERATOR_MAP_JSON');

const providerReloadly =
  String(process.env.AIRTIME_PROVIDER ?? '')
    .trim()
    .toLowerCase() === 'reloadly';

/** Pipeline: Stripe → webhook → fulfillment (no bypass). */
const pipelineRows = [
  present('DATABASE_URL'),
  present('STRIPE_SECRET_KEY'),
  present('STRIPE_WEBHOOK_SECRET'),
  present('JWT_ACCESS_SECRET'),
  present('JWT_REFRESH_SECRET'),
];

console.log('=== Reloadly sandbox — env presence (values not shown) ===\n');
for (const r of rows) {
  console.log(`${r.name}: ${r.status}`);
}
console.log(
  `${timeoutOptional.name}: ${timeoutOptional.status} (optional; server default applies if missing)`,
);

console.log('\n=== End-to-end checkout → webhook → fulfillment (env presence) ===\n');
for (const r of pipelineRows) {
  console.log(`${r.name}: ${r.status}`);
}

console.log('\n=== Sandbox safety ===');
console.log(
  `RELOADLY_SANDBOX=true: ${sandboxFlag ? 'yes (Reloadly sandbox hosts only)' : 'NO — set RELOADLY_SANDBOX=true before any sandbox test'}`,
);
if (!sandboxFlag && process.env.RELOADLY_SANDBOX) {
  console.log(
    '  Note: RELOADLY_SANDBOX is set but not exactly "true" — production audience may be used.',
  );
}

console.log('\n=== Request-building / integration blockers (static) ===');
console.log(
  '- operatorId: Use RELOADLY_OPERATOR_MAP_JSON to map catalog operatorKey → numeric Reloadly id; unmapped keys fail before HTTP.',
);
console.log(
  '- recipientPhone: Built as countryCode "AF" + number "93" + recipientNational. Matches current Afghan-only normalization; other countries need different logic.',
);
console.log(
  '- senderPhone / recipientEmail: Not sent; required only for some operators (e.g. Nauta).',
);
console.log(
  '- useLocalAmount: false with USD amount from amountUsdCents — verify against operator currency rules in sandbox.',
);

const reloadlyReady = reloadlyCredsOk && sandboxSafe && providerReloadly;
const pipelineReady = pipelineRows.every((r) => r.status === 'present');

console.log('\n=== Readiness summary ===');
console.log(`Reloadly credentials + sandbox + AIRTIME_PROVIDER=reloadly: ${reloadlyReady ? 'READY' : 'NOT READY'}`);
console.log(`Pipeline env (DB + Stripe + JWT) for one real webhook-driven attempt: ${pipelineReady ? 'READY' : 'NOT READY'}`);

const oneAttemptReady = reloadlyReady && pipelineReady;

console.log('\n=== One controlled sandbox top-up (manual, single attempt) ===');
console.log(
  '1. Set RELOADLY_SANDBOX=true and TEST Reloadly credentials from the Reloadly dashboard (TEST mode).',
);
console.log(
  '2. Set AIRTIME_PROVIDER=reloadly. Use Stripe test keys (sk_test_…) only — no live charges.',
);
console.log(
  '3. Ensure operatorKey on the order resolves to a valid Reloadly sandbox operator id (see blockers above).',
);
console.log(
  '4. Complete one checkout with a sandbox-eligible Afghan test MSISDN per Reloadly docs; trigger webhook once (stripe listen or deployed endpoint).',
);
console.log('5. Do not retry duplicate orders; observe FulfillmentAttempt + order status in DB.');
console.log(
  `\nProject ready for one sandbox top-up attempt (config + pipeline): ${oneAttemptReady ? 'YES' : 'NO'}`,
);

if (!oneAttemptReady) {
  process.exitCode = 1;
}
