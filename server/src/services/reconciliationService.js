import { prisma } from '../db.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import { RECONCILIATION_ISSUE } from '../constants/reconciliationIssue.js';
import { env } from '../config/env.js';
import {
  REFERRAL_STATUS,
  REFERRAL_REWARD_TX_STATUS,
} from '../constants/referral.js';
import { safeSuffix } from '../lib/webTopupObservability.js';
import { loyaltyLedgerCheckoutSourceId } from '../constants/loyaltyLedger.js';
import { evaluateCheckoutReconciliation } from './reconciliationOrderEvaluator.js';
import {
  getReconciliationWatermark,
  setReconciliationWatermark,
  RECONCILE_WM,
} from './reconciliationWatermarkService.js';
import {
  pushExpectationBand,
  scorePushDeliveryExpectation,
} from './pushSignalConfidence.js';

/**
 * Read-only reconciliation (no mutations).
 *
 * Modes:
 * - **Legacy** (default): full table scans (same coverage as pre–incremental).
 * - **incremental: true**: rows with `updatedAt` / referral `updatedAt` after watermark; advances cursor when `updateWatermarks !== false`.
 * - **fullChunk**: `{ cursorId, size }` — PaymentCheckout by `id` ascending; return `nextFullCursorId` until exhaustion (pair with heavy slices on terminal chunk).
 *
 * @param {{
 *   now?: Date,
 *   incremental?: boolean,
 *   fullChunk?: { cursorId?: string | null, size?: number } | null,
 *   chunkSize?: number,
 *   updateWatermarks?: boolean,
 *   heavyIntegrity?: boolean,
 * }} [options]
 */
export async function runReconciliationScan(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const incremental = options.incremental === true;
  const fullChunk = options.fullChunk ?? null;
  const updateWatermarks = options.updateWatermarks !== false;
  const chunkSize =
    fullChunk?.size ??
    options.chunkSize ??
    (env.reconcileFullChunkSize > 0 ? env.reconcileFullChunkSize : 500);

  const t = {
    paidStuckMs: env.reconcilePaidStuckAfterMs,
    processingStuckMs: env.reconcileProcessingStuckAfterMs,
    fulfillmentQueuedStuckMs: env.reconcileFulfillmentQueuedStuckAfterMs,
    fulfillmentProcessingStuckMs: env.reconcileFulfillmentProcessingStuckAfterMs,
    pushQuietPeriodMs: env.reconcilePushQuietPeriodMs,
    integritySampleLimit: env.reconcileIntegritySampleLimit,
    loyaltyDriftLimit: env.reconcileLoyaltyDriftLimit,
  };

  const paidCutoff = new Date(now.getTime() - t.paidStuckMs);
  const processingCutoff = new Date(now.getTime() - t.processingStuckMs);
  const queuedCutoff = new Date(now.getTime() - t.fulfillmentQueuedStuckMs);
  const attemptProcessingCutoff = new Date(
    now.getTime() - t.fulfillmentProcessingStuckMs,
  );

  /** @type {object[]} */
  const issues = [];

  function msSince(d) {
    if (!d) return null;
    return now.getTime() - new Date(d).getTime();
  }

  function baseIssue(order, attempt) {
    return {
      orderId: order.id,
      reference: {
        idempotencyKey: order.idempotencyKey,
        stripeCheckoutSessionId: order.stripeCheckoutSessionId,
      },
      orderStatus: order.orderStatus,
      paymentCheckoutStatus: order.status,
      fulfillmentAttemptId: attempt?.id ?? null,
      fulfillmentStatus: attempt?.status ?? null,
      attemptNumber: attempt?.attemptNumber ?? null,
      detectedAt: now.toISOString(),
    };
  }

  const evalCtx = {
    now,
    t,
    paidCutoff,
    processingCutoff,
    queuedCutoff,
    attemptProcessingCutoff,
    baseIssue,
    msSince,
  };

  /** @type {{ mode: string, nextFullCursorId: string | null, fullChunkExhausted?: boolean, incrementalAdvanced?: boolean }} */
  const scanMeta = {
    mode: incremental ? 'incremental' : fullChunk ? 'full_chunk' : 'legacy',
    nextFullCursorId: null,
  };

  if (fullChunk) {
    const wm = await getReconciliationWatermark(RECONCILE_WM.FULL_PC_ID);
    const startId =
      fullChunk.cursorId != null && fullChunk.cursorId !== ''
        ? fullChunk.cursorId
        : wm.cursorId ?? '';
    const batch = await prisma.paymentCheckout.findMany({
      where: startId ? { id: { gt: startId } } : {},
      orderBy: { id: 'asc' },
      take: chunkSize,
      include: {
        fulfillmentAttempts: { where: { attemptNumber: 1 } },
      },
    });
    const dup = new Set();
    for (const o of batch) {
      evaluateCheckoutReconciliation(o, issues, { ...evalCtx, dupFilter: dup });
    }
    scanMeta.nextFullCursorId =
      batch.length > 0 ? batch[batch.length - 1].id : null;
 scanMeta.fullChunkExhausted = batch.length < chunkSize;
    if (updateWatermarks) {
      if (scanMeta.fullChunkExhausted) {
        await setReconciliationWatermark(RECONCILE_WM.FULL_PC_ID, {
          cursorId: null,
        });
      } else if (scanMeta.nextFullCursorId) {
        await setReconciliationWatermark(RECONCILE_WM.FULL_PC_ID, {
          cursorId: scanMeta.nextFullCursorId,
        });
      }
    }
    await appendProcessingAttemptStuckIssues(
      issues,
      evalCtx,
      attemptProcessingCutoff,
      now,
    );
    const heavy =
      options.heavyIntegrity !== false && scanMeta.fullChunkExhausted;
    if (heavy) {
      await appendReferralIntegrityIssues(issues, t, now, undefined);
      await appendLoyaltyFulfilledSampleIssues(issues, env, now);
      await appendLegacyPushGapIssues(issues, t, now, env);
      await appendGrantLedgerMismatchIssues(issues, now, t.integritySampleLimit);
      try {
        await appendGrantsSumDriftIssues(issues, t.loyaltyDriftLimit);
      } catch (e) {
        console.warn('[reconciliation] grants drift failed', e?.message ?? e);
      }
      await appendLedgerTotalDriftIssues(issues, t.loyaltyDriftLimit);
    }
    return finalizeReport(issues, now, t, scanMeta);
  }

  if (incremental) {
    const wm = await getReconciliationWatermark(RECONCILE_WM.PC_UPDATED_AT);
    const since = wm.cursorAt ?? new Date(0);
    const dup = new Set();
    const batch = await prisma.paymentCheckout.findMany({
      where: { updatedAt: { gt: since } },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: chunkSize,
      include: {
        fulfillmentAttempts: { where: { attemptNumber: 1 } },
      },
    });
    for (const o of batch) {
      evaluateCheckoutReconciliation(o, issues, { ...evalCtx, dupFilter: dup });
    }
    if (updateWatermarks && batch.length > 0) {
      await setReconciliationWatermark(RECONCILE_WM.PC_UPDATED_AT, {
        cursorAt: batch[batch.length - 1].updatedAt,
      });
      scanMeta.incrementalAdvanced = true;
    }
    await appendProcessingAttemptStuckIssues(
      issues,
      evalCtx,
      attemptProcessingCutoff,
      now,
    );

    const refWm = await getReconciliationWatermark(
      RECONCILE_WM.REFERRAL_UPDATED_AT,
    );
    const refSince = refWm.cursorAt ?? new Date(0);
    await appendReferralIntegrityIssues(
      issues,
      t,
      now,
      { updatedAt: { gt: refSince } },
    );
    if (updateWatermarks) {
      const refAgg = await prisma.referral.aggregate({
        where: { updatedAt: { gt: refSince } },
        _max: { updatedAt: true },
      });
      if (refAgg._max.updatedAt) {
        await setReconciliationWatermark(RECONCILE_WM.REFERRAL_UPDATED_AT, {
          cursorAt: refAgg._max.updatedAt,
        });
      }
    }

    const orderIds = batch.map((b) => b.id);
    await appendLoyaltyGrantChecksForOrders(issues, env, now, orderIds);
    await appendPushGapChecksForOrders(issues, t, now, env, orderIds);

    if (options.heavyIntegrity !== false) {
      await appendGrantLedgerMismatchIssues(issues, now, t.integritySampleLimit);
      await appendLedgerTotalDriftIssues(issues, t.loyaltyDriftLimit);
    }
    return finalizeReport(issues, now, t, scanMeta);
  }

  /* Legacy full scan (backward compatible). */
  const statusRows = await prisma.paymentCheckout.findMany({
    where: {
      orderStatus: {
        in: [
          ORDER_STATUS.PAID,
          ORDER_STATUS.PROCESSING,
          ORDER_STATUS.FULFILLED,
          ORDER_STATUS.FAILED,
        ],
      },
    },
    include: { fulfillmentAttempts: { where: { attemptNumber: 1 } } },
  });
  for (const o of statusRows) {
    evaluateCheckoutReconciliation(o, issues, evalCtx);
  }

  await appendProcessingAttemptStuckIssues(
    issues,
    evalCtx,
    attemptProcessingCutoff,
    now,
  );
  await appendReferralIntegrityIssues(issues, t, now, undefined);
  await appendLoyaltyFulfilledSampleIssues(issues, env, now);
  await appendLegacyPushGapIssues(issues, t, now, env);
  if (options.heavyIntegrity !== false) {
    await appendGrantLedgerMismatchIssues(issues, now, t.integritySampleLimit);
    try {
      await appendGrantsSumDriftIssues(issues, t.loyaltyDriftLimit);
    } catch (e) {
      console.warn('[reconciliation] grants drift query failed', e?.message ?? e);
    }
    await appendLedgerTotalDriftIssues(issues, t.loyaltyDriftLimit);
  }

  return finalizeReport(issues, now, t, scanMeta);
}

async function appendProcessingAttemptStuckIssues(
  issues,
  evalCtx,
  attemptProcessingCutoff,
  now,
) {
  const processingAttempts = await prisma.fulfillmentAttempt.findMany({
    where: {
      attemptNumber: 1,
      status: FULFILLMENT_ATTEMPT_STATUS.PROCESSING,
    },
    include: { order: true },
  });

  for (const att of processingAttempts) {
    const start = att.startedAt ?? att.updatedAt;
    if (!start || new Date(start) > attemptProcessingCutoff) continue;
    const o = att.order;
    if (
      issues.some(
        (i) =>
          i.orderId === o.id &&
          i.issueType === RECONCILIATION_ISSUE.ORDER_PROCESSING_STUCK,
      )
    ) {
      continue;
    }
    issues.push({
      ...evalCtx.baseIssue(o, att),
      issueType: RECONCILIATION_ISSUE.FULFILLMENT_PROCESSING_STUCK,
      ageMs: evalCtx.msSince(start),
      anchor: att.startedAt ? 'attempt.startedAt' : 'attempt.updatedAt',
      recommendedAction:
        'Correlate with provider dashboards; verify process did not crash mid-flight.',
      detail: 'Fulfillment attempt stuck in PROCESSING beyond threshold.',
    });
  }
}

/**
 * @param {object} refWhere
 */
async function appendReferralIntegrityIssues(issues, t, now, refWhere) {
  const sampleCap = t.integritySampleLimit;

  const rewardedNoTx = await prisma.referral.findMany({
    where: {
      status: REFERRAL_STATUS.REWARDED,
      rewardTx: null,
      ...(refWhere ?? {}),
    },
    select: { id: true, firstOrderId: true },
    take: sampleCap,
  });
  for (const r of rewardedNoTx) {
    issues.push({
      issueType: RECONCILIATION_ISSUE.REFERRAL_STATE_INCONSISTENT,
      referralIdSuffix: safeSuffix(r.id, 10),
      firstOrderIdSuffix: r.firstOrderId ? safeSuffix(r.firstOrderId, 10) : null,
      detectedAt: now.toISOString(),
      recommendedAction:
        'Audit referral payout pipeline — REWARDED without ReferralRewardTransaction breaks ledger expectations. No auto-fix.',
      detail: 'Referral is REWARDED but has no reward transaction row.',
    });
  }

  const rewardedWithPaid = await prisma.referral.findMany({
    where: {
      status: REFERRAL_STATUS.REWARDED,
      firstOrderId: { not: null },
      rewardTx: { status: REFERRAL_REWARD_TX_STATUS.COMPLETED },
      ...(refWhere ?? {}),
    },
    select: { id: true, firstOrderId: true },
    take: sampleCap,
  });
  for (const r of rewardedWithPaid) {
    const ord = r.firstOrderId
      ? await prisma.paymentCheckout.findUnique({
          where: { id: r.firstOrderId },
          select: { orderStatus: true },
        })
      : null;
    if (!ord || ord.orderStatus !== ORDER_STATUS.FULFILLED) {
      issues.push({
        issueType: RECONCILIATION_ISSUE.REFERRAL_REWARD_ORDER_MISMATCH,
        referralIdSuffix: safeSuffix(r.id, 10),
        orderIdSuffix: r.firstOrderId ? safeSuffix(r.firstOrderId, 10) : null,
        qualifyingOrderStatus: ord?.orderStatus ?? null,
        detectedAt: now.toISOString(),
        recommendedAction:
          'Verify invitee qualifying order is truly delivered before inviter payout stands — reconcile UserWallet / ReferralRewardTransaction vs order.',
        detail:
          'Referral rewarded (completed tx) but firstOrderId checkout is missing or not FULFILLED.',
      });
    }
  }
}

async function appendLoyaltyFulfilledSampleIssues(issues, env, now) {
  const sampleCap = env.reconcileIntegritySampleLimit;
  const loyaltyBasis = Math.max(1, env.loyaltyPointsUsdBasisCents);
  const fulfilledRecent = await prisma.paymentCheckout.findMany({
    where: {
      orderStatus: ORDER_STATUS.FULFILLED,
      userId: { not: null },
    },
    select: {
      id: true,
      userId: true,
      amountUsdCents: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: sampleCap,
  });
  for (const o of fulfilledRecent) {
    const cents = Math.max(0, Math.floor(Number(o.amountUsdCents) || 0));
    const expectPts = Math.floor(cents / loyaltyBasis);
    if (expectPts <= 0) continue;
    const grant = await prisma.loyaltyPointsGrant.findUnique({
      where: { paymentCheckoutId: o.id },
      select: { id: true },
    });
    if (!grant) {
      issues.push({
        issueType: RECONCILIATION_ISSUE.LOYALTY_GRANT_MISSING_FOR_FULFILLED,
        orderIdSuffix: safeSuffix(o.id, 10),
        userIdSuffix: o.userId ? safeSuffix(o.userId, 10) : null,
        expectedPoints: expectPts,
        detectedAt: now.toISOString(),
        signalSeverity: 'WARN',
        recommendedAction:
          'Compare AuditLog delivery_succeeded vs LoyaltyPointsGrant — replay grant only via controlled remediation.',
        detail:
          'FULFILLED order would earn loyalty points by policy but no grant row exists.',
      });
    }
  }
}

/** Incremental loyalty grant check for touched orders that are FULFILLED. */
async function appendLoyaltyGrantChecksForOrders(issues, env, now, orderIds) {
  if (!orderIds.length) return;
  const loyaltyBasis = Math.max(1, env.loyaltyPointsUsdBasisCents);
  const rows = await prisma.paymentCheckout.findMany({
    where: { id: { in: orderIds }, orderStatus: ORDER_STATUS.FULFILLED },
    select: { id: true, userId: true, amountUsdCents: true, updatedAt: true },
  });
  for (const o of rows) {
    const cents = Math.max(0, Math.floor(Number(o.amountUsdCents) || 0));
    const expectPts = Math.floor(cents / loyaltyBasis);
    if (expectPts <= 0 || !o.userId) continue;
    const grant = await prisma.loyaltyPointsGrant.findUnique({
      where: { paymentCheckoutId: o.id },
      select: { id: true },
    });
    if (!grant) {
      issues.push({
        issueType: RECONCILIATION_ISSUE.LOYALTY_GRANT_MISSING_FOR_FULFILLED,
        orderIdSuffix: safeSuffix(o.id, 10),
        userIdSuffix: safeSuffix(o.userId, 10),
        expectedPoints: expectPts,
        detectedAt: now.toISOString(),
        signalSeverity: 'WARN',
        recommendedAction:
          'Compare AuditLog delivery_succeeded vs LoyaltyPointsGrant — replay grant only via controlled remediation.',
        detail:
          'FULFILLED order would earn loyalty points by policy but no grant row exists.',
      });
    }
  }
}

async function appendLegacyPushGapIssues(issues, t, now, envApp) {
  const sampleCap = t.integritySampleLimit;
  const pushQuietCutoff = new Date(now.getTime() - t.pushQuietPeriodMs);
  const fulfilledForPush = await prisma.paymentCheckout.findMany({
    where: {
      orderStatus: ORDER_STATUS.FULFILLED,
      userId: { not: null },
      updatedAt: { lte: pushQuietCutoff },
    },
    select: { id: true, userId: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: sampleCap,
  });
  for (const o of fulfilledForPush) {
    if (!o.userId) continue;
    await maybePushGapIssue(issues, o, now, envApp, msSinceFactory(now));
  }
}

async function appendPushGapChecksForOrders(issues, t, now, envApp, orderIds) {
  const pushQuietCutoff = new Date(now.getTime() - t.pushQuietPeriodMs);
  const ms = msSinceFactory(now);
  const rows = await prisma.paymentCheckout.findMany({
    where: {
      id: { in: orderIds },
      orderStatus: ORDER_STATUS.FULFILLED,
      userId: { not: null },
      updatedAt: { lte: pushQuietCutoff },
    },
    select: { id: true, userId: true, updatedAt: true },
  });
  for (const o of rows) {
    await maybePushGapIssue(issues, o, now, envApp, ms);
  }
}

function msSinceFactory(now) {
  return (d) => {
    if (!d) return null;
    return now.getTime() - new Date(d).getTime();
  };
}

async function maybePushGapIssue(issues, o, now, envApp, msSince) {
  const dk = `order:${o.id}:delivered`;
  const inbox = await prisma.userNotification.findFirst({
    where: { userId: o.userId, dedupeKey: dk },
    select: { id: true },
  });
  if (inbox) return;
  const conf = await scorePushDeliveryExpectation(o.userId);
  const band = pushExpectationBand(conf);
  issues.push({
    issueType: RECONCILIATION_ISSUE.PUSH_DELIVERED_NOTIFICATION_GAP,
    orderIdSuffix: safeSuffix(o.id, 10),
    userIdSuffix: safeSuffix(o.userId, 10),
    ageMs: msSince(o.updatedAt),
    anchor: 'order.updatedAt',
    detectedAt: now.toISOString(),
    signalSeverity: band === 'high' ? 'WARN' : 'INFO',
    pushSignal: { score: conf.score, band },
    recommendedAction:
      band === 'high'
        ? 'Check push pipeline / FCM tokens — user likely expects notifications.'
        : 'Low push expectation — verify only if countermetrics warrant; user may not use inbox.',
    detail:
      'FULFILLED order passed push quiet window without `order:{id}:delivered` inbox row.',
  });
}

async function appendGrantLedgerMismatchIssues(issues, now, limit) {
  const cap = Math.min(Math.max(limit, 1), 500);
  const grants = await prisma.loyaltyPointsGrant.findMany({
    take: cap,
    orderBy: { createdAt: 'desc' },
    select: { paymentCheckoutId: true, userId: true },
  });
  for (const g of grants) {
    const sourceId = loyaltyLedgerCheckoutSourceId(g.paymentCheckoutId);
    const row = await prisma.loyaltyLedger.findUnique({
      where: { sourceId },
      select: { id: true },
    });
    if (!row) {
      issues.push({
        issueType: RECONCILIATION_ISSUE.LOYALTY_GRANT_WITHOUT_LEDGER,
        orderIdSuffix: safeSuffix(g.paymentCheckoutId, 10),
        userIdSuffix: safeSuffix(g.userId, 10),
        detectedAt: now.toISOString(),
        signalSeverity: 'WARN',
        recommendedAction:
          'Backfill LoyaltyLedger from grant or reconcile grant removal — ledger is authoritative for replay.',
        detail: 'LoyaltyPointsGrant exists without matching LoyaltyLedger credit.',
      });
    }
  }
}

async function appendGrantsSumDriftIssues(issues, driftCap) {
  const cap = Math.min(Math.max(driftCap, 1), 200);
  const driftRows = await prisma.$queryRaw`
    SELECT u.id AS "userId"
    FROM "User" u
    LEFT JOIN (
      SELECT "userId", COALESCE(SUM(points), 0)::int AS s
      FROM "LoyaltyPointsGrant"
      GROUP BY "userId"
    ) g ON g."userId" = u."id"
    WHERE u."loyaltyPointsTotal" <> COALESCE(g.s, 0)
    LIMIT ${cap}
  `;
  for (const row of driftRows) {
    issues.push({
      issueType: RECONCILIATION_ISSUE.LOYALTY_POINTS_TOTAL_DRIFT,
      userIdSuffix: safeSuffix(row.userId, 10),
      detectedAt: new Date().toISOString(),
      signalSeverity: 'WARN',
      recommendedAction:
        'Recompute SUM(LoyaltyPointsGrant) vs User.loyaltyPointsTotal — treat as data integrity incident; no automatic balance writes.',
      detail: 'Denormalized loyalty total does not match grant sum for user.',
    });
  }
}

async function appendLedgerTotalDriftIssues(issues, driftCap) {
  try {
    const cap = Math.min(Math.max(driftCap, 1), 200);
    const driftRows = await prisma.$queryRaw`
      SELECT u.id AS "userId"
      FROM "User" u
      LEFT JOIN (
        SELECT "userId", COALESCE(SUM(amount), 0)::int AS s
        FROM "LoyaltyLedger"
        GROUP BY "userId"
      ) l ON l."userId" = u."id"
      WHERE u."loyaltyPointsTotal" <> COALESCE(l.s, 0)
      LIMIT ${cap}
    `;
    for (const row of driftRows) {
      issues.push({
        issueType: RECONCILIATION_ISSUE.LOYALTY_LEDGER_TOTAL_DRIFT,
        userIdSuffix: safeSuffix(row.userId, 10),
        detectedAt: new Date().toISOString(),
        signalSeverity: 'WARN',
        recommendedAction:
          'Recompute SUM(LoyaltyLedger.amount) vs User.loyaltyPointsTotal — ledger is replay-safe source of truth.',
        detail: 'User loyalty total does not match ledger sum.',
      });
    }
  } catch (e) {
    console.warn('[reconciliation] ledger drift query failed', e?.message ?? e);
  }
}

function finalizeReport(issues, now, t, scanMeta) {
  const byIssueType = {};
  const bySeverity = { WARN: 0, INFO: 0 };
  for (const row of issues) {
    const k = row.issueType;
    byIssueType[k] = (byIssueType[k] ?? 0) + 1;
    const sev = row.signalSeverity === 'INFO' ? 'INFO' : 'WARN';
    bySeverity[sev] += 1;
  }

  return {
    scannedAt: now.toISOString(),
    thresholds: {
      paidStuckMs: t.paidStuckMs,
      processingStuckMs: t.processingStuckMs,
      fulfillmentQueuedStuckMs: t.fulfillmentQueuedStuckMs,
      fulfillmentProcessingStuckMs: t.fulfillmentProcessingStuckMs,
      pushQuietPeriodMs: t.pushQuietPeriodMs,
      integritySampleLimit: t.integritySampleLimit,
      loyaltyDriftLimit: t.loyaltyDriftLimit,
    },
    summary: {
      total: issues.length,
      byIssueType,
      bySignalSeverity: bySeverity,
    },
    scan: scanMeta,
    issues,
  };
}
