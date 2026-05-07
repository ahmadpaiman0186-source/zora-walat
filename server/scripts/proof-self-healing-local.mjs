/**
 * L7 self-healing + reliability proof — no live money, no outbound providers.
 * Run: npm --prefix server run proof:self-healing-local
 */
import assert from 'node:assert/strict';

import { ORDER_STATUS } from '../src/constants/orderStatus.js';
import {
  classifyFailure,
  FAILURE_CLASS,
} from '../src/reliability/failureClassifier.js';
import { redactForReliabilityReport } from '../src/reliability/reliabilityHealthRedact.js';
import {
  buildSelfHealingReport,
  evaluateSystemHealth,
  recoverStaleFulfillmentJobs,
} from '../src/reliability/selfHealingOrchestrator.js';

function proofLine(obj) {
  // eslint-disable-next-line no-console -- proof contract
  console.log(JSON.stringify({ proof: 'self_healing_local', ...obj }));
}

function goodPrisma() {
  return {
    $queryRaw: async () => [1],
    fulfillmentAttempt: {
      count: async () => 0,
      findMany: async () => [],
    },
    paymentCheckout: {
      count: async () => 0,
      findUnique: async () => null,
      update: async () => ({}),
    },
  };
}

async function main() {
  const cSig = classifyFailure({
    signal: 'stripe_webhook_signature_invalid',
    source: 'webhook',
  });
  assert.equal(cSig.failureClass, FAILURE_CLASS.STRIPE_WEBHOOK_SIGNATURE_INVALID);
  assert.equal(cSig.retryable, false);
  const classifierWorks = true;

  /** @type {string[]} */
  const scheduled = [];
  const recoveryPaid = await recoverStaleFulfillmentJobs({
    prisma: /** @type {any} */ ({
      fulfillmentAttempt: {
        findMany: async () => [{ id: 'a1', orderId: 'o1' }],
      },
      paymentCheckout: {
        findUnique: async () => ({ orderStatus: ORDER_STATUS.PAID }),
      },
    }),
    staleMs: 1,
    maxOrders: 3,
    traceId: 'proof-l7',
    scheduleFulfillmentProcessingFn: (id) => {
      scheduled.push(String(id));
    },
  });
  const staleFulfillmentRecoveryDetected =
    recoveryPaid.ok === true && recoveryPaid.attempted >= 1 && scheduled.length >= 1;

  const recoveryBlocked = await recoverStaleFulfillmentJobs({
    prisma: /** @type {any} */ ({
      fulfillmentAttempt: {
        findMany: async () => [{ id: 'a2', orderId: 'o2' }],
      },
      paymentCheckout: {
        findUnique: async () => ({ orderStatus: ORDER_STATUS.PENDING }),
      },
    }),
    staleMs: 1,
    maxOrders: 3,
    traceId: 'proof-l7-block',
    scheduleFulfillmentProcessingFn: () => {
      throw new Error('should_not_schedule_unpaid');
    },
  });
  const unsafePaymentRecoveryBlocked = recoveryBlocked.attempted === 0;

  const badDb = await buildSelfHealingReport({
    prisma: /** @type {any} */ ({
      $queryRaw: async () => {
        throw new Error('db down');
      },
      fulfillmentAttempt: {
        count: async () => 0,
        findMany: async () => [],
      },
      paymentCheckout: {
        count: async () => 0,
        findUnique: async () => null,
        update: async () => ({}),
      },
    }),
    runRecovery: false,
  });
  const criticalFailuresFailClosed =
    badDb.failClosedRecommendation === true && badDb.ok === false;

  const goodReport = await buildSelfHealingReport({
    prisma: /** @type {any} */ (goodPrisma()),
    runRecovery: false,
  });
  const healthReportGenerated =
    typeof goodReport.severity === 'string' &&
    Array.isArray(goodReport.recoveryActions);

  const red = redactForReliabilityReport({
    stripeWebhookSecret: 'whsec_xx',
    email: 'x@y.com',
  });
  const piiRedacted = red.stripeWebhookSecret === '[redacted]' && red.email === '[redacted]';

  const redisTolerant = await evaluateSystemHealth({
    prisma: /** @type {any} */ (goodPrisma()),
    traceId: 'proof-l7-sys',
  });
  assert.equal(redisTolerant.dbReady, true);

  proofLine({
    ok: true,
    classifierWorks,
    staleFulfillmentRecoveryDetected,
    unsafePaymentRecoveryBlocked,
    healthReportGenerated,
    piiRedacted,
    criticalFailuresFailClosed,
  });
}

main().catch((e) => {
  proofLine({
    ok: false,
    error: typeof e?.message === 'string' ? e.message.slice(0, 200) : String(e),
  });
  process.exitCode = 1;
});
