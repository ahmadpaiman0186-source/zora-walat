import { prisma } from '../db.js';
import { env } from '../config/env.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import {
  inferDestinationCountry,
  inferProductType,
} from '../lib/marginIntelligence.js';

const FULFILLED = ORDER_STATUS.FULFILLED;

/**
 * @param {Array<{
 *   marginSellUsdCents: number | null,
 *   marginProviderCostUsdCents: number | null,
 *   marginPaymentFeeUsdCents: number | null,
 *   marginNetUsdCents: number | null,
 * }>} rows
 */
export function aggregateMarginSummaryFromRows(rows) {
  let orderCount = 0;
  let sell = 0;
  let providerCost = 0;
  let paymentFee = 0;
  let net = 0;
  for (const r of rows) {
    if (r.marginNetUsdCents == null) continue;
    orderCount += 1;
    sell += r.marginSellUsdCents ?? 0;
    providerCost += r.marginProviderCostUsdCents ?? 0;
    paymentFee += r.marginPaymentFeeUsdCents ?? 0;
    net += r.marginNetUsdCents;
  }
  return {
    orderCount,
    totals: {
      sellUsd: Math.round(sell) / 100,
      providerCostUsd: Math.round(providerCost) / 100,
      paymentFeeUsd: Math.round(paymentFee) / 100,
      netMarginUsd: Math.round(net) / 100,
    },
    blendedNetMarginPercentOfSell:
      sell > 0 ? Math.round((net / sell) * 1_000_000) / 10000 : null,
  };
}

function parseSinceUntil(q) {
  const sinceRaw = q.since ?? q.from;
  const untilRaw = q.until ?? q.to;
  const since =
    sinceRaw != null && String(sinceRaw).trim()
      ? new Date(String(sinceRaw))
      : null;
  const until =
    untilRaw != null && String(untilRaw).trim()
      ? new Date(String(untilRaw))
      : null;
  if (since && Number.isNaN(since.getTime())) return { error: 'Invalid since' };
  if (until && Number.isNaN(until.getTime())) return { error: 'Invalid until' };
  return { since, until };
}

function marginDateFilter(since, until) {
  /** @type {{ gte?: Date, lte?: Date }} */
  const f = {};
  if (since) f.gte = since;
  if (until) f.lte = until;
  return Object.keys(f).length ? { marginCalculatedAt: f } : {};
}

/**
 * @param {{ since?: Date | null, until?: Date | null }} range
 */
export async function getMarginAnalyticsSummary(range = {}) {
  const { since = null, until = null } = range;
  const rows = await prisma.paymentCheckout.findMany({
    where: {
      orderStatus: FULFILLED,
      marginNetUsdCents: { not: null },
      ...marginDateFilter(since, until),
    },
    select: {
      marginSellUsdCents: true,
      marginProviderCostUsdCents: true,
      marginPaymentFeeUsdCents: true,
      marginNetUsdCents: true,
      marginPercentBp: true,
    },
  });
  const summary = aggregateMarginSummaryFromRows(rows);
  const negativeCount = rows.filter(
    (r) => r.marginNetUsdCents != null && r.marginNetUsdCents < 0,
  ).length;
  const lowBp = Number(process.env.MARGIN_LOW_ROUTE_BP ?? 500);
  const thresholdBp = Number.isFinite(lowBp) ? lowBp : 500;
  const lowMarginCount = rows.filter(
    (r) =>
      r.marginNetUsdCents != null &&
      r.marginNetUsdCents >= 0 &&
      r.marginPercentBp != null &&
      r.marginPercentBp < thresholdBp,
  ).length;
  return {
    ...summary,
    negativeMarginOrders: negativeCount,
    lowMarginOrders: lowMarginCount,
    thresholdNetToSellBp: thresholdBp,
  };
}

export async function getMarginByOperator(range = {}) {
  const { since = null, until = null } = range;
  const rows = await prisma.paymentCheckout.groupBy({
    by: ['operatorKey'],
    where: {
      orderStatus: FULFILLED,
      marginNetUsdCents: { not: null },
      ...marginDateFilter(since, until),
    },
    _count: { _all: true },
    _sum: {
      marginSellUsdCents: true,
      marginNetUsdCents: true,
      marginProviderCostUsdCents: true,
      marginPaymentFeeUsdCents: true,
    },
  });
  return rows
    .map((r) => {
      const sell = r._sum.marginSellUsdCents ?? 0;
      const net = r._sum.marginNetUsdCents ?? 0;
      return {
        operatorKey: r.operatorKey ?? 'unknown',
        orderCount: r._count._all,
        sellUsd: Math.round(sell) / 100,
        netMarginUsd: Math.round(net) / 100,
        blendedNetMarginPercentOfSell:
          sell > 0 ? Math.round((net / sell) * 1_000_000) / 10000 : null,
      };
    })
    .sort((a, b) => b.orderCount - a.orderCount);
}

export async function getMarginByDestination(range = {}) {
  const { since = null, until = null } = range;
  const rows = await prisma.paymentCheckout.findMany({
    where: {
      orderStatus: FULFILLED,
      marginNetUsdCents: { not: null },
      ...marginDateFilter(since, until),
    },
    select: {
      operatorKey: true,
      marginSellUsdCents: true,
      marginNetUsdCents: true,
    },
  });
  /** @type {Map<string, { orderCount: number, sell: number, net: number }>} */
  const map = new Map();
  for (const r of rows) {
    const dest = inferDestinationCountry(r.operatorKey);
    const cur = map.get(dest) ?? { orderCount: 0, sell: 0, net: 0 };
    cur.orderCount += 1;
    cur.sell += r.marginSellUsdCents ?? 0;
    cur.net += r.marginNetUsdCents ?? 0;
    map.set(dest, cur);
  }
  return [...map.entries()]
    .map(([destinationCountry, v]) => ({
      destinationCountry,
      orderCount: v.orderCount,
      sellUsd: Math.round(v.sell) / 100,
      netMarginUsd: Math.round(v.net) / 100,
      blendedNetMarginPercentOfSell:
        v.sell > 0 ? Math.round((v.net / v.sell) * 1_000_000) / 10000 : null,
    }))
    .sort((a, b) => b.orderCount - a.orderCount);
}

export async function getMarginByProductType(range = {}) {
  const { since = null, until = null } = range;
  const rows = await prisma.paymentCheckout.findMany({
    where: {
      orderStatus: FULFILLED,
      marginNetUsdCents: { not: null },
      ...marginDateFilter(since, until),
    },
    select: {
      packageId: true,
      marginSellUsdCents: true,
      marginNetUsdCents: true,
    },
  });
  /** @type {Map<string, { orderCount: number, sell: number, net: number }>} */
  const map = new Map();
  for (const r of rows) {
    const pt = inferProductType(r.packageId);
    const cur = map.get(pt) ?? { orderCount: 0, sell: 0, net: 0 };
    cur.orderCount += 1;
    cur.sell += r.marginSellUsdCents ?? 0;
    cur.net += r.marginNetUsdCents ?? 0;
    map.set(pt, cur);
  }
  return [...map.entries()]
    .map(([productType, v]) => ({
      productType,
      orderCount: v.orderCount,
      sellUsd: Math.round(v.sell) / 100,
      netMarginUsd: Math.round(v.net) / 100,
      blendedNetMarginPercentOfSell:
        v.sell > 0 ? Math.round((v.net / v.sell) * 1_000_000) / 10000 : null,
    }))
    .sort((a, b) => b.orderCount - a.orderCount);
}

/**
 * Routes with negative net margin or below global low threshold.
 * @param {object} opts
 * @param {Date | null} [opts.since]
 * @param {Date | null} [opts.until]
 * @param {number} [opts.limit]
 */
export async function getLowAndNegativeMarginRoutes(opts = {}) {
  const {
    since = null,
    until = null,
    limit = 50,
  } = opts;
  const thresholdBp = env.marginLowRouteBp;
  const take = Math.min(100, Math.max(1, Math.floor(Number(limit) || 50)));

  const baseWhere = {
    orderStatus: FULFILLED,
    marginNetUsdCents: { not: null },
    ...marginDateFilter(since, until),
  };

  const negative = await prisma.paymentCheckout.findMany({
    where: {
      ...baseWhere,
      marginNetUsdCents: { lt: 0 },
    },
    orderBy: { marginNetUsdCents: 'asc' },
    take,
    select: {
      id: true,
      operatorKey: true,
      packageId: true,
      marginSellUsdCents: true,
      marginProviderCostUsdCents: true,
      marginPaymentFeeUsdCents: true,
      marginNetUsdCents: true,
      marginPercentBp: true,
      marginProviderCostSource: true,
      marginCalculatedAt: true,
    },
  });

  const low = await prisma.paymentCheckout.findMany({
    where: {
      ...baseWhere,
      marginNetUsdCents: { gte: 0 },
      marginPercentBp: { lt: thresholdBp },
    },
    orderBy: { marginPercentBp: 'asc' },
    take,
    select: {
      id: true,
      operatorKey: true,
      packageId: true,
      marginSellUsdCents: true,
      marginProviderCostUsdCents: true,
      marginPaymentFeeUsdCents: true,
      marginNetUsdCents: true,
      marginPercentBp: true,
      marginProviderCostSource: true,
      marginCalculatedAt: true,
    },
  });

  function toDto(r) {
    return {
      orderIdSuffix: String(r.id).slice(-10),
      operatorKey: r.operatorKey,
      productType: inferProductType(r.packageId),
      destinationCountry: inferDestinationCountry(r.operatorKey),
      sellUsd: (r.marginSellUsdCents ?? 0) / 100,
      providerCostUsd: (r.marginProviderCostUsdCents ?? 0) / 100,
      paymentFeeUsd: (r.marginPaymentFeeUsdCents ?? 0) / 100,
      netMarginUsd: (r.marginNetUsdCents ?? 0) / 100,
      netToSellRatioPercent:
        r.marginPercentBp != null
          ? Math.round(r.marginPercentBp) / 100
          : null,
      providerCostSource: r.marginProviderCostSource,
      marginCalculatedAt: r.marginCalculatedAt,
    };
  }

  return {
    thresholdNetToSellBp: thresholdBp,
    negativeMargin: negative.map(toDto),
    lowMargin: low.map(toDto),
  };
}

export function parseMarginRangeFromQuery(query) {
  const p = parseSinceUntil(query);
  if (p.error) return { error: p.error };
  return { since: p.since, until: p.until };
}
