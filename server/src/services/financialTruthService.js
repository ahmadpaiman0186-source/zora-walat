import { prisma } from '../db.js';
import { env } from '../config/env.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { FINANCIAL_ANOMALY } from '../constants/financialAnomaly.js';
import { recordPhase1FinancialAnomalyCodes } from '../lib/opsMetrics.js';
import { emitPhase1OperationalEvent } from '../lib/phase1OperationalEvents.js';
/**
 * @param {unknown} existingJson
 * @param {string[]} newCodes
 * @returns {string[]}
 */
export function mergeAnomalyCodes(existingJson, newCodes) {
  const ex = Array.isArray(existingJson)
    ? existingJson.filter((x) => typeof x === 'string')
    : [];
  return [...new Set([...ex, ...newCodes])].sort();
}

/**
 * Sanitized fulfillment snapshot for support / reconciliation (no raw PANs, no secrets).
 * @param {import('@prisma/client').PaymentCheckout} order
 * @param {object} providerResult normalized fulfillment result
 */
export function buildFulfillmentTruthSnapshot(order, providerResult) {
  const rs =
    providerResult?.responseSummary && typeof providerResult.responseSummary === 'object'
      ? providerResult.responseSummary
      : {};
  const req =
    providerResult?.requestSummary && typeof providerResult.requestSummary === 'object'
      ? providerResult.requestSummary
      : {};
  return {
    providerKey: providerResult.providerKey ?? null,
    providerReference: providerResult.providerReference ?? null,
    destinationOperatorKey: order.operatorKey ?? null,
    recipientNationalSuffix:
      order.recipientNational && String(order.recipientNational).length >= 4
        ? `***${String(order.recipientNational).slice(-4)}`
        : null,
    deliveryStatusSource:
      providerResult.providerKey === 'mock'
        ? 'mock_provider'
        : 'reloadly_topup_api',
    packageId: order.packageId ?? null,
    sanitizedResponseSummary: rs,
    requestMode: req.mode ?? null,
  };
}

/**
 * @param {import('@prisma/client').PaymentCheckout} order
 * @returns {{ profitCents: number, marginBp: number, providerCentsUsed: number, stripeFeeCentsUsed: number }}
 */
export function computeRefinedProfitAndMarginBp(order) {
  const finalCents = Math.max(0, Math.floor(Number(order.amountUsdCents) || 0));
  const fx = Math.max(0, Math.floor(Number(order.fxBufferUsdCents) || 0));
  const risk = Math.max(0, Math.floor(Number(order.riskBufferUsdCents) || 0));
  const lockedProvider = Math.max(0, Math.floor(Number(order.providerCostUsdCents) || 0));
  const actualProvider =
    order.providerCostActualUsdCents != null
      ? Math.max(0, Math.floor(Number(order.providerCostActualUsdCents)))
      : null;
  const providerUsed = actualProvider != null ? actualProvider : lockedProvider;

  const stripeActual = order.stripeFeeActualUsdCents;
  const stripeEst = order.stripeFeeEstimateUsdCents;
  const stripeUsed =
    stripeActual != null
      ? Math.max(0, Math.floor(Number(stripeActual)))
      : Math.max(0, Math.floor(Number(stripeEst) || 0));

  const profitCents = finalCents - providerUsed - stripeUsed - fx - risk;
  const marginBp =
    finalCents > 0 ? Math.floor((profitCents * 10000) / finalCents) : 0;

  return {
    profitCents,
    marginBp,
    providerCentsUsed: providerUsed,
    stripeFeeCentsUsed: stripeUsed,
  };
}

/**
 * Deterministic anomaly set from current row state (re-run safe).
 * @param {import('@prisma/client').PaymentCheckout} order
 */
export function collectFinancialAnomalyCodes(order) {
  const codes = [];

  const finalCents = Math.max(0, Math.floor(Number(order.amountUsdCents) || 0));
  const btAmt = order.stripeBalanceTransactionAmountCents;
  if (
    btAmt != null &&
    Number.isFinite(btAmt) &&
    btAmt !== finalCents
  ) {
    codes.push(FINANCIAL_ANOMALY.STRIPE_AMOUNT_MISMATCH);
  }

  const est = order.stripeFeeEstimateUsdCents;
  const act = order.stripeFeeActualUsdCents;
  if (
    est != null &&
    act != null &&
    Number.isFinite(est) &&
    Number.isFinite(act)
  ) {
    const delta = Math.abs(act - est);
    const tolCents = Math.max(
      env.financialTruthStripeFeeToleranceCents,
      Math.round((est * env.financialTruthStripeFeeToleranceRatioBps) / 10000),
    );
    if (delta > tolCents) {
      codes.push(FINANCIAL_ANOMALY.STRIPE_FEE_DIVERGENCE);
    }
  }

  const delivered =
    order.orderStatus === ORDER_STATUS.DELIVERED ||
    order.orderStatus === ORDER_STATUS.FULFILLED;

  const { profitCents, marginBp } = computeRefinedProfitAndMarginBp(order);

  const minBp = Math.round(env.phase1MinMarginPercent * 100);

  if (delivered) {
    if (marginBp < minBp) {
      codes.push(FINANCIAL_ANOMALY.LOW_MARGIN);
    }
    if (profitCents <= 0) {
      codes.push(FINANCIAL_ANOMALY.NEGATIVE_MARGIN);
    }

    const hasRef =
      order.fulfillmentProviderReference != null &&
      String(order.fulfillmentProviderReference).trim() !== '';
    if (!hasRef) {
      codes.push(FINANCIAL_ANOMALY.PROVIDER_REFERENCE_MISSING);
    }

    const pKey = order.fulfillmentProviderKey ?? '';
    const isReloadly = String(pKey).toLowerCase() === 'reloadly';
    const isMock = String(pKey).toLowerCase() === 'mock';
    if (
      isReloadly &&
      order.providerCostActualUsdCents == null
    ) {
      codes.push(FINANCIAL_ANOMALY.PROVIDER_COST_UNVERIFIED);
    }
    if (isMock && order.providerCostActualUsdCents == null) {
      /* mock has no settlement cost — not flagged as UNVERIFIED */
    }
  }

  return [...new Set(codes)].sort();
}

/**
 * Recompute refined margin + anomaly flags from current DB state.
 * Idempotent; safe to call after Stripe fee capture and/or fulfillment.
 *
 * @param {string} orderId
 * @param {{ info?: Function, warn?: Function }} [log]
 * @param {{ prisma?: import('@prisma/client').PrismaClient }} [options]
 */
export async function recomputeFinancialTruthForPaymentCheckout(orderId, log, options = {}) {
  const db = options.prisma ?? prisma;
  const order = await db.paymentCheckout.findUnique({
    where: { id: orderId },
  });
  if (!order) return undefined;

  const { profitCents, marginBp } = computeRefinedProfitAndMarginBp(order);
  const codes = collectFinancialAnomalyCodes(order);

  const prevCodes = Array.isArray(order.financialAnomalyCodes)
    ? order.financialAnomalyCodes.filter((x) => typeof x === 'string').sort()
    : [];
  const prevKey = prevCodes.join('|');
  const nextKey = codes.join('|');
  const anomalySetChanged = prevKey !== nextKey;

  await db.paymentCheckout.update({
    where: { id: orderId },
    data: {
      refinedActualNetMarginBp: marginBp,
      financialAnomalyCodes: codes,
      financialTruthComputedAt: new Date(),
    },
  });

  if (codes.length > 0 && anomalySetChanged) {
    recordPhase1FinancialAnomalyCodes(codes);
    emitPhase1OperationalEvent('financial_anomaly_detected', {
      orderIdSuffix: String(orderId).slice(-12),
      anomalyCount: codes.length,
      anomalyCodes: codes,
    });
  }

  log?.info?.(
    {
      financialTruth: 'recomputed',
      orderId,
      refinedProfitCents: profitCents,
      refinedActualNetMarginBp: marginBp,
      anomalyCount: codes.length,
      anomalyCodes: codes,
      providerCostTruthSource: order.providerCostTruthSource,
      usesActualProviderCost: order.providerCostActualUsdCents != null,
      usesActualStripeFee: order.stripeFeeActualUsdCents != null,
    },
    'financial_truth',
  );

  return { refinedActualNetMarginBp: marginBp, codes };
}

/**
 * Non-blocking financial truth recompute.
 * @param {string} orderId
 * @param {{ info?: Function, warn?: Function }} [log]
 */
export function scheduleFinancialTruthRecompute(orderId, log) {
  if (!orderId) return;
  setImmediate(() => {
    void recomputeFinancialTruthForPaymentCheckout(orderId, log).catch((err) => {
      log?.warn?.(
        {
          financialTruth: 'recompute_failed',
          orderId,
          err: String(err?.message ?? err).slice(0, 200),
        },
        'financial_truth',
      );
    });
  });
}
