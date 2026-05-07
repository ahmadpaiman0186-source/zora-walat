/**
 * L8 read-only money-path drift scanners (DB-only; no Stripe mutations).
 */

import { prisma as defaultPrisma, Prisma } from '../db.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { LEDGER_EVENT_TYPE } from '../ledger/ledgerService.js';
import { pricingBreakdownFromSnapshot } from '../lib/checkoutPricingBreakdown.js';

/** @typedef {import('@prisma/client').PrismaClient} PrismaClient */

export const DRIFT_TYPE = Object.freeze({
  PAYMENT_DRIFT: 'payment_drift',
  LEDGER_DRIFT: 'ledger_drift',
  FULFILLMENT_DRIFT: 'fulfillment_drift',
  PRICING_DRIFT: 'pricing_drift',
});

/**
 * @typedef {{
 *   type: string,
 *   subtype: string,
 *   checkoutId: string,
 *   traceId: string | null,
 * }} MoneyPathDriftInconsistency
 */

/**
 * @param {unknown} metadata
 * @returns {string | null}
 */
export function traceIdFromCheckoutMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return null;
  const z = /** @type {Record<string, unknown>} */ (metadata).zwTraceId;
  return typeof z === 'string' && z.trim() ? z.trim().slice(0, 128) : null;
}

/**
 * @param {unknown} snapshot
 * @param {number} amountUsdCents
 * @returns {{ mismatch: boolean, detail?: string } | null} null when snapshot incomplete for strict breakdown
 */
export function evaluatePricingSnapshotDrift(snapshot, amountUsdCents) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const o = /** @type {Record<string, unknown>} */ (snapshot);
  const keys = [
    'customerProductValueUsdCents',
    'customerGovernmentTaxUsdCents',
    'customerZoraServiceFeeUsdCents',
    'finalPriceUsdCents',
  ];
  if (!keys.every((k) => o[k] != null)) return null;
  const pv = Math.round(Number(o.customerProductValueUsdCents));
  const tx = Math.round(Number(o.customerGovernmentTaxUsdCents));
  const fee = Math.round(Number(o.customerZoraServiceFeeUsdCents));
  const finalStored = Math.round(Number(o.finalPriceUsdCents));
  const lineSum = pv + tx + fee;
  if (finalStored !== lineSum) {
    return {
      mismatch: true,
      detail: 'finalPriceUsdCents_ne_product_plus_tax_plus_fee',
    };
  }
  const bd = pricingBreakdownFromSnapshot(snapshot, amountUsdCents);
  const authTotal = bd.totalUsdCents;
  if (Math.round(Number(amountUsdCents) || 0) !== authTotal) {
    return {
      mismatch: true,
      detail: 'checkout_amount_vs_snapshot_breakdown_total',
    };
  }
  return { mismatch: false };
}

/**
 * @param {PrismaClient} client
 * @param {number} limit
 * @returns {Promise<MoneyPathDriftInconsistency[]>}
 */
async function scanPaymentDrift(client, limit) {
  /** @type {MoneyPathDriftInconsistency[]} */
  const out = [];

  const capped = Math.min(500, Math.max(1, limit));

  const missingEvtCandidates = await client.paymentCheckout.findMany({
    where: { completedByWebhookEventId: { not: null } },
    take: capped,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      metadata: true,
      completedByWebhookEventId: true,
    },
  });

  for (const row of missingEvtCandidates) {
    const ref = row.completedByWebhookEventId
      ? String(row.completedByWebhookEventId)
      : '';
    if (!ref) continue;
    const ev = await client.stripeWebhookEvent.findUnique({
      where: { id: ref },
    });
    if (!ev) {
      out.push({
        type: DRIFT_TYPE.PAYMENT_DRIFT,
        subtype: 'completed_ref_missing_webhook_row',
        checkoutId: row.id,
        traceId: traceIdFromCheckoutMetadata(row.metadata),
      });
    }
  }

  const paidMissingLink = await client.paymentCheckout.findMany({
    where: {
      OR: [
        {
          orderStatus: ORDER_STATUS.PAID,
          completedByWebhookEventId: null,
        },
        {
          status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
          completedByWebhookEventId: null,
        },
      ],
    },
    take: capped,
    select: { id: true, metadata: true },
  });
  for (const row of paidMissingLink) {
    out.push({
      type: DRIFT_TYPE.PAYMENT_DRIFT,
      subtype: 'paid_pipeline_missing_webhook_link',
      checkoutId: row.id,
      traceId: traceIdFromCheckoutMetadata(row.metadata),
    });
  }

  const contradictionPaidAt = await client.paymentCheckout.findMany({
    where: {
      paidAt: { not: null },
      OR: [
        { orderStatus: ORDER_STATUS.PENDING },
        { status: PAYMENT_CHECKOUT_STATUS.PAYMENT_PENDING },
        { status: PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED },
      ],
    },
    take: capped,
    select: { id: true, metadata: true },
  });
  for (const row of contradictionPaidAt) {
    out.push({
      type: DRIFT_TYPE.PAYMENT_DRIFT,
      subtype: 'paid_timestamp_but_row_not_paid_pipeline',
      checkoutId: row.id,
      traceId: traceIdFromCheckoutMetadata(row.metadata),
    });
  }

  const stalePendingWithWebhook = await client.$queryRaw(
    Prisma.sql`
      SELECT p.id AS id
      FROM "PaymentCheckout" p
      INNER JOIN "StripeWebhookEvent" e ON e.id = p."completedByWebhookEventId"
      WHERE p."orderStatus" = ${ORDER_STATUS.PENDING}
        AND p."completedByWebhookEventId" IS NOT NULL
      LIMIT ${capped}
    `,
  );
  for (const r of /** @type {{ id: string }[]} */ (stalePendingWithWebhook)) {
    const row = await client.paymentCheckout.findUnique({
      where: { id: r.id },
      select: { metadata: true },
    });
    out.push({
      type: DRIFT_TYPE.PAYMENT_DRIFT,
      subtype: 'webhook_completion_ref_but_order_still_pending',
      checkoutId: r.id,
      traceId: traceIdFromCheckoutMetadata(row?.metadata ?? null),
    });
  }

  return out;
}

/**
 * @param {PrismaClient} client
 * @param {number} limit
 * @returns {Promise<MoneyPathDriftInconsistency[]>}
 */
async function scanLedgerDrift(client, limit) {
  const capped = Math.min(500, Math.max(1, limit));
  /** @type {MoneyPathDriftInconsistency[]} */
  const out = [];

  const paidPipeline = await client.paymentCheckout.findMany({
    where: {
      orderStatus: ORDER_STATUS.PAID,
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED,
      completedByWebhookEventId: { not: null },
    },
    take: capped,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      amountUsdCents: true,
      completedByWebhookEventId: true,
      metadata: true,
    },
  });

  for (const row of paidPipeline) {
    const evId = String(row.completedByWebhookEventId ?? '');
    const idem = `ledger:payment:${row.id}:${evId}`;
    const existing = await client.ledgerJournalEntry.findUnique({
      where: { idempotencyKey: idem },
      select: { id: true },
    });
    if (!existing) {
      const ev = await client.stripeWebhookEvent.findUnique({
        where: { id: evId },
      });
      if (ev) {
        out.push({
          type: DRIFT_TYPE.LEDGER_DRIFT,
          subtype: 'missing_payment_capture_for_paid',
          checkoutId: row.id,
          traceId: traceIdFromCheckoutMetadata(row.metadata),
        });
      }
    }
  }

  const captureRows = await client.ledgerJournalEntry.findMany({
    where: {
      eventType: LEDGER_EVENT_TYPE.PAYMENT_CAPTURED,
      paymentCheckoutId: { not: null },
    },
    take: capped,
    orderBy: { createdAt: 'desc' },
    select: { paymentCheckoutId: true },
  });

  const seenPid = new Set();
  for (const L of captureRows) {
    const pid = L.paymentCheckoutId ? String(L.paymentCheckoutId) : '';
    if (!pid || seenPid.has(pid)) continue;
    seenPid.add(pid);

    const p = await client.paymentCheckout.findUnique({
      where: { id: pid },
      select: {
        orderStatus: true,
        status: true,
        metadata: true,
      },
    });
    if (
      !p ||
      p.orderStatus !== ORDER_STATUS.PAID ||
      p.status !== PAYMENT_CHECKOUT_STATUS.PAYMENT_SUCCEEDED
    ) {
      out.push({
        type: DRIFT_TYPE.LEDGER_DRIFT,
        subtype: 'payment_capture_without_paid_checkout',
        checkoutId: pid,
        traceId: traceIdFromCheckoutMetadata(p?.metadata ?? null),
      });
    }
  }

  return out;
}

/**
 * @param {PrismaClient} client
 * @param {number} limit
 * @returns {Promise<MoneyPathDriftInconsistency[]>}
 */
async function scanFulfillmentDrift(client, limit) {
  const capped = Math.min(500, Math.max(1, limit));
  /** @type {MoneyPathDriftInconsistency[]} */
  const out = [];

  const paidNoAttempt = await client.paymentCheckout.findMany({
    where: {
      orderStatus: ORDER_STATUS.PAID,
      fulfillmentAttempts: { none: {} },
    },
    take: capped,
    orderBy: { updatedAt: 'desc' },
    select: { id: true, metadata: true },
  });
  for (const row of paidNoAttempt) {
    out.push({
      type: DRIFT_TYPE.FULFILLMENT_DRIFT,
      subtype: 'paid_without_fulfillment_attempt',
      checkoutId: row.id,
      traceId: traceIdFromCheckoutMetadata(row.metadata),
    });
  }

  const orphanAttempts = await client.fulfillmentAttempt.findMany({
    where: {
      order: {
        OR: [
          { orderStatus: ORDER_STATUS.PENDING },
          {
            status: {
              in: [
                PAYMENT_CHECKOUT_STATUS.PAYMENT_PENDING,
                PAYMENT_CHECKOUT_STATUS.CHECKOUT_CREATED,
                PAYMENT_CHECKOUT_STATUS.INITIATED,
              ],
            },
          },
        ],
      },
    },
    take: capped,
    distinct: ['orderId'],
    select: {
      orderId: true,
      order: { select: { metadata: true } },
    },
  });

  for (const row of orphanAttempts) {
    out.push({
      type: DRIFT_TYPE.FULFILLMENT_DRIFT,
      subtype: 'attempt_exists_but_checkout_not_paid_pipeline',
      checkoutId: row.orderId,
      traceId: traceIdFromCheckoutMetadata(row.order?.metadata ?? null),
    });
  }

  return out;
}

/**
 * @param {PrismaClient} client
 * @param {number} limit
 * @returns {Promise<MoneyPathDriftInconsistency[]>}
 */
async function scanPricingDrift(client, limit) {
  const capped = Math.min(500, Math.max(1, limit));
  /** @type {MoneyPathDriftInconsistency[]} */
  const out = [];

  const rows = await client.paymentCheckout.findMany({
    where: {
      pricingSnapshot: { not: Prisma.DbNull },
    },
    take: capped,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      amountUsdCents: true,
      pricingSnapshot: true,
      metadata: true,
    },
  });

  for (const row of rows) {
    const evald = evaluatePricingSnapshotDrift(
      row.pricingSnapshot,
      row.amountUsdCents,
    );
    if (evald?.mismatch) {
      out.push({
        type: DRIFT_TYPE.PRICING_DRIFT,
        subtype: evald.detail ?? 'pricing_snapshot_mismatch',
        checkoutId: row.id,
        traceId: traceIdFromCheckoutMetadata(row.metadata),
      });
    }
  }

  return out;
}

function dedupeInconsistencies(rows) {
  const map = new Map();
  for (const r of rows) {
    const k = `${r.type}:${r.subtype}:${r.checkoutId}`;
    if (!map.has(k)) map.set(k, r);
  }
  return [...map.values()];
}

/**
 * @param {{ prisma?: PrismaClient, limit?: number }} [opts]
 * @returns {Promise<MoneyPathDriftInconsistency[]>}
 */
export async function scanMoneyPathDrifts(opts = {}) {
  const client = opts.prisma ?? defaultPrisma;
  const limit = Math.min(500, Math.max(1, opts.limit ?? 40));

  const chunks = await Promise.all([
    scanPaymentDrift(client, limit),
    scanLedgerDrift(client, limit),
    scanFulfillmentDrift(client, limit),
    scanPricingDrift(client, limit),
  ]);

  return dedupeInconsistencies(chunks.flat());
}
