/**
 * Pre-dispatch financial guardrails for WebTopupOrder (amount, currency, payment consistency, caps).
 * Evaluated before live provider calls — see `dispatchWebTopupFulfillment` and `executeWebTopupFulfillmentProviderPhase`.
 */

import {
  FINANCIAL_GUARDRAIL_CODES,
  isWebTopupFinancialGuardrailErrorCode,
} from '../../domain/topupOrder/fulfillmentErrors.js';
import { PAYMENT_STATUS, FULFILLMENT_STATUS } from '../../domain/topupOrder/statuses.js';
import { prisma } from '../../db.js';
import { env } from '../../config/env.js';

/** @typedef {import('@prisma/client').WebTopupOrder} WebTopupOrderRow */

export { FINANCIAL_GUARDRAIL_CODES, isWebTopupFinancialGuardrailErrorCode };

/**
 * Comma-separated ISO 4217 lowercase currency codes (default: usd).
 */
function envAllowedCurrencies() {
  const raw = String(env.webtopupFinancialAllowedCurrenciesCsv ?? 'usd')
    .trim()
    .toLowerCase();
  if (!raw) return new Set(['usd']);
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * @returns {{ minCents: number, maxCents: number, dailyCapCents: number, windowHours: number }}
 */
function getFinancialLimits() {
  // Frozen `env` is parsed at module load; tests and tooling set
  // `WEBTOPUP_FINANCIAL_DAILY_CAP_CENTS_PER_PHONE` on `process.env` after import.
  // Node's test runner also does not set NODE_ENV=test on test workers. When the
  // variable is present in `process.env`, use the same parse as `webtopConfig.js`.
  let dailyCapCents = env.webtopupFinancialDailyCapCentsPerPhone;
  const dailyCapRaw = process.env.WEBTOPUP_FINANCIAL_DAILY_CAP_CENTS_PER_PHONE;
  if (dailyCapRaw !== undefined) {
    const dailyRaw = String(dailyCapRaw).trim();
    dailyCapCents = dailyRaw === '' ? 0 : Math.max(0, parseInt(dailyRaw, 10) || 0);
  }
  return {
    minCents: env.webtopupFinancialMinAmountCents,
    maxCents: env.webtopupFinancialMaxAmountCents,
    dailyCapCents,
    windowHours: env.webtopupFinancialDailyCapWindowHours,
  };
}

/**
 * Operator-facing hint for admin / reconciliation (no PII).
 * @param {string | null | undefined} code
 * @returns {{ code: string, repairable: boolean, summary: string } | null}
 */
export function describeFinancialGuardrailForAdmin(code) {
  if (!isWebTopupFinancialGuardrailErrorCode(code)) return null;
  const c = String(code).trim();
  switch (c) {
    case FINANCIAL_GUARDRAIL_CODES.UNPAID:
      return {
        code: c,
        repairable: true,
        summary:
          'Dispatch was blocked because payment was not confirmed paid. If payment completes, retry may succeed.',
      };
    case FINANCIAL_GUARDRAIL_CODES.INVALID_AMOUNT:
      return {
        code: c,
        repairable: false,
        summary: 'Order amount failed validation (out of bounds or invalid). Review order data and Stripe.',
      };
    case FINANCIAL_GUARDRAIL_CODES.UNSUPPORTED_CURRENCY:
      return {
        code: c,
        repairable: false,
        summary: 'Currency is not allowed for WebTopup. Review configuration and checkout.',
      };
    case FINANCIAL_GUARDRAIL_CODES.CONTRADICTORY:
      return {
        code: c,
        repairable: false,
        summary: 'Payment and fulfillment fields conflict. Manual reconciliation required.',
      };
    case FINANCIAL_GUARDRAIL_CODES.DAILY_CAP:
      return {
        code: c,
        repairable: true,
        summary:
          'Rolling per-phone volume cap would be exceeded. Retry later or adjust caps / investigate abuse.',
      };
    default:
      return {
        code: c,
        repairable: false,
        summary: 'Financial guardrail blocked dispatch.',
      };
  }
}

/**
 * @param {WebTopupOrderRow} row
 * @returns {{ ok: true } | { ok: false, code: string, messageSafe: string }}
 */
function checkContradictoryMoneyState(row) {
  const p = String(row.paymentStatus ?? '');
  const f = String(row.fulfillmentStatus ?? '');
  const hasRef =
    row.fulfillmentReference != null && String(row.fulfillmentReference).trim().length > 0;

  if (f === FULFILLMENT_STATUS.DELIVERED) {
    if (p !== PAYMENT_STATUS.PAID) {
      return {
        ok: false,
        code: FINANCIAL_GUARDRAIL_CODES.CONTRADICTORY,
        messageSafe: 'Delivered fulfillment but payment is not paid',
      };
    }
    return {
      ok: false,
      code: FINANCIAL_GUARDRAIL_CODES.CONTRADICTORY,
      messageSafe: 'Order already delivered; duplicate dispatch blocked',
    };
  }

  if (
    (p === PAYMENT_STATUS.PENDING || p === PAYMENT_STATUS.FAILED) &&
    (f === FULFILLMENT_STATUS.QUEUED ||
      f === FULFILLMENT_STATUS.PROCESSING ||
      f === FULFILLMENT_STATUS.DELIVERED)
  ) {
    return {
      ok: false,
      code: FINANCIAL_GUARDRAIL_CODES.CONTRADICTORY,
      messageSafe: 'Fulfillment progressed while payment is not confirmed',
    };
  }

  if (p === PAYMENT_STATUS.REFUNDED && f !== FULFILLMENT_STATUS.PENDING && f !== FULFILLMENT_STATUS.FAILED) {
    return {
      ok: false,
      code: FINANCIAL_GUARDRAIL_CODES.CONTRADICTORY,
      messageSafe: 'Refunded payment with active or terminal fulfillment state',
    };
  }

  if (
    (p === PAYMENT_STATUS.PENDING || p === PAYMENT_STATUS.FAILED) &&
    hasRef
  ) {
    return {
      ok: false,
      code: FINANCIAL_GUARDRAIL_CODES.CONTRADICTORY,
      messageSafe: 'Provider reference present but payment not confirmed',
    };
  }

  return { ok: true };
}

/**
 * @param {WebTopupOrderRow} row
 * @returns {{ ok: true } | { ok: false, code: string, messageSafe: string }}
 */
function checkAmountAndCurrency(row) {
  const limits = getFinancialLimits();
  const ac = row.amountCents;
  if (typeof ac !== 'number' || !Number.isInteger(ac) || ac < limits.minCents || ac > limits.maxCents) {
    return {
      ok: false,
      code: FINANCIAL_GUARDRAIL_CODES.INVALID_AMOUNT,
      messageSafe: `amountCents must be between ${limits.minCents} and ${limits.maxCents}`,
    };
  }

  const cur = String(row.currency ?? '')
    .trim()
    .toLowerCase();
  if (!/^[a-z]{3}$/.test(cur)) {
    return {
      ok: false,
      code: FINANCIAL_GUARDRAIL_CODES.UNSUPPORTED_CURRENCY,
      messageSafe: 'Currency must be a 3-letter ISO code',
    };
  }

  const allowed = envAllowedCurrencies();
  if (!allowed.has(cur)) {
    return {
      ok: false,
      code: FINANCIAL_GUARDRAIL_CODES.UNSUPPORTED_CURRENCY,
      messageSafe: 'Currency not allowed for WebTopup',
    };
  }

  return { ok: true };
}

/**
 * @param {WebTopupOrderRow} row
 * @returns {Promise<{ ok: true } | { ok: false, code: string, messageSafe: string }>}
 */
async function checkDailyCap(row) {
  const limits = getFinancialLimits();
  if (limits.dailyCapCents <= 0) return { ok: true };
  const hash = row.phoneAnalyticsHash;
  if (!hash || !String(hash).trim()) {
    return { ok: true };
  }

  const since = new Date(Date.now() - limits.windowHours * 3600 * 1000);
  const agg = await prisma.webTopupOrder.aggregate({
    where: {
      phoneAnalyticsHash: String(hash).trim(),
      paymentStatus: PAYMENT_STATUS.PAID,
      createdAt: { gte: since },
      ...(row.id ? { id: { not: String(row.id) } } : {}),
    },
    _sum: { amountCents: true },
  });

  const prior = agg._sum.amountCents ?? 0;
  const total = prior + row.amountCents;
  if (total > limits.dailyCapCents) {
    return {
      ok: false,
      code: FINANCIAL_GUARDRAIL_CODES.DAILY_CAP,
      messageSafe: `Rolling ${limits.windowHours}h paid volume for this destination exceeds configured cap`,
    };
  }

  return { ok: true };
}

/**
 * Full financial evaluation before provider dispatch.
 * @param {WebTopupOrderRow} row
 * @param {{ traceId?: string | null }} [_ctx]
 * @returns {Promise<{ ok: true } | { ok: false, code: string, messageSafe: string }>}
 */
export async function evaluateWebTopupFinancialGuardrails(row, _ctx = {}) {
  const contra = checkContradictoryMoneyState(row);
  if (!contra.ok) return contra;

  if (row.paymentStatus !== PAYMENT_STATUS.PAID) {
    return {
      ok: false,
      code: FINANCIAL_GUARDRAIL_CODES.UNPAID,
      messageSafe: 'Order is not paid; fulfillment dispatch blocked',
    };
  }

  const pi = row.paymentIntentId;
  if (pi == null || !String(pi).trim()) {
    return {
      ok: false,
      code: FINANCIAL_GUARDRAIL_CODES.CONTRADICTORY,
      messageSafe: 'Paid order missing paymentIntentId',
    };
  }

  const ac = checkAmountAndCurrency(row);
  if (!ac.ok) return ac;

  const cap = await checkDailyCap(row);
  if (!cap.ok) return cap;

  return { ok: true };
}
