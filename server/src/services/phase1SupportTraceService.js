import { prisma } from '../db.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { getCanonicalPhase1OrderForStaff } from './canonicalPhase1OrderService.js';

/**
 * @param {string} payload
 * @returns {Record<string, unknown>}
 */
function safeParsePayload(payload) {
  if (typeof payload !== 'string' || !payload.trim()) return {};
  try {
    const v = JSON.parse(payload);
    return v && typeof v === 'object' && !Array.isArray(v)
      ? /** @type {Record<string, unknown>} */ (v)
      : { _nonObject: true };
  } catch {
    return { _jsonParseFailed: true };
  }
}

/**
 * Audit rows mentioning this checkout (`orderId` / `checkoutId` in JSON payload).
 *
 * @param {import('@prisma/client').PrismaClient} db
 * @param {string} orderId
 */
export async function fetchAuditLogRowsForOrder(db, orderId) {
  return db.$queryRaw`
    SELECT id, event, payload, ip, "createdAt"
    FROM "AuditLog"
    WHERE (payload::jsonb->>'orderId') = ${orderId}
       OR (payload::jsonb->>'checkoutId') = ${orderId}
    ORDER BY "createdAt" ASC
  `;
}

/**
 * Observable intervals from persisted timestamps only (no invented webhook arrival times).
 *
 * @param {{
 *   canonical: Awaited<ReturnType<typeof getCanonicalPhase1OrderForStaff>>,
 *   audits: { event: string, createdAt: Date, payloadParsed: Record<string, unknown> }[],
 *   attempts: { status: string, startedAt: Date | null, completedAt: Date | null, createdAt: Date }[],
 * }} ctx
 */
export function deriveSupportTraceTiming(ctx) {
  const { canonical, audits, attempts } = ctx;
  if (!canonical) {
    return {
      orderCreatedToPaidMs: null,
      paidToFirstFulfillmentStartMs: null,
      fulfillmentStartToSuccessMs: null,
      endToEndDeliveredMs: null,
      notes: ['missing_canonical'],
    };
  }

  const createdAt = canonical.createdAt ? Date.parse(canonical.createdAt) : NaN;
  const paidAt = canonical.paidAt ? Date.parse(canonical.paidAt) : NaN;

  const orderCreatedToPaidMs =
    Number.isFinite(createdAt) && Number.isFinite(paidAt)
      ? Math.max(0, paidAt - createdAt)
      : null;

  const deliveryStarted = audits.filter((a) => a.event === 'delivery_started');
  const firstStart = deliveryStarted[0]?.createdAt;
  const paidToFirstFulfillmentStartMs =
    Number.isFinite(paidAt) && firstStart
      ? Math.max(0, firstStart.getTime() - paidAt)
      : null;

  const succeeded = attempts.filter((x) => x.status === 'SUCCEEDED');
  const lastOk = succeeded.length
    ? succeeded.reduce((a, b) =>
        (b.completedAt?.getTime() ?? 0) > (a.completedAt?.getTime() ?? 0) ? b : a,
      )
    : null;
  let fulfillmentStartToSuccessMs = null;
  if (lastOk?.startedAt && lastOk.completedAt) {
    fulfillmentStartToSuccessMs = Math.max(
      0,
      lastOk.completedAt.getTime() - lastOk.startedAt.getTime(),
    );
  }

  let endToEndDeliveredMs = null;
  const done =
    canonical.lifecycleStatus === ORDER_STATUS.FULFILLED ||
    canonical.lifecycleStatus === ORDER_STATUS.FAILED;
  if (Number.isFinite(createdAt) && done && canonical.updatedAt) {
    const u = Date.parse(canonical.updatedAt);
    if (Number.isFinite(u)) endToEndDeliveredMs = Math.max(0, u - createdAt);
  }

  return {
    orderCreatedToPaidMs,
    paidToFirstFulfillmentStartMs,
    fulfillmentStartToSuccessMs,
    endToEndDeliveredMs,
    notes: [
      'stripe_event_latency_not_stored_use_dashboard_for_webhook_delay',
    ],
  };
}

/**
 * Staff support bundle: canonical truth + fulfillment + audit + timing (DB only).
 *
 * @param {string} orderId PaymentCheckout id
 * @param {{ prisma?: import('@prisma/client').PrismaClient }} [options]
 */
export async function buildSupportOrderFullTrace(orderId, options = {}) {
  const db = options.prisma ?? prisma;
  const canonical = await getCanonicalPhase1OrderForStaff(orderId, { prisma: db });
  if (!canonical) return null;

  const [rawAudits, attempts] = await Promise.all([
    fetchAuditLogRowsForOrder(db, orderId),
    db.fulfillmentAttempt.findMany({
      where: { orderId },
      orderBy: { attemptNumber: 'asc' },
      select: {
        id: true,
        attemptNumber: true,
        status: true,
        provider: true,
        providerReference: true,
        failureReason: true,
        requestSummary: true,
        responseSummary: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        failedAt: true,
        updatedAt: true,
      },
    }),
  ]);

  /** @type {{ id: string, event: string, payloadParsed: Record<string, unknown>, ip: string | null, createdAt: Date }[]} */
  const audits = [];
  for (const r of Array.isArray(rawAudits) ? rawAudits : []) {
    const rec = /** @type {{ id: string, event: string, payload: string, ip: string | null, createdAt: Date }} */ (
      r
    );
    audits.push({
      id: rec.id,
      event: rec.event,
      payloadParsed: safeParsePayload(rec.payload),
      ip: rec.ip ?? null,
      createdAt: rec.createdAt,
    });
  }

  /** @type {{ t: string, kind: string, label: string, meta?: Record<string, unknown> }[]} */
  const timeline = [];

  timeline.push({
    t: canonical.createdAt,
    kind: 'checkout',
    label: 'checkout_created',
  });
  if (canonical.paidAt) {
    timeline.push({ t: canonical.paidAt, kind: 'payment', label: 'paid_at' });
  }
  if (canonical.failedAt) {
    timeline.push({ t: canonical.failedAt, kind: 'payment', label: 'failed_at' });
  }
  if (canonical.cancelledAt) {
    timeline.push({
      t: canonical.cancelledAt,
      kind: 'checkout',
      label: 'cancelled_at',
    });
  }

  for (const a of audits) {
    timeline.push({
      t: a.createdAt.toISOString(),
      kind: 'audit',
      label: a.event,
      meta: { auditId: a.id },
    });
  }
  for (const att of attempts) {
    timeline.push({
      t: att.createdAt.toISOString(),
      kind: 'fulfillment',
      label: `attempt_${att.attemptNumber}_created`,
      meta: { attemptId: att.id, status: att.status },
    });
    if (att.startedAt) {
      timeline.push({
        t: att.startedAt.toISOString(),
        kind: 'fulfillment',
        label: `attempt_${att.attemptNumber}_started`,
        meta: { attemptId: att.id },
      });
    }
    if (att.completedAt) {
      timeline.push({
        t: att.completedAt.toISOString(),
        kind: 'fulfillment',
        label: `attempt_${att.attemptNumber}_completed`,
        meta: { attemptId: att.id, status: att.status },
      });
    }
    if (att.failedAt) {
      timeline.push({
        t: att.failedAt.toISOString(),
        kind: 'fulfillment',
        label: `attempt_${att.attemptNumber}_failed`,
        meta: { attemptId: att.id },
      });
    }
  }

  timeline.sort((x, y) => Date.parse(x.t) - Date.parse(y.t));

  const derivedTimingMs = deriveSupportTraceTiming({
    canonical,
    audits,
    attempts,
  });

  const { userId: _staffOnlyUserId, ...phase1Order } = canonical;

  return {
    generatedAt: new Date().toISOString(),
    orderId,
    userId: canonical.userId ?? null,
    phase1Order,
    payment: {
      stripePaymentIntentId: phase1Order.stripePaymentIntentId ?? null,
      stripeCheckoutSessionId: phase1Order.stripeCheckoutSessionId ?? null,
      completedByStripeWebhookEventId:
        phase1Order.completedByStripeWebhookEventId ?? null,
      checkoutChargeUsd: phase1Order.checkoutChargeUsd ?? null,
      reconciliationStatus: phase1Order.reconciliationStatus ?? null,
      expectedMarginUsd: phase1Order.expectedMarginUsd ?? null,
      actualMarginUsd: phase1Order.actualMarginUsd ?? null,
      marginDeltaUsd: phase1Order.marginDeltaUsd ?? null,
      financialAnomalyCodes: phase1Order.financialAnomalyCodes ?? [],
    },
    fulfillment: {
      attempts: attempts.map((x) => ({
        id: x.id,
        attemptNumber: x.attemptNumber,
        status: x.status,
        provider: x.provider,
        providerReference: x.providerReference,
        failureReason: x.failureReason,
        requestSummary: x.requestSummary,
        responseSummary: x.responseSummary,
        createdAt: x.createdAt.toISOString(),
        startedAt: x.startedAt?.toISOString() ?? null,
        completedAt: x.completedAt?.toISOString() ?? null,
        failedAt: x.failedAt?.toISOString() ?? null,
        updatedAt: x.updatedAt.toISOString(),
      })),
    },
    anomalies: {
      codes: phase1Order.financialAnomalyCodes ?? [],
      supportLines: phase1Order.financialAnomalySupportLines ?? [],
      postPaymentIncident: phase1Order.postPaymentIncident ?? null,
    },
    auditTrail: audits.map((a) => ({
      id: a.id,
      event: a.event,
      createdAt: a.createdAt.toISOString(),
      ip: a.ip,
      payload: a.payloadParsed,
    })),
    timeline,
    derivedTimingMs,
    fortress: {
      fulfillmentPaymentGate: phase1Order.fulfillmentPaymentGate ?? null,
      lifecycleCoherenceViolations:
        phase1Order.lifecycleCoherenceViolations ?? [],
      transactionFailureTaxonomy: 'TRANSACTION_FAILURE_CLASS',
      idempotencyContractDoc: 'docs/PHASE1_IDEMPOTENCY_CONTRACT.md',
      stateMachineDoc: 'docs/PHASE1_STATE_MACHINE.md',
    },
  };
}
