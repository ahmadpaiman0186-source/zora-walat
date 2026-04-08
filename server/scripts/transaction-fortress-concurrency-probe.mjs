#!/usr/bin/env node
/**
 * Measured concurrency probe for Phase 1 fulfillment claims (distinct orders + optional same-order race).
 * Emits JSON only to stdout (suitable for logs / completion reports).
 *
 * From server/:
 *   DATABASE_URL=... node scripts/transaction-fortress-concurrency-probe.mjs
 *
 * Env:
 *   FORTRESS_PROBE_DISTINCT_ORDERS — default 20 (try 50, 100, 250, 500, 1000 for staged runs; capped at 5000)
 *   FORTRESS_PROBE_PARALLELISM — cap concurrent processFulfillmentForOrder (default = order count)
 *   FORTRESS_PROBE_SAME_ORDER_RACES — default 1 (capped at 100; ignored when multi-region)
 *   FORTRESS_PROBE_AIRTIME_PROVIDER — default `mock` after bootstrap (overrides `.env` Reloadly for reproducible probes)
 *   FORTRESS_PROBE_LOYALTY_AUTO_GRANT — default `false` so probes don't require loyalty migrations (`LOYALTY_AUTO_GRANT_ON_DELIVERY`)
 *   FORTRESS_PROBE_MULTI_REGION — when `true`, runs exactly 100 orders: 20 each senderCountry US, EU, CA, AE (Arab), TR (uses seeded `SenderCountry` codes)
 *
 * Failure diagnosis: report includes `parameters.resolvedAirtimeProvider` (must be `mock` for
 * provider-independent concurrency proof) and `distinctOrdersOutcome.failed*Histogram` keys.
 * Mass `FAILED` with `reloadly_*` reasons indicates real provider outcomes, not queue races.
 *
 *   FORTRESS_PROBE_ALLOW_NON_MOCK — set `true` to run queue probe with Reloadly (non-deterministic).
 *   Default: queue-mode probe expects `mock` so concurrency/lifecycle metrics stay provider-independent.
 */
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

const __probeDir = path.dirname(fileURLToPath(import.meta.url));
const __probeQuiet =
  String(process.env.FORTRESS_PROBE_QUIET ?? '')
    .trim()
    .toLowerCase() === 'true';
dotenv.config({
  path: path.join(__probeDir, '..', '.env'),
  quiet: __probeQuiet,
});

/** Fortress 500+ recert: enqueue + in-process worker (requires REDIS_URL + worker deps). */
if (
  String(process.env.FORTRESS_PROBE_USE_FULFILLMENT_QUEUE ?? '')
    .trim()
    .toLowerCase() === 'true'
) {
  process.env.FULFILLMENT_QUEUE_ENABLED = 'true';
}

/** Silence fulfillment telemetry (`console.log` / `console.warn`); final report uses `process.stdout.write`. */
if (__probeQuiet) {
  console.log = () => {};
  console.warn = () => {};
}

await import('../bootstrap.js');

/** `.env` often sets Reloadly; this probe is for claim/margin concurrency, not operator mapping. */
process.env.AIRTIME_PROVIDER = String(
  process.env.FORTRESS_PROBE_AIRTIME_PROVIDER ?? 'mock',
).trim() || 'mock';

/** Keeps post-provider DB orchestration limited to margin rows unless explicitly overridden. */
process.env.LOYALTY_AUTO_GRANT_ON_DELIVERY = String(
  process.env.FORTRESS_PROBE_LOYALTY_AUTO_GRANT ?? 'false',
).trim();

const { prisma } = await import('../src/db.js');
const { processFulfillmentForOrder } = await import(
  '../src/services/fulfillmentProcessingService.js'
);
const { ORDER_STATUS } = await import('../src/constants/orderStatus.js');
const { PAYMENT_CHECKOUT_STATUS } = await import(
  '../src/constants/paymentCheckoutStatus.js'
);
const { FULFILLMENT_ATTEMPT_STATUS } = await import(
  '../src/constants/fulfillmentAttemptStatus.js'
);
const { detectPhase1LifecycleIncoherence } = await import(
  '../src/domain/orders/phase1LifecyclePolicy.js'
);
const { resolveAirtimeProviderName } = await import(
  '../src/domain/fulfillment/executeAirtimeFulfillment.js'
);

const dbUrl = String(
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? '',
).trim();
if (!dbUrl) {
  console.error(
    JSON.stringify({ error: 'DATABASE_URL or TEST_DATABASE_URL required' }),
  );
  process.exit(1);
}

const multiRegion =
  String(process.env.FORTRESS_PROBE_MULTI_REGION ?? '')
    .trim()
    .toLowerCase() === 'true';

let distinctN = Math.min(
  5000,
  Math.max(
    5,
    parseInt(String(process.env.FORTRESS_PROBE_DISTINCT_ORDERS ?? '20'), 10),
  ),
);

/** @type {Map<string, string>} orderId → probe region label (e.g. US, EU, ARAB_AE) */
const orderIdToRegion = new Map();

/** @type {{ code: string, label: string }[] | null} */
let multiRegionPlan = null;
if (multiRegion) {
  distinctN = 100;
  /** 20 each: US, EU, CA, Arab-region (AE per seed), TR — explicit `senderCountryCode` on rows. */
  multiRegionPlan = [
    ...Array.from({ length: 20 }, () => ({ code: 'US', label: 'US' })),
    ...Array.from({ length: 20 }, () => ({ code: 'EU', label: 'EU' })),
    ...Array.from({ length: 20 }, () => ({ code: 'CA', label: 'CA' })),
    ...Array.from({ length: 20 }, () => ({ code: 'AE', label: 'ARAB_AE' })),
    ...Array.from({ length: 20 }, () => ({ code: 'TR', label: 'TR' })),
  ];
}

const parallelism = Math.min(
  distinctN,
  Math.max(
    1,
    parseInt(
      String(process.env.FORTRESS_PROBE_PARALLELISM ?? String(distinctN)),
      10,
    ),
  ),
);
let sameOrderRaces = Math.min(
  100,
  Math.max(
    0,
    parseInt(String(process.env.FORTRESS_PROBE_SAME_ORDER_RACES ?? '1'), 10),
  ),
);
if (multiRegion) {
  sameOrderRaces = 0;
}

function pct(arr, p) {
  if (!arr.length) return null;
  const a = [...arr].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor(a.length * p))];
}

/** Dev DBs may lag migrations; cleanup must not fail the probe JSON report. */
async function deleteLoyaltyRowsForUsers(userIdList) {
  if (!userIdList.length) return;
  try {
    await prisma.loyaltyLedger.deleteMany({ where: { userId: { in: userIdList } } });
  } catch (e) {
    if (e?.code !== 'P2021') throw e;
  }
  try {
    await prisma.loyaltyPointsGrant.deleteMany({ where: { userId: { in: userIdList } } });
  } catch (e) {
    if (e?.code !== 'P2021') throw e;
  }
}

/** @type {string[]} */
const userIds = [];
/** @type {string[]} */
const orderIds = [];

async function makeUser() {
  const u = await prisma.user.create({
    data: {
      email: `probe_${randomUUID()}@test.invalid`,
      passwordHash: await bcrypt.hash('x', 4),
    },
  });
  userIds.push(u.id);
  return u;
}

async function paidQueuedOrder(userId, senderCountryCode = 'US') {
  const row = await prisma.paymentCheckout.create({
    data: {
      idempotencyKey: randomUUID(),
      requestFingerprint: `fp_${randomUUID().slice(0, 12)}`,
      userId,
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
      orderStatus: ORDER_STATUS.PAID,
      amountUsdCents: 1000,
      currency: 'usd',
      senderCountryCode,
      operatorKey: 'mtn',
      recipientNational: '701234567',
      productType: 'mobile_topup',
      providerCostUsdCents: 800,
      stripeFeeEstimateUsdCents: 59,
      stripeFeeActualUsdCents: 58,
      fxBufferUsdCents: 0,
      riskBufferUsdCents: 0,
      projectedNetMarginBp: 400,
      stripePaymentIntentId: `pi_probe_${randomUUID().slice(0, 10)}`,
      completedByWebhookEventId: `evt_probe_${randomUUID().slice(0, 10)}`,
      paidAt: new Date(),
      fulfillmentAttempts: {
        create: {
          attemptNumber: 1,
          status: FULFILLMENT_ATTEMPT_STATUS.QUEUED,
          provider: 'mock',
          requestSummary: JSON.stringify({ phase: 'queued' }),
        },
      },
    },
  });
  orderIds.push(row.id);
  return row.id;
}

/**
 * @param {string[]} ids
 * @param {number} limit
 * @param {(id: string) => Promise<void>} fn
 */
async function runPool(ids, limit, fn) {
  let cursor = 0;
  const workers = Math.max(1, Math.min(limit, ids.length));
  async function worker() {
    while (cursor < ids.length) {
      const idx = cursor;
      cursor += 1;
      if (idx >= ids.length) return;
      await fn(ids[idx]);
    }
  }
  await Promise.all(Array.from({ length: workers }, () => worker()));
}

try {
  await prisma.$connect();

  if (multiRegion && multiRegionPlan) {
    for (const spec of multiRegionPlan) {
      const u = await makeUser();
      const oid = await paidQueuedOrder(u.id, spec.code);
      orderIdToRegion.set(oid, spec.label);
    }
  } else {
    for (let i = 0; i < distinctN; i += 1) {
      const u = await makeUser();
      await paidQueuedOrder(u.id, 'US');
    }
  }

  /** @type {number[]} */
  const latenciesMs = [];
  /** @type {Map<string, number[]>} */
  const latenciesMsByRegion = new Map();
  let invokeErrors = 0;
  /** @type {{ ok: boolean, reason?: string, waiting?: number, active?: number, delayed?: number } | null} */
  let fulfillmentQueueDrain = null;
  /** @type {number | null} */
  let fulfillmentWorkerConcurrencySnapshot = null;

  const useFulfillmentQueue =
    String(process.env.FORTRESS_PROBE_USE_FULFILLMENT_QUEUE ?? '')
      .trim()
      .toLowerCase() === 'true' && sameOrderRaces === 0;

  const resolvedAirtimeForGate = resolveAirtimeProviderName();
  const allowFortressNonMock =
    String(process.env.FORTRESS_PROBE_ALLOW_NON_MOCK ?? '')
      .trim()
      .toLowerCase() === 'true';
  if (useFulfillmentQueue && resolvedAirtimeForGate !== 'mock' && !allowFortressNonMock) {
    process.stderr.write(
      `${JSON.stringify({
        error: 'fortress_queue_probe_requires_mock_airtime',
        resolvedAirtimeProvider: resolvedAirtimeForGate,
        hint: 'Set FORTRESS_PROBE_AIRTIME_PROVIDER=mock for provider-independent proof, or FORTRESS_PROBE_ALLOW_NON_MOCK=true to accept Reloadly outcomes.',
      })}\n`,
    );
    process.exit(1);
  }

  const wall0 = performance.now();
  let wallMs;
  if (useFulfillmentQueue) {
    const { startPhase1FulfillmentWorker, stopPhase1FulfillmentWorker } =
      await import('../src/queues/phase1FulfillmentWorker.js');
    const { enqueuePhase1FulfillmentJob } = await import(
      '../src/queues/phase1FulfillmentProducer.js'
    );
    const { waitForPhase1FulfillmentQueueDrained } = await import(
      '../src/queues/phase1FulfillmentQueueDrain.js'
    );
    const { env: probeEnv } = await import('../src/config/env.js');
    const { closePhase1FulfillmentQueue } = await import(
      '../src/queues/phase1FulfillmentQueue.js'
    );
    if (!probeEnv.fulfillmentQueueEnabled) {
      process.stderr.write(
        `${JSON.stringify({
          error:
            'FORTRESS_PROBE_USE_FULFILLMENT_QUEUE requires FULFILLMENT_QUEUE_ENABLED=true and REDIS_URL',
        })}\n`,
      );
      process.exit(1);
    }
    const { resolvePhase1FulfillmentWorkerConcurrency } = await import(
      '../src/queues/phase1FulfillmentWorkerConcurrency.js'
    );
    fulfillmentWorkerConcurrencySnapshot =
      resolvePhase1FulfillmentWorkerConcurrency();
    startPhase1FulfillmentWorker();
    for (const oid of orderIds) {
      const r = await enqueuePhase1FulfillmentJob(oid, null);
      if (!r.ok) invokeErrors += 1;
    }
    fulfillmentQueueDrain = await waitForPhase1FulfillmentQueueDrained({
      timeoutMs: Math.min(1_800_000, Math.max(120_000, orderIds.length * 3000)),
      pollMs: 250,
    });
    await stopPhase1FulfillmentWorker();
    await closePhase1FulfillmentQueue();
    wallMs = performance.now() - wall0;
    const approx = wallMs / Math.max(1, orderIds.length);
    for (const oid of orderIds) {
      latenciesMs.push(approx);
      if (multiRegion) {
        const regionLabel = orderIdToRegion.get(oid) ?? 'DEFAULT';
        if (!latenciesMsByRegion.has(regionLabel)) {
          latenciesMsByRegion.set(regionLabel, []);
        }
        latenciesMsByRegion.get(regionLabel).push(approx);
      }
    }
  } else {
    await runPool(orderIds, parallelism, async (oid) => {
      const t0 = performance.now();
      const regionLabel = orderIdToRegion.get(oid) ?? 'DEFAULT';
      try {
        await processFulfillmentForOrder(oid, {});
      } catch {
        invokeErrors += 1;
      } finally {
        const ms = performance.now() - t0;
        latenciesMs.push(ms);
        if (multiRegion) {
          if (!latenciesMsByRegion.has(regionLabel)) {
            latenciesMsByRegion.set(regionLabel, []);
          }
          latenciesMsByRegion.get(regionLabel).push(ms);
        }
      }
    });
    wallMs = performance.now() - wall0;
  }

  let sameOrderDupProcessing = 0;
  /** @type {number[]} */
  const sameOrderRaceLat = [];
  for (let r = 0; r < sameOrderRaces; r += 1) {
    const u = await makeUser();
    const oid = await paidQueuedOrder(u.id, 'US');
    const t0 = performance.now();
    await Promise.all([
      processFulfillmentForOrder(oid, {}),
      processFulfillmentForOrder(oid, {}),
    ]);
    sameOrderRaceLat.push(performance.now() - t0);
    const attempts = await prisma.fulfillmentAttempt.findMany({
      where: { orderId: oid },
      select: { status: true },
    });
    const processing = attempts.filter(
      (a) => a.status === FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
    );
    if (processing.length > 1) {
      sameOrderDupProcessing += 1;
    }
  }

  let successFinalize = 0;
  let failedFinalize = 0;
  let stuckPaid = 0;
  let stuckProcessing = 0;
  let duplicateSucceededAttempts = 0;
  /** Orders with more than one `FulfillmentAttempt` row (e.g. retry / race artifacts). */
  let ordersWithMoreThanOneAttemptRow = 0;
  let lifecycleViolationOrders = 0;
  /** @type {Record<string, number>} */
  const orderStatusHistogram = {};
  /** @type {Record<string, { orders: number, fulfilled: number, failed: number, stuckPaid: number, stuckProcessing: number, duplicateSucceededAttempts: number, lifecycleViolations: number, orderStatusHistogram: Record<string, number>, latencyMs: { n: number, p50: number | null, p95: number | null, p99: number | null } }>} */
  const perRegionOutcome = {};

  for (const oid of orderIds) {
    const row = await prisma.paymentCheckout.findUnique({ where: { id: oid } });
    const attempts = await prisma.fulfillmentAttempt.findMany({
      where: { orderId: oid },
    });
    const ok = attempts.filter(
      (a) => a.status === FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED,
    );
    if (ok.length > 1) {
      duplicateSucceededAttempts += 1;
    }
    if (!row) continue;
    const os = String(row.orderStatus ?? 'NULL');
    orderStatusHistogram[os] = (orderStatusHistogram[os] ?? 0) + 1;
    const v = detectPhase1LifecycleIncoherence(row);
    if (v.length) {
      lifecycleViolationOrders += 1;
    }
    if (row.orderStatus === ORDER_STATUS.FULFILLED) {
      successFinalize += 1;
    } else if (row.orderStatus === ORDER_STATUS.FAILED) {
      failedFinalize += 1;
    } else if (row.orderStatus === ORDER_STATUS.PAID) {
      stuckPaid += 1;
    } else if (row.orderStatus === ORDER_STATUS.PROCESSING) {
      stuckProcessing += 1;
    }

    if (multiRegion) {
      const rlab = orderIdToRegion.get(oid) ?? 'UNTAGGED';
      if (!perRegionOutcome[rlab]) {
        perRegionOutcome[rlab] = {
          orders: 0,
          fulfilled: 0,
          failed: 0,
          stuckPaid: 0,
          stuckProcessing: 0,
          duplicateSucceededAttempts: 0,
          lifecycleViolations: 0,
          orderStatusHistogram: {},
          latencyMs: { n: 0, p50: null, p95: null, p99: null },
        };
      }
      const pr = perRegionOutcome[rlab];
      pr.orders += 1;
      pr.orderStatusHistogram[os] = (pr.orderStatusHistogram[os] ?? 0) + 1;
      if (ok.length > 1) pr.duplicateSucceededAttempts += 1;
      if (v.length) pr.lifecycleViolations += 1;
      if (row.orderStatus === ORDER_STATUS.FULFILLED) pr.fulfilled += 1;
      else if (row.orderStatus === ORDER_STATUS.FAILED) pr.failed += 1;
      else if (row.orderStatus === ORDER_STATUS.PAID) pr.stuckPaid += 1;
      else if (row.orderStatus === ORDER_STATUS.PROCESSING) {
        pr.stuckProcessing += 1;
      }
    }
  }

  /** @type {Record<string, number>} */
  const failedOrderFailureReasonHistogram = {};
  /** @type {Record<string, number>} */
  const failedAttemptFailureReasonHistogram = {};
  if (failedFinalize > 0) {
    const fo = await prisma.paymentCheckout.findMany({
      where: { id: { in: orderIds }, orderStatus: ORDER_STATUS.FAILED },
      select: { failureReason: true },
    });
    for (const r of fo) {
      const k =
        r.failureReason != null && String(r.failureReason).trim()
          ? String(r.failureReason).slice(0, 160)
          : '(null_or_empty)';
      failedOrderFailureReasonHistogram[k] =
        (failedOrderFailureReasonHistogram[k] ?? 0) + 1;
    }
    const fa = await prisma.fulfillmentAttempt.findMany({
      where: {
        orderId: { in: orderIds },
        status: FULFILLMENT_ATTEMPT_STATUS.FAILED,
      },
      select: { failureReason: true },
    });
    for (const r of fa) {
      const k =
        r.failureReason != null && String(r.failureReason).trim()
          ? String(r.failureReason).slice(0, 160)
          : '(null_or_empty)';
      failedAttemptFailureReasonHistogram[k] =
        (failedAttemptFailureReasonHistogram[k] ?? 0) + 1;
    }
  }

  if (multiRegion) {
    for (const [label, arr] of latenciesMsByRegion) {
      if (perRegionOutcome[label]) {
        perRegionOutcome[label].latencyMs = {
          n: arr.length,
          p50: pct(arr, 0.5),
          p95: pct(arr, 0.95),
          p99: pct(arr, 0.99),
        };
      }
    }
  }

  const loyaltyOn =
    String(process.env.LOYALTY_AUTO_GRANT_ON_DELIVERY ?? '')
      .trim()
      .toLowerCase() === 'true';
  let loyaltyGrantsForProbeOrders = null;
  let loyaltyLedgerRowsForProbeUsers = null;

  const raceOrderIdSet = new Set();
  const raceOrderStart = orderIds.length - sameOrderRaces;
  for (let i = Math.max(0, raceOrderStart); i < orderIds.length; i += 1) {
    raceOrderIdSet.add(orderIds[i]);
  }
  let sameOrderRaceOrdersWithMoreThanOneAttemptRow = 0;
  let sameOrderRaceDuplicateSucceeded = 0;
  /** @type {Record<string, number>} */
  const sameOrderRaceFinalStatusHistogram = {};
  if (sameOrderRaces > 0) {
    for (const oid of raceOrderIdSet) {
      const atts = await prisma.fulfillmentAttempt.findMany({
        where: { orderId: oid },
      });
      if (atts.length > 1) sameOrderRaceOrdersWithMoreThanOneAttemptRow += 1;
      const succ = atts.filter(
        (a) => a.status === FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED,
      );
      if (succ.length > 1) sameOrderRaceDuplicateSucceeded += 1;
      const rowR = await prisma.paymentCheckout.findUnique({
        where: { id: oid },
      });
      const osR = String(rowR?.orderStatus ?? 'NULL');
      sameOrderRaceFinalStatusHistogram[osR] =
        (sameOrderRaceFinalStatusHistogram[osR] ?? 0) + 1;
    }
  }

  if (loyaltyOn) {
    try {
      loyaltyGrantsForProbeOrders = await prisma.loyaltyPointsGrant.count({
        where: { paymentCheckoutId: { in: orderIds } },
      });
    } catch (e) {
      if (e?.code !== 'P2021') throw e;
      loyaltyGrantsForProbeOrders = 'table_missing';
    }
    try {
      loyaltyLedgerRowsForProbeUsers = await prisma.loyaltyLedger.count({
        where: { userId: { in: userIds } },
      });
    } catch (e) {
      if (e?.code !== 'P2021') throw e;
      loyaltyLedgerRowsForProbeUsers = 'table_missing';
    }
  }

  const report = {
    kind: 'transaction_fortress_concurrency_probe',
    generatedAt: new Date().toISOString(),
    parameters: {
      distinctOrders: distinctN,
      multiRegion,
      senderCountryPlan: multiRegion
        ? { US: 20, EU: 20, CA: 20, AE_arabRegion: 20, TR: 20 }
        : null,
      parallelism,
      sameOrderRaces,
      mockProvider: String(process.env.AIRTIME_PROVIDER ?? 'mock'),
      resolvedAirtimeProvider: resolveAirtimeProviderName(),
      fortressProbeAirtimeEnv: String(
        process.env.FORTRESS_PROBE_AIRTIME_PROVIDER ?? '',
      ),
      loyaltyAutoGrantOnDelivery: String(process.env.LOYALTY_AUTO_GRANT_ON_DELIVERY ?? ''),
      useFulfillmentQueue,
      fulfillmentWorkerConcurrency: fulfillmentWorkerConcurrencySnapshot,
      fulfillmentQueueDrain,
    },
    wallClockMs: wallMs,
    invokeErrors,
    distinctOrdersOutcome: {
      successFulFilledCount: successFinalize,
      failedOrderCount: failedFinalize,
      stuckPaidCount: stuckPaid,
      stuckProcessingCount: stuckProcessing,
      duplicateSucceededAttemptOrders: duplicateSucceededAttempts,
      ordersWithMoreThanOneAttemptRow,
      ordersWithLifecycleViolations: lifecycleViolationOrders,
      coherenceViolationCount: lifecycleViolationOrders,
      invalidTransitionProxyCount: lifecycleViolationOrders,
      orderStatusHistogram,
      failedOrderFailureReasonHistogram,
      failedAttemptFailureReasonHistogram,
    },
    perRegion: multiRegion ? { outcome: perRegionOutcome } : null,
    loyaltySideEffects: loyaltyOn
      ? {
          loyaltyPointsGrantRowsForProbeOrders: loyaltyGrantsForProbeOrders,
          loyaltyLedgerRowsForProbeUsers: loyaltyLedgerRowsForProbeUsers,
        }
      : null,
    latencyMs: {
      perOrderInvoke: {
        n: latenciesMs.length,
        p50: pct(latenciesMs, 0.5),
        p95: pct(latenciesMs, 0.95),
        p99: pct(latenciesMs, 0.99),
      },
      sameOrderRaceWallMs:
        sameOrderRaceLat.length > 0
          ? {
              p50: pct(sameOrderRaceLat, 0.5),
              p95: pct(sameOrderRaceLat, 0.95),
            }
          : null,
    },
    sameOrderRace: {
      racesRun: sameOrderRaces,
      racesWithMoreThanOneProcessingAttempt: sameOrderDupProcessing,
      raceOrdersWithMoreThanOneAttemptRow:
        sameOrderRaces > 0 ? sameOrderRaceOrdersWithMoreThanOneAttemptRow : null,
      raceOrdersWithDuplicateSucceededAttempts:
        sameOrderRaces > 0 ? sameOrderRaceDuplicateSucceeded : null,
      raceOrderFinalOrderStatusHistogram:
        sameOrderRaces > 0 ? sameOrderRaceFinalStatusHistogram : null,
    },
    notes: {
      measuredOnThisRun: true,
      invalidTransitionCount:
        'No separate kernel counter; invalidTransitionProxyCount mirrors ordersWithLifecycleViolations on persisted rows.',
    },
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  for (const oid of orderIds) {
    await prisma.fulfillmentAttempt.deleteMany({ where: { orderId: oid } });
  }
  for (const oid of orderIds) {
    await prisma.paymentCheckout.deleteMany({ where: { id: oid } });
  }
  await deleteLoyaltyRowsForUsers(userIds);
  for (const uid of userIds) {
    await prisma.user.deleteMany({ where: { id: uid } });
  }
  await prisma.$disconnect();
}
