/**
 * Child entry: production-like NODE_ENV + test Stripe only. Invoked only via
 * `proof-live-simulation-local.mjs` with ZW_LIVE_SIMULATION_PROOF=true (bootstrap pins flags after dotenv).
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import bcrypt from 'bcrypt';
import Stripe from 'stripe';
import request from 'supertest';

import '../bootstrap.js';
import { prisma } from '../src/db.js';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { RISK_REASON_CODE } from '../src/constants/riskErrors.js';
import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../src/constants/paymentCheckoutStatus.js';
import { FINANCIAL_ANOMALY } from '../src/constants/financialAnomaly.js';
import { evaluateProductionDeploymentPreflight } from '../src/config/productionDeploymentPreflight.js';
import { evaluateProductionMoneyPathSafety } from '../src/config/productionSafetyGates.js';
import { getValidatedStripeSecretKey } from '../src/config/stripeEnv.js';
import {
  resolveTrustedAmountUsdCents,
  validatePackageOperatorPair,
} from '../src/lib/allowedCheckout.js';
import { checkoutAbuseBlockHighSeverityImmediately } from '../src/lib/fraudControlsPolicy.js';
import { isDevCheckoutAuthBypassRuntimeConfigured } from '../src/lib/devCheckoutAuthBypassRuntime.js';
import { classifyCheckoutAbuse } from '../src/services/checkoutAbuseDetector.js';
import { evaluateRisk } from '../src/services/risk/riskEngine.js';
import { writeOrderAudit } from '../src/services/orderAuditService.js';
import { getPhase1MissionMetricsSnapshot } from '../src/infrastructure/observability/phase1MissionObservability.js';
import { runPhase1MoneyFulfillmentReconciliationScan } from '../src/services/phase1MoneyFulfillmentReconciliationEngine.js';
import { executePhase1RecoveryScanOnce } from '../src/services/recoveryPhase1SafeQueueRetryService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDir = join(__dirname, '..');
const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';

function proofLine(obj) {
  // eslint-disable-next-line no-console -- proof contract
  console.log(JSON.stringify({ proof: 'live_simulation_local', ...obj }));
}

const OWNER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Merged env for `evaluateProductionDeploymentPreflight` only.
 * Fills owner/CORS/CLIENT **when unset** so the proof runs on typical dev machines; real deploys
 * must set these explicitly (see proof output `preflightSyntheticFields`).
 */
function buildPreflightMergeEnv() {
  const o = {
    ...process.env,
    NODE_ENV: 'production',
    ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION: 'true',
    PRELAUNCH_LOCKDOWN: 'false',
    PAYMENTS_LOCKDOWN_MODE: 'false',
    DEV_CHECKOUT_AUTH_BYPASS: 'false',
    ZW_ALLOW_LOCAL_FLUTTER_WEB_CORS: 'false',
  };
  /** @type {string[]} */
  const synthetic = [];
  if (String(o.ZW_REQUIRE_OWNER_ALLOWED_EMAIL ?? '').trim().toLowerCase() !== 'true') {
    o.ZW_REQUIRE_OWNER_ALLOWED_EMAIL = 'true';
    synthetic.push('ZW_REQUIRE_OWNER_ALLOWED_EMAIL');
  }
  if (!OWNER_EMAIL_RE.test(String(o.OWNER_ALLOWED_EMAIL ?? '').trim())) {
    o.OWNER_ALLOWED_EMAIL = 'live-sim-proof@zora-walat.invalid';
    synthetic.push('OWNER_ALLOWED_EMAIL');
  }
  if (!String(o.CORS_ORIGINS ?? '').trim()) {
    o.CORS_ORIGINS = 'http://127.0.0.1:8787';
    synthetic.push('CORS_ORIGINS');
  }
  if (!String(o.CLIENT_URL ?? '').trim()) {
    o.CLIENT_URL = 'http://127.0.0.1:8787';
    synthetic.push('CLIENT_URL');
  }
  o._liveSimPreflightSyntheticFields = synthetic.join(',');
  return o;
}

async function settle(ms = 2200) {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Same checks as `proof:fraud-controls-local`, inlined so they run in this process after
 * `bootstrap` pins production-like env (avoids `npm run` subprocess env drift on Windows).
 */
async function assertFraudControlsInProcess() {
  const once = classifyCheckoutAbuse({
    userId: `proof_u_${randomUUID()}`,
    ip: '127.0.0.1',
    fingerprint: 'proof_fp',
    idempotencyKey: randomUUID(),
    recipientNational: null,
    now: new Date(),
  });
  assert.equal(once.severity, 'low');

  const uid = `proof_hf_${randomUUID()}`;
  const ip = '127.0.0.2';
  const t0 = Date.now();
  let hf;
  for (let i = 0; i < 8; i++) {
    hf = classifyCheckoutAbuse({
      userId: uid,
      ip,
      fingerprint: `hf_fp_${i}`,
      idempotencyKey: randomUUID(),
      recipientNational: null,
      now: new Date(t0 + i * 100),
    });
  }
  assert.equal(hf.severity, 'high');

  const badPkg = validatePackageOperatorPair('mtn_x', 'roshan');
  assert.equal(badPkg.ok, false);

  const badAmt = resolveTrustedAmountUsdCents({
    packageId: null,
    amountUsdCents: 777777,
  });
  assert.equal(badAmt.ok, false);

  const otpDeny = evaluateRisk({
    kind: 'otp_request',
    flags: { otpIpVelocityExceeded: true },
  });
  assert.equal(otpDeny.decision, 'deny');
  assert.equal(otpDeny.reasonCode, RISK_REASON_CODE.OTP_ABUSE);

  const rows = [];
  await writeOrderAudit(
    {
      auditLog: {
        create: async ({ data }) => {
          rows.push(data);
          return data;
        },
      },
    },
    {
      event: 'proof_fraud_redaction',
      payload: { stripeWebhookSecret: 'whsec_proof_dummy', x: 1 },
      ip: null,
    },
  );
  assert.equal(rows[0].payload.includes('whsec_'), false);

  assert.equal(
    checkoutAbuseBlockHighSeverityImmediately(),
    true,
    'production live sim must keep strict high-severity checkout block (no CHECKOUT_ABUSE_RELAX_DEV)',
  );

  return {
    normalCheckoutSeverity: once.severity,
    highFrequencySeverity: hf.severity,
    strictHighBlock: checkoutAbuseBlockHighSeverityImmediately(),
    invalidPackageRejected: true,
    invalidAmountRejected: true,
    otpVelocityDenied: true,
    auditRedactionOk: true,
  };
}

async function main() {
  const dbUrl = String(process.env.DATABASE_URL ?? '').trim();
  if (!dbUrl) {
    proofLine({ ok: false, reason: 'DATABASE_URL_unset' });
    process.exit(1);
  }
  const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();
  if (!webhookSecret.startsWith('whsec_')) {
    proofLine({ ok: false, reason: 'STRIPE_WEBHOOK_SECRET_invalid_or_missing' });
    process.exit(1);
  }

  const sk = getValidatedStripeSecretKey();
  if (!sk || (!sk.startsWith('sk_test_') && !sk.startsWith('rk_test_'))) {
    proofLine({
      ok: false,
      reason: 'require_stripe_test_secret_only',
      hint: 'Live simulation refuses sk_live_/rk_live_. Use Stripe test keys.',
    });
    process.exit(1);
  }

  const merged = buildPreflightMergeEnv();
  const preflightSyntheticFields = String(
    merged._liveSimPreflightSyntheticFields ?? '',
  ).trim();
  delete merged._liveSimPreflightSyntheticFields;
  const preflight = evaluateProductionDeploymentPreflight(merged);
  if (!preflight.ok) {
    proofLine({
      ok: false,
      phase: 'production_deployment_preflight_merge',
      blockers: preflight.blockers,
    });
    process.exit(1);
  }

  const money = evaluateProductionMoneyPathSafety(process.env);
  assert.equal(
    money.ok,
    true,
    `production money path safety: ${money.code} ${money.message}`,
  );

  assert.equal(env.nodeEnv, 'production');
  assert.equal(env.prelaunchLockdown, false);
  assert.equal(env.paymentsLockdownMode, false);
  assert.equal(env.devCheckoutAuthBypass, false);
  assert.equal(env.phase1FulfillmentOutboundEnabled, false);
  assert.equal(isDevCheckoutAuthBypassRuntimeConfigured(), false);

  const fraudControlsInProcess = await assertFraudControlsInProcess();

  const traceId = `live-sim-${randomUUID()}`;
  const app = createApp();
  const user = await prisma.user.create({
    data: {
      email: `live_sim_${randomUUID()}@test.invalid`,
      passwordHash: await bcrypt.hash('x', 4),
    },
  });
  const order = await prisma.paymentCheckout.create({
    data: {
      idempotencyKey: randomUUID(),
      requestFingerprint: `fp_${randomUUID().slice(0, 12)}`,
      userId: user.id,
      status: PAYMENT_CHECKOUT_STATUS.INITIATED,
      orderStatus: ORDER_STATUS.PENDING,
      amountUsdCents: 1000,
      currency: 'usd',
      senderCountryCode: 'US',
      operatorKey: 'mtn',
      recipientNational: '701234567',
      productType: 'mobile_topup',
      providerCostUsdCents: 800,
      stripeFeeEstimateUsdCents: 59,
      fxBufferUsdCents: 0,
      riskBufferUsdCents: 0,
      projectedNetMarginBp: 400,
      financialAnomalyCodes: [FINANCIAL_ANOMALY.LOW_MARGIN],
    },
  });

  const piId = `pi_live_sim_${randomUUID().slice(0, 8)}`;
  const sessionPayload = {
    id: `cs_live_sim_${randomUUID().slice(0, 8)}`,
    object: 'checkout.session',
    amount_total: 1000,
    currency: 'usd',
    payment_intent: piId,
    customer: 'cus_live_sim_test',
    metadata: { internalCheckoutId: order.id, zwTraceId: traceId },
  };
  const eventId = `evt_live_sim_${randomUUID().slice(0, 8)}`;

  function buildSignedPost() {
    const payload = JSON.stringify({
      id: eventId,
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: sessionPayload },
    });
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });
    return request(app)
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('X-Trace-Id', traceId)
      .set('Stripe-Signature', header)
      .send(payload);
  }

  const r1 = await buildSignedPost();
  assert.equal(r1.status, 200);
  await settle();

  const row = await prisma.paymentCheckout.findUnique({ where: { id: order.id } });
  const nAtt = await prisma.fulfillmentAttempt.count({ where: { orderId: order.id } });
  assert.ok(
    row?.orderStatus === ORDER_STATUS.PAID || row?.orderStatus === ORDER_STATUS.FULFILLED,
    `expected PAID or FULFILLED, got ${row?.orderStatus}`,
  );
  assert.equal(nAtt, 1);

  const audits = await prisma.auditLog.findMany({
    where: { payload: { contains: traceId } },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });
  const traceInAudit = audits.some((a) => {
    try {
      const p = JSON.parse(a.payload);
      return p?.traceId === traceId || String(a.payload).includes(traceId);
    } catch {
      return String(a.payload).includes(traceId);
    }
  });
  assert.ok(traceInAudit, 'traceId should appear in at least one audit payload');

  const metrics = getPhase1MissionMetricsSnapshot();
  assert.ok(
    (metrics.counters?.webhooks_received ?? 0) >= 1,
    'mission metrics should record at least one verified webhook in-process',
  );

  const recon = await runPhase1MoneyFulfillmentReconciliationScan({
    limit: 80,
    traceId,
  });
  const recovery = await executePhase1RecoveryScanOnce({
    limit: 80,
    traceId: `recovery-wrap:${traceId}`,
  });
  const wronglyRequeued = recovery.results?.some((x) => x.checkoutId === order.id) === true;
  assert.equal(
    wronglyRequeued,
    false,
    'fresh live-sim order must not be re-queued as SAFE_RETRY candidate',
  );

  /** @type {{ ran: boolean, exitCode: number | null }} */
  const releaseGate = { ran: false, exitCode: null };
  if (String(process.env.ZW_LIVE_SIM_RUN_RELEASE_GATE ?? '').trim().toLowerCase() === 'true') {
    const rg = spawnSync(npm, ['run', 'release:gate'], {
      cwd: serverDir,
      env: { ...process.env },
      stdio: 'inherit',
    });
    releaseGate.ran = true;
    releaseGate.exitCode = rg.status === null ? 1 : rg.status;
    if (releaseGate.exitCode !== 0) {
      proofLine({
        ok: false,
        phase: 'release_gate',
        exitCode: releaseGate.exitCode,
      });
      process.exit(1);
    }
  }

  proofLine({
    ok: true,
    nodeEnv: env.nodeEnv,
    preflightOk: true,
    preflightSyntheticFields:
      preflightSyntheticFields || '(none — all owner/CORS/CLIENT values came from process.env)',
    productionMoneyPathSafetyOk: money.ok,
    devBypassConfigured: isDevCheckoutAuthBypassRuntimeConfigured(),
    outboundEnabled: env.phase1FulfillmentOutboundEnabled,
    traceId,
    orderIdSuffix: String(order.id).slice(-12),
    paymentOrderStatus: row?.orderStatus ?? null,
    fulfillmentAttemptCount: nAtt,
    auditRowsWithTrace: audits.filter((a) => String(a.payload).includes(traceId)).length,
    metricsCounters: {
      webhooks_received: metrics.counters?.webhooks_received ?? null,
      payments_paid: metrics.counters?.payments_paid ?? null,
    },
    reconciliationFindingCount: recon.summary?.count ?? null,
    recoveryUniqueRequeued: recovery.uniqueRequeued ?? null,
    recoveryIncludedOurOrder: wronglyRequeued,
    releaseGate,
    fraudControlsInProcess,
    differencesVsRealProduction: [
      'Child uses STRIPE_SECRET_KEY sk_test_/rk_test_ with ALLOW_STRIPE_TEST_KEYS_IN_PRODUCTION (no card charges).',
      'PHASE1_FULFILLMENT_OUTBOUND_ENABLED forced false in bootstrap when ZW_LIVE_SIMULATION_PROOF — no real Reloadly POST.',
      'With that pin, deliveryAdapter uses fulfillMockAirtime only when ZW_LIVE_SIMULATION_PROOF (no RELOADLY_ALLOW_UNAVAILABLE_MOCK_FALLBACK in production money-path gate).',
      'server/.env.local still loads for DATABASE_URL and secrets; bootstrap then pins production-like flags over duplicate keys.',
      'Full npm run release:gate only when ZW_LIVE_SIM_RUN_RELEASE_GATE=true (adds Flutter + integration suite).',
    ],
  });

  await prisma.fulfillmentAttempt.deleteMany({ where: { orderId: order.id } });
  await prisma.loyaltyPointsGrant.deleteMany({ where: { paymentCheckoutId: order.id } });
  await prisma.loyaltyLedger.deleteMany({ where: { userId: user.id } });
  await prisma.paymentCheckout.deleteMany({ where: { id: order.id } });
  await prisma.stripeWebhookEvent.deleteMany({ where: { id: eventId } });
  await prisma.user.deleteMany({ where: { id: user.id } });
}

(async () => {
  try {
    await main();
    process.exitCode = 0;
  } catch (err) {
    proofLine({
      ok: false,
      error: typeof err?.message === 'string' ? err.message.slice(0, 300) : String(err),
    });
    process.exitCode = 1;
  } finally {
    try {
      await prisma.$disconnect();
    } catch {
      /* ignore */
    }
    process.exit(process.exitCode ?? 0);
  }
})();
