/**
 * Order-level margin intelligence: deterministic cents math, no customer API exposure.
 * Provider cost: Reloadly/API when present; else `pricingAmountOnlyProviderBps` on sell (catalog estimate).
 */

import { getDataSku } from './dataPricing.js';
import { getTraceId } from './requestContext.js';
import { safeSuffix } from './webTopupObservability.js';
import { bumpCounter } from './opsMetrics.js';

/** @typedef {{ traceId?: string | null, orderId?: string | null, extra?: Record<string, unknown> }} MarginLogCtx */

export const MARGIN_PROVIDER_COST_SOURCE = {
  PROVIDER_API: 'provider_api',
  ESTIMATED_FACE_BPS: 'estimated_face_bps',
};

/**
 * Stripe Checkout card-present style estimate: bps of gross + fixed per successful charge.
 * @param {number} sellUsdCents
 * @param {{ feeBps: number, fixedCents: number }} feeConfig
 */
export function estimateStripeFeeUsdCents(sellUsdCents, feeConfig) {
  const sell = Math.max(0, Math.floor(Number(sellUsdCents) || 0));
  const bps = Math.max(0, Math.min(10000, Number(feeConfig.feeBps) || 0));
  const fixed = Math.max(0, Math.floor(Number(feeConfig.fixedCents) || 0));
  return Math.ceil((sell * bps) / 10000) + fixed;
}

/**
 * Try to read a wholesale/provider cost in USD cents from Reloadly (or similar) JSON.
 * Only whitelisted numeric keys — no PII.
 * @param {unknown} responseSummary
 * @returns {number | null} USD cents
 */
export function extractProviderCostUsdCentsFromResponse(responseSummary) {
  if (!responseSummary || typeof responseSummary !== 'object') return null;
  const o = /** @type {Record<string, unknown>} */ (responseSummary);
  const keys = [
    'wholesaleAmount',
    'wholesalePrice',
    'providerCost',
    'cost',
    'operatorCost',
    'operatorAmountUSD',
    'paidToOperatorUSD',
    'pinCost',
    'costUSD',
  ];
  for (const k of keys) {
    const v = o[k];
    const cents = coUsdToCents(v);
    if (cents != null && cents >= 0) return cents;
  }
  return null;
}

/**
 * @param {unknown} v dollars as number or string "12.34"
 * @returns {number | null} cents
 */
function coUsdToCents(v) {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) {
    return Math.round(v * 100);
  }
  if (typeof v === 'string' && v.trim()) {
    const n = parseFloat(v.replace(/[$,]/g, ''));
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 100);
  }
  return null;
}

/**
 * Fallback wholesale estimate: share of face value (configure from quotes).
 * @param {number} sellUsdCents
 * @param {number} providerBps 0–10000
 */
export function estimateProviderCostFromFaceBps(sellUsdCents, providerBps) {
  const sell = Math.max(0, Math.floor(Number(sellUsdCents) || 0));
  const bps = Math.max(0, Math.min(10000, Number(providerBps) || 0));
  return Math.round((sell * bps) / 10000);
}

/**
 * netMargin = sell - provider - fee ; marginPercent = net / sell (basis points of ratio).
 * @param {object} p
 * @param {number} p.sellUsdCents
 * @param {number} p.providerCostUsdCents
 * @param {number} p.paymentFeeUsdCents
 */
export function computeNetMarginUsdCents(p) {
  const sell = Math.max(0, Math.floor(p.sellUsdCents));
  const prov = Math.max(0, Math.floor(p.providerCostUsdCents));
  const fee = Math.max(0, Math.floor(p.paymentFeeUsdCents));
  return sell - prov - fee;
}

/**
 * @param {number} netUsdCents
 * @param {number} sellUsdCents
 * @returns {number | null} basis points (10000 = 100% of sell retained as net)
 */
export function marginPercentBpFromNet(netUsdCents, sellUsdCents) {
  const sell = Math.floor(Number(sellUsdCents) || 0);
  if (sell <= 0) return null;
  const net = Number(netUsdCents);
  if (!Number.isFinite(net)) return null;
  return Math.round((net / sell) * 10000);
}

/**
 * Product slice for analytics (no pricing change).
 * @param {string | null | undefined} packageId
 */
export function inferProductType(packageId) {
  const pid = packageId != null ? String(packageId) : '';
  if (!pid) return 'unknown';
  if (getDataSku(pid)) return 'data';
  return 'airtime';
}

/** Afghan-facing operators default to AF; extend when catalog grows. */
const OPERATOR_COUNTRY = {
  roshan: 'AF',
  mtn: 'AF',
  etisalat: 'AF',
  afghanWireless: 'AF',
};

/**
 * @param {string | null | undefined} operatorKey
 */
export function inferDestinationCountry(operatorKey) {
  const k = operatorKey != null ? String(operatorKey).trim() : '';
  if (!k) return 'unknown';
  return OPERATOR_COUNTRY[k] ?? 'unknown';
}

/**
 * @param {import('@prisma/client').PaymentCheckout} order
 * @param {object} providerResult normalized fulfillment result
 * @param {{ pricingStripeFeeBps: number, pricingStripeFixedCents: number, pricingAmountOnlyProviderBps: number }} pricingEnv
 */
export function buildMarginSnapshotForDeliveredOrder(order, providerResult, pricingEnv) {
  const sellUsdCents = Math.max(0, Math.floor(Number(order.amountUsdCents) || 0));
  const paymentFeeUsdCents = estimateStripeFeeUsdCents(sellUsdCents, {
    feeBps: pricingEnv.pricingStripeFeeBps,
    fixedCents: pricingEnv.pricingStripeFixedCents,
  });

  const fromApi = extractProviderCostUsdCentsFromResponse(
    providerResult?.responseSummary,
  );
  let providerCostUsdCents;
  /** @type {string} */
  let marginProviderCostSource;

  if (fromApi != null) {
    providerCostUsdCents = fromApi;
    marginProviderCostSource = MARGIN_PROVIDER_COST_SOURCE.PROVIDER_API;
  } else {
    providerCostUsdCents = estimateProviderCostFromFaceBps(
      sellUsdCents,
      pricingEnv.pricingAmountOnlyProviderBps,
    );
    marginProviderCostSource = MARGIN_PROVIDER_COST_SOURCE.ESTIMATED_FACE_BPS;
  }

  const netUsdCents = computeNetMarginUsdCents({
    sellUsdCents,
    providerCostUsdCents,
    paymentFeeUsdCents,
  });
  const marginPercentBp = marginPercentBpFromNet(netUsdCents, sellUsdCents);

  return {
    marginSellUsdCents: sellUsdCents,
    marginProviderCostUsdCents: providerCostUsdCents,
    marginProviderCostSource,
    marginPaymentFeeUsdCents: paymentFeeUsdCents,
    marginNetUsdCents: netUsdCents,
    marginPercentBp,
  };
}

/**
 * Structured ops log + counters (ingest to metrics stack).
 * @param {'margin_calculated' | 'margin_missing_provider_cost' | 'negative_margin_detected' | 'low_margin_route_detected'} event
 * @param {MarginLogCtx} ctx
 * @param {Record<string, unknown>} [data]
 */
export function emitMarginIntelEvent(event, ctx, data = {}) {
  bumpCounter(`margin_intel__${event}`);
  const line = {
    marginIntel: true,
    event,
    traceId: ctx.traceId ?? getTraceId() ?? null,
    orderIdSuffix: ctx.orderId ? safeSuffix(ctx.orderId, 10) : null,
    t: new Date().toISOString(),
    ...data,
  };
  if (event === 'negative_margin_detected' || event === 'low_margin_route_detected') {
    console.warn(JSON.stringify(line));
  } else {
    console.log(JSON.stringify(line));
  }
}

/**
 * After snapshot built: telemetry only (caller persists).
 * @param {string} orderId
 * @param {object} snapshot from buildMarginSnapshotForDeliveredOrder
 * @param {boolean} usedApiCost
 * @param {number} lowMarginBp threshold (net/sell ratio bps)
 */
export function recordMarginIntelAfterSnapshot(orderId, snapshot, usedApiCost, lowMarginBp) {
  if (!usedApiCost) {
    emitMarginIntelEvent(
      'margin_missing_provider_cost',
      { orderId },
      {
        marginProviderCostSource: snapshot.marginProviderCostSource,
        sellCents: snapshot.marginSellUsdCents,
      },
    );
  }

  emitMarginIntelEvent(
    'margin_calculated',
    { orderId },
    {
      netCents: snapshot.marginNetUsdCents,
      marginPercentBp: snapshot.marginPercentBp,
      source: snapshot.marginProviderCostSource,
    },
  );

  if (snapshot.marginNetUsdCents < 0) {
    emitMarginIntelEvent(
      'negative_margin_detected',
      { orderId },
      {
        netCents: snapshot.marginNetUsdCents,
        marginPercentBp: snapshot.marginPercentBp,
      },
    );
  } else if (
    snapshot.marginPercentBp != null &&
    snapshot.marginPercentBp < lowMarginBp
  ) {
    emitMarginIntelEvent(
      'low_margin_route_detected',
      { orderId },
      {
        marginPercentBp: snapshot.marginPercentBp,
        thresholdBp: lowMarginBp,
      },
    );
  }
}
