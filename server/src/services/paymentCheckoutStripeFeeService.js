import { prisma } from '../db.js';
import { getStripeClient } from './stripe.js';
import { recomputeFinancialTruthForPaymentCheckout } from './financialTruthService.js';
import { classifyTransactionFailure } from '../constants/transactionFailureClass.js';
import { transactionRetryDirective } from '../lib/transactionRetryPolicy.js';
import { recordMoneyPathOpsSignal } from '../lib/opsMetrics.js';

const MAX_ATTEMPTS = 6;
const RETRY_DELAYS_MS = [0, 500, 2000, 5000, 15000, 45000];

/**
 * @param {import('stripe').Stripe.BalanceTransaction | string | null | undefined} bt
 * @param {string} currency
 * @returns {{ feeCents: number, amountCents: number, netCents: number } | null}
 */
export function parseUsdBalanceTransaction(bt, currency) {
  if (bt == null) return null;
  const cur = String(currency ?? 'usd').toLowerCase();
  if (cur !== 'usd') return null;
  const obj = typeof bt === 'string' ? null : bt;
  if (!obj || typeof obj !== 'object') return null;
  const fee = Number(obj.fee);
  const amount = Number(obj.amount);
  const net = Number(obj.net);
  if (!Number.isFinite(fee) || !Number.isFinite(amount) || !Number.isFinite(net)) {
    return null;
  }
  return {
    feeCents: Math.round(fee),
    amountCents: Math.round(amount),
    netCents: Math.round(net),
  };
}

/**
 * @param {number} finalCents
 * @param {number} providerCents
 * @param {number} feeActualCents
 * @param {number} fxCents
 * @param {number} riskCents
 */
export function computeActualNetMarginBp(
  finalCents,
  providerCents,
  feeActualCents,
  fxCents,
  riskCents,
) {
  if (!Number.isFinite(finalCents) || finalCents <= 0) return 0;
  const profit =
    finalCents - providerCents - feeActualCents - fxCents - riskCents;
  return Math.floor((profit * 10000) / finalCents);
}

/**
 * Retrieve Balance Transaction for a succeeded PaymentIntent (USD only).
 * @param {import('stripe').Stripe} stripe
 * @param {string} paymentIntentId
 * @returns {Promise<{ feeCents: number, amountCents: number, netCents: number, balanceTransactionId: string } | null>}
 */
export async function fetchUsdFeeFromPaymentIntent(stripe, paymentIntentId) {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge.balance_transaction'],
  });

  const cur = String(pi.currency ?? 'usd').toLowerCase();
  if (cur !== 'usd') {
    return null;
  }

  const charge = pi.latest_charge;
  if (!charge || typeof charge === 'string') {
    return null;
  }

  let bt = charge.balance_transaction;
  if (typeof bt === 'string') {
    bt = await stripe.balanceTransactions.retrieve(bt);
  }

  const parsed = parseUsdBalanceTransaction(bt, cur);
  if (!parsed) {
    return null;
  }

  const balanceTransactionId =
    typeof bt === 'object' && bt && 'id' in bt ? String(bt.id) : '';

  return {
    ...parsed,
    balanceTransactionId,
  };
}

/**
 * Persist actual Stripe fee + actual net margin (basis points). Idempotent: only when
 * `stripeFeeActualUsdCents` is still null.
 *
 * @param {string} paymentIntentId
 * @param {{ info?: Function, warn?: Function, error?: Function }} [log]
 * @param {number} [attempt]
 * @returns {Promise<'ok' | 'skip' | 'retry' | 'missing_row'>}
 */
export async function recordPaymentCheckoutStripeFee(
  paymentIntentId,
  log,
  attempt = 0,
) {
  const stripe = getStripeClient();
  if (!stripe || !paymentIntentId) {
    return 'skip';
  }

  const row = await prisma.paymentCheckout.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
  });

  if (!row) {
    if (attempt < MAX_ATTEMPTS - 1) {
      const delay = RETRY_DELAYS_MS[attempt + 1] ?? 60_000;
      log?.info?.(
        {
          paymentCheckoutFee: 'retry_row_missing',
          paymentIntentIdSuffix: paymentIntentId.slice(-10),
          nextDelayMs: delay,
          attempt: attempt + 1,
        },
        'stripe_fee_payment_checkout',
      );
      setTimeout(() => {
        void recordPaymentCheckoutStripeFee(paymentIntentId, log, attempt + 1);
      }, delay);
      return 'retry';
    }
    log?.warn?.(
      {
        paymentCheckoutFee: 'abandon_no_row',
        paymentIntentIdSuffix: paymentIntentId.slice(-10),
      },
      'stripe_fee_payment_checkout',
    );
    return 'missing_row';
  }

  if (row.stripeFeeActualUsdCents != null) {
    recordMoneyPathOpsSignal('phase1_stripe_fee_capture_idempotent_skip');
    return 'skip';
  }

  if (String(row.currency ?? 'usd').toLowerCase() !== 'usd') {
    log?.warn?.(
      {
        paymentCheckoutFee: 'skip_non_usd',
        orderId: row.id,
      },
      'stripe_fee_payment_checkout',
    );
    return 'skip';
  }

  let feeData;
  try {
    feeData = await fetchUsdFeeFromPaymentIntent(stripe, paymentIntentId);
  } catch (e) {
    const fc = classifyTransactionFailure(e, { surface: 'stripe_fee_capture' });
    const rd = transactionRetryDirective(fc, { attempt });
    log?.warn?.(
      {
        paymentCheckoutFee: 'stripe_retrieve_failed',
        orderId: row.id,
        err: String(e?.message ?? e).slice(0, 200),
        attempt,
        transactionFailureClass: fc,
        retryMaySchedule: rd.mayScheduleRetry,
        retrySuggestedBackoffMs: rd.suggestedBackoffMs,
      },
      'stripe_fee_payment_checkout',
    );
    if (attempt < MAX_ATTEMPTS - 1) {
      const delay = RETRY_DELAYS_MS[attempt + 1] ?? 60_000;
      setTimeout(() => {
        void recordPaymentCheckoutStripeFee(paymentIntentId, log, attempt + 1);
      }, delay);
      return 'retry';
    }
    return 'skip';
  }

  if (!feeData) {
    if (attempt < MAX_ATTEMPTS - 1) {
      const delay = RETRY_DELAYS_MS[attempt + 1] ?? 60_000;
      log?.info?.(
        {
          paymentCheckoutFee: 'retry_balance_tx_pending',
          orderId: row.id,
          nextDelayMs: delay,
        },
        'stripe_fee_payment_checkout',
      );
      setTimeout(() => {
        void recordPaymentCheckoutStripeFee(paymentIntentId, log, attempt + 1);
      }, delay);
      return 'retry';
    }
    log?.warn?.(
      { paymentCheckoutFee: 'abandon_no_balance_tx', orderId: row.id },
      'stripe_fee_payment_checkout',
    );
    return 'skip';
  }

  const finalCents = row.amountUsdCents;
  const provider = row.providerCostUsdCents ?? 0;
  const fx = row.fxBufferUsdCents ?? 0;
  const risk = row.riskBufferUsdCents ?? 0;

  if (
    row.providerCostUsdCents == null ||
    row.fxBufferUsdCents == null ||
    row.riskBufferUsdCents == null
  ) {
    log?.warn?.(
      {
        paymentCheckoutFee: 'missing_pricing_columns',
        orderId: row.id,
      },
      'stripe_fee_payment_checkout',
    );
  }

  if (feeData.amountCents !== finalCents) {
    log?.warn?.(
      {
        paymentCheckoutFee: 'amount_mismatch_vs_balance_tx',
        orderId: row.id,
        rowAmountCents: finalCents,
        balanceTxAmountCents: feeData.amountCents,
      },
      'stripe_fee_payment_checkout',
    );
  }

  const feeActual = feeData.feeCents;
  const actualProfit = finalCents - provider - feeActual - fx - risk;
  const actualBp = computeActualNetMarginBp(
    finalCents,
    provider,
    feeActual,
    fx,
    risk,
  );

  const estimated = row.stripeFeeEstimateUsdCents;
  const projected = row.projectedNetMarginBp;

  const updated = await prisma.paymentCheckout.updateMany({
    where: {
      id: row.id,
      stripeFeeActualUsdCents: null,
    },
    data: {
      stripeFeeActualUsdCents: feeActual,
      actualNetMarginBp: actualBp,
      stripeBalanceTransactionAmountCents: feeData.amountCents,
    },
  });

  if (updated.count === 0) {
    return 'skip';
  }

  const truth = await recomputeFinancialTruthForPaymentCheckout(row.id, log);

  log?.info?.(
    {
      paymentCheckoutFee: 'recorded',
      orderId: row.id,
      paymentIntentIdSuffix: paymentIntentId.slice(-10),
      balanceTransactionIdSuffix: feeData.balanceTransactionId
        ? feeData.balanceTransactionId.slice(-12)
        : undefined,
      finalCents,
      feeActualCents: feeActual,
      feeEstimatedCents: estimated,
      feeDeltaCents:
        estimated != null ? feeActual - estimated : undefined,
      actualProfitCents: actualProfit,
      projectedNetMarginBp: projected,
      actualNetMarginBp: actualBp,
      marginDeltaBp:
        projected != null ? actualBp - projected : undefined,
      refinedActualNetMarginBp: truth?.refinedActualNetMarginBp,
      refinedVsActualMarginBpDelta:
        truth?.refinedActualNetMarginBp != null && actualBp != null
          ? truth.refinedActualNetMarginBp - actualBp
          : undefined,
      financialAnomalyCodes: truth?.codes,
    },
    'stripe_fee_reconciliation',
  );

  return 'ok';
}

/**
 * Non-blocking: run after webhook transaction commits; never throws to caller.
 * @param {string | null | undefined} paymentIntentId
 * @param {{ info?: Function, warn?: Function, error?: Function }} [log]
 */
export function schedulePaymentCheckoutStripeFeeCapture(paymentIntentId, log) {
  if (!paymentIntentId || typeof paymentIntentId !== 'string') return;
  setImmediate(() => {
    void recordPaymentCheckoutStripeFee(paymentIntentId, log, 0).catch(
      (err) => {
        log?.error?.(
          {
            paymentCheckoutFee: 'unexpected_error',
            err: String(err?.message ?? err).slice(0, 200),
          },
          'stripe_fee_payment_checkout',
        );
      },
    );
  });
}

/**
 * True when actual Stripe fee is already persisted — duplicate fee capture must no-op.
 * @param {{ stripeFeeActualUsdCents?: number | null } | null | undefined} row
 */
export function isStripeFeeAlreadyCaptured(row) {
  return row != null && row.stripeFeeActualUsdCents != null;
}
