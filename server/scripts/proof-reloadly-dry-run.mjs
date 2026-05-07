/**
 * Reloadly + Phase 1 fulfillment **dry-run** proof (no real top-up, no Reloadly POST /topups).
 *
 * Uses AIRTIME_PROVIDER=mock via registerChaosWebhookEnv preload — `runDeliveryAdapter` never calls
 * `fulfillReloadlyDelivery` / `sendTopup`.
 *
 * Run: npm --prefix server run proof:reloadly-dry-run
 *
 * Requires: migrated DB (TEST_DATABASE_URL / DATABASE_URL). Optional env:
 *   ZW_PROOF_RELOADLY_REQUIRE_CREDS=1 — exit 1 if Reloadly client id/secret missing.
 *   ZW_PROOF_RELOADLY_STRICT_STAGING=1 — exit 1 when creds exist but sandbox or Afghanistan operator map coverage fails.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';

import { prisma } from '../src/db.js';
import { deleteLedgerJournalForPaymentCheckouts } from '../test/integrations/integrationLedgerTestCleanup.js';
import { env } from '../src/config/env.js';
import { isReloadlyConfigured } from '../src/services/reloadlyClient.js';
import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../src/constants/fulfillmentAttemptStatus.js';
import { FINANCIAL_ANOMALY } from '../src/constants/financialAnomaly.js';
import { buildReloadlyTopupPayload } from '../src/domain/fulfillment/reloadlyTopup.js';
import {
  parseReloadlyOperatorMapJsonStrict,
  validateAfghanistanReloadlyOperatorMapCoverage,
} from '../src/lib/reloadlyOperatorMapValidation.js';
import { resolveAirtimeProviderName } from '../src/domain/fulfillment/executeAirtimeFulfillment.js';
import { FAILURE_CONFIDENCE } from '../src/constants/failureConfidence.js';
import {
  ensureQueuedFulfillmentAttempt,
  scheduleFulfillmentProcessing,
  processFulfillmentForOrder,
} from '../src/services/fulfillmentProcessingService.js';
import { OrderTransitionError } from '../src/domain/orders/orderLifecycle.js';

function proofLine(obj) {
  // eslint-disable-next-line no-console -- proof contract
  console.log(JSON.stringify({ proof: 'reloadly_dry_run', ...obj }));
}

async function settle(ms = 2600) {
  await new Promise((r) => setTimeout(r, ms));
}

function basePaidOrderShape(userId, overrides = {}) {
  return {
    idempotencyKey: randomUUID(),
    requestFingerprint: `fp_${randomUUID().slice(0, 12)}`,
    userId,
    status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
    orderStatus: ORDER_STATUS.PAID,
    amountUsdCents: 1000,
    currency: 'usd',
    senderCountryCode: 'AF',
    operatorKey: 'mtn',
    recipientNational: '701234567',
    productType: 'mobile_topup',
    providerCostUsdCents: 800,
    stripeFeeEstimateUsdCents: 59,
    fxBufferUsdCents: 0,
    riskBufferUsdCents: 0,
    projectedNetMarginBp: 400,
    financialAnomalyCodes: [FINANCIAL_ANOMALY.LOW_MARGIN],
    stripePaymentIntentId: `pi_proof_${randomUUID().slice(0, 8)}`,
    completedByWebhookEventId: `evt_proof_${randomUUID().slice(0, 8)}`,
    pricingSnapshot: { customerProductValueUsdCents: 500 },
    ...overrides,
  };
}

async function main() {
  const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
  if (!dbUrl) {
    proofLine({ ok: false, reason: 'DATABASE_URL_unset' });
    throw new Error('DATABASE_URL_unset');
  }

  const requireCreds =
    String(process.env.ZW_PROOF_RELOADLY_REQUIRE_CREDS ?? '').trim() === '1';
  const credsPresent = isReloadlyConfigured();
  if (requireCreds && !credsPresent) {
    proofLine({ ok: false, reason: 'reloadly_credentials_required_but_missing' });
    throw new Error('reloadly_credentials_required_but_missing');
  }

  const airtimeIsMock = resolveAirtimeProviderName() === 'mock';
  if (!airtimeIsMock) {
    proofLine({ ok: false, reason: 'AIRTIME_PROVIDER_must_be_mock_for_this_proof' });
    throw new Error('AIRTIME_PROVIDER_must_be_mock_for_this_proof');
  }

  const dryRunModeActive = airtimeIsMock === true;
  const reloadlySandboxMode = env.reloadlySandbox === true;

  const jsonGate = parseReloadlyOperatorMapJsonStrict(process.env.RELOADLY_OPERATOR_MAP_JSON);
  if (!jsonGate.ok) {
    proofLine({ ok: false, reason: jsonGate.reason ?? 'RELOADLY_OPERATOR_MAP_JSON_invalid' });
    throw new Error(jsonGate.reason ?? 'RELOADLY_OPERATOR_MAP_JSON_invalid');
  }

  const mergedMap = env.reloadlyOperatorMap ?? {};
  const coverage = validateAfghanistanReloadlyOperatorMapCoverage(mergedMap);
  const operatorMappingValid = coverage.ok === true && jsonGate.ok === true;

  const payloadShape = buildReloadlyTopupPayload(
    {
      id: 'proof_shape_order',
      operatorKey: 'mtn',
      recipientNational: '701234567',
      amountUsdCents: 1000,
      currency: 'usd',
      pricingSnapshot: { customerProductValueUsdCents: 500 },
    },
    mergedMap,
    { customIdentifier: 'zwr_proof_shape', providerRequestKey: 'zwr_proof_shape' },
  );
  assert.equal(payloadShape.ok, true);
  if (!payloadShape.ok) throw new Error('payload_shape');
  const phoneNormalizationValid =
    payloadShape.body.recipientPhone.countryCode === 'AF' &&
    payloadShape.body.recipientPhone.number === '93701234567';
  const amountMappingValid = payloadShape.body.amount === '5.00';

  const envPayload = buildReloadlyTopupPayload(
    {
      id: 'proof_env_order',
      operatorKey: 'mtn',
      recipientNational: '701234567',
      amountUsdCents: 1000,
      currency: 'usd',
      pricingSnapshot: { customerProductValueUsdCents: 500 },
    },
    mergedMap,
    { customIdentifier: 'zwr_proof_env', providerRequestKey: 'zwr_proof_env' },
  );
  assert.equal(envPayload.ok, true);

  const user = await prisma.user.create({
    data: {
      email: `proof_rl_${randomUUID()}@test.invalid`,
      passwordHash: await bcrypt.hash('x', 4),
    },
  });

  const paid = await prisma.paymentCheckout.create({
    data: basePaidOrderShape(user.id),
  });

  await prisma.$transaction(async (tx) => {
    const a1 = await ensureQueuedFulfillmentAttempt(tx, paid.id, null);
    const a2 = await ensureQueuedFulfillmentAttempt(tx, paid.id, null);
    assert.equal(a1.id, a2.id);
  });

  let nAfterDoubleEnsure = await prisma.fulfillmentAttempt.count({
    where: { orderId: paid.id },
  });
  assert.equal(nAfterDoubleEnsure, 1);

  scheduleFulfillmentProcessing(paid.id, 'proof-reloadly-dry-run-1');
  scheduleFulfillmentProcessing(paid.id, 'proof-reloadly-dry-run-2');
  await settle();

  nAfterDoubleEnsure = await prisma.fulfillmentAttempt.count({ where: { orderId: paid.id } });
  assert.equal(nAfterDoubleEnsure, 1);
  const duplicatePrevented = nAfterDoubleEnsure === 1;

  const pending = await prisma.paymentCheckout.create({
    data: {
      ...basePaidOrderShape(user.id),
      idempotencyKey: randomUUID(),
      requestFingerprint: `fp_${randomUUID().slice(0, 12)}`,
      status: PAYMENT_CHECKOUT_STATUS.INITIATED,
      orderStatus: ORDER_STATUS.PENDING,
      stripePaymentIntentId: null,
      completedByWebhookEventId: null,
    },
  });
  let unpaidRejected = false;
  try {
    await prisma.$transaction(async (tx) => {
      await ensureQueuedFulfillmentAttempt(tx, pending.id, null);
    });
  } catch (e) {
    unpaidRejected =
      e instanceof OrderTransitionError && e.code === 'fulfillment_queue_precondition_failed';
  }
  assert.equal(unpaidRejected, true);

  const paidRetry = await prisma.paymentCheckout.create({
    data: basePaidOrderShape(user.id, {
      idempotencyKey: randomUUID(),
      requestFingerprint: `fp_${randomUUID().slice(0, 12)}`,
      stripePaymentIntentId: `pi_proof_r_${randomUUID().slice(0, 8)}`,
      completedByWebhookEventId: `evt_proof_r_${randomUUID().slice(0, 8)}`,
    }),
  });
  await prisma.$transaction(async (tx) => {
    await ensureQueuedFulfillmentAttempt(tx, paidRetry.id, null);
  });

  const prevSim = process.env.MOCK_AIRTIME_SIMULATE;
  process.env.MOCK_AIRTIME_SIMULATE = 'retryable';
  try {
    await processFulfillmentForOrder(paidRetry.id, {
      traceId: 'proof-reloadly-retryable',
      bullmqAttemptsMade: 0,
    });
  } finally {
    if (prevSim != null) process.env.MOCK_AIRTIME_SIMULATE = prevSim;
    else delete process.env.MOCK_AIRTIME_SIMULATE;
  }

  const nRetryOrder = await prisma.fulfillmentAttempt.count({ where: { orderId: paidRetry.id } });
  assert.equal(nRetryOrder, 1);
  const att = await prisma.fulfillmentAttempt.findFirst({
    where: { orderId: paidRetry.id, attemptNumber: 1 },
  });
  let retryStateValid = false;
  if (att?.responseSummary) {
    try {
      const o = JSON.parse(att.responseSummary);
      retryStateValid =
        o.failureConfidence === FAILURE_CONFIDENCE.WEAK_FAILURE &&
        o.normalizedOutcome === 'failure_unconfirmed';
    } catch {
      retryStateValid = false;
    }
  }
  assert.equal(retryStateValid, true);
  assert.equal(att?.status, FULFILLMENT_ATTEMPT_STATUS.PROCESSING);

  const reloadlyStagingReady =
    credsPresent === true &&
    reloadlySandboxMode === true &&
    operatorMappingValid === true;

  const strictStaging =
    String(process.env.ZW_PROOF_RELOADLY_STRICT_STAGING ?? '').trim() === '1';
  if (strictStaging && credsPresent && !reloadlyStagingReady) {
    proofLine({
      ok: false,
      reason: 'ZW_PROOF_RELOADLY_STRICT_STAGING_reloadly_staging_not_ready',
      reloadlyCredentialsPresent: credsPresent,
      reloadlySandboxMode,
      operatorMappingValid,
      afghanistanOperatorsMissing: coverage.ok ? [] : coverage.missing,
      afghanistanOperatorsInvalid: coverage.ok ? [] : coverage.invalid,
    });
    throw new Error('ZW_PROOF_RELOADLY_STRICT_STAGING_reloadly_staging_not_ready');
  }

  proofLine({
    ok: true,
    dryRunModeActive,
    airtimeProvider: resolveAirtimeProviderName(),
    reloadlyCredentialsPresent: credsPresent,
    reloadlySandboxMode,
    reloadlyStagingReady,
    afghanistanOperatorCoverageOk: coverage.ok,
    afghanistanOperatorsMissing: coverage.ok ? [] : coverage.missing,
    afghanistanOperatorsInvalid: coverage.ok ? [] : coverage.invalid,
    operatorMappingValid,
    phoneNormalizationValid,
    amountMappingValid,
    fulfillmentAttemptsCountPaidPath: nAfterDoubleEnsure,
    duplicatePrevented,
    unpaidFulfillmentRejected: unpaidRejected,
    retryStateValid,
    reloadlyTopupInvokedByScript: false,
    orderIdSuffix: String(paid.id).slice(-12),
    reloadlyStagingBlocker:
      credsPresent && !(reloadlySandboxMode && operatorMappingValid)
        ? !reloadlySandboxMode
          ? 'set_RELOADLY_SANDBOX_true_for_sandbox_topups'
          : !coverage.ok
            ? 'fix_afghanistan_operator_map_keys_mtn_roshan_afghanwireless_etisalat_salaam'
            : !jsonGate.ok
              ? String(jsonGate.reason ?? 'RELOADLY_OPERATOR_MAP_JSON')
              : 'reloadly_staging_config'
        : null,
  });

  /**
   * Teardown: same posture as `proof-stripe-webhook-local.mjs` — L4 journal is immutable with FK RESTRICT
   * toward `FulfillmentAttempt` / `PaymentCheckout`. Only delete rows outside that immutable subgraph.
   */
  await deleteLedgerJournalForPaymentCheckouts(prisma, [
    paid.id,
    paidRetry.id,
    pending.id,
  ]);
  await prisma.loyaltyPointsGrant.deleteMany({
    where: { paymentCheckoutId: { in: [paid.id, paidRetry.id, pending.id] } },
  });
  await prisma.loyaltyLedger.deleteMany({ where: { userId: user.id } });
}

(async () => {
  let code = 0;
  try {
    await main();
  } catch (err) {
    code = 1;
    proofLine({
      ok: false,
      error: typeof err?.message === 'string' ? err.message.slice(0, 200) : String(err),
    });
  } finally {
    try {
      await prisma.$disconnect();
    } catch {
      // ignore
    }
    process.exit(code);
  }
})();
