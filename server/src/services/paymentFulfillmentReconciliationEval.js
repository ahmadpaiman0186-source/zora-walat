import { ORDER_STATUS } from '../constants/orderStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import { PAYMENT_FULFILLMENT_RECON_STATUS } from '../constants/paymentFulfillmentReconciliationStatus.js';

/**
 * Pure evaluation for Phase 1 PAID / PROCESSING rows (no I/O).
 *
 * @param {{
 *   orderStatus: string,
 *   amountUsdCents?: number | null,
 *   completedByWebhookEventId?: string | null,
 *   fulfillmentAttempts?: { attemptNumber?: number, status?: string, providerReference?: string | null, startedAt?: Date | null }[],
 *   ledgerJournalEntries?: { eventType?: string }[],
 * }} row
 * @param {{ stuckProcessingMs?: number, now?: Date }} [ctx]
 * @returns {{
 *   nextStatus: string,
 *   enqueueFulfillment: boolean,
 *   reasons: string[],
 * }}
 */
export function evaluatePaymentFulfillmentReconciliationRow(row, ctx = {}) {
  const now = ctx.now instanceof Date ? ctx.now : new Date();
  const stuckMs = Math.max(60_000, Number(ctx.stuckProcessingMs) || 120_000);
  const reasons = [];

  const os = String(row.orderStatus ?? '');
  if (os !== ORDER_STATUS.PAID && os !== ORDER_STATUS.PROCESSING) {
    return {
      nextStatus: PAYMENT_FULFILLMENT_RECON_STATUS.OK,
      enqueueFulfillment: false,
      reasons: [],
    };
  }

  const att1 =
    row.fulfillmentAttempts?.find((a) => Number(a.attemptNumber) === 1) ??
    row.fulfillmentAttempts?.[0] ??
    null;

  const hasLedger = Boolean(
    row.ledgerJournalEntries?.some(
      (e) => String(e?.eventType ?? '') === 'PAYMENT_CAPTURED',
    ),
  );

  const needsLedger =
    Math.max(0, Math.floor(Number(row.amountUsdCents) || 0)) > 0 &&
    typeof row.completedByWebhookEventId === 'string' &&
    row.completedByWebhookEventId.trim().startsWith('evt_');

  if (needsLedger && !hasLedger) {
    reasons.push('missing_payment_captured_ledger');
    return {
      nextStatus: PAYMENT_FULFILLMENT_RECON_STATUS.REQUIRED,
      enqueueFulfillment: false,
      reasons,
    };
  }

  if (!att1) {
    reasons.push('missing_fulfillment_attempt_1');
    return {
      nextStatus: PAYMENT_FULFILLMENT_RECON_STATUS.REQUIRED,
      enqueueFulfillment: false,
      reasons,
    };
  }

  const attStatus = String(att1.status ?? '');
  const ref =
    (typeof att1.providerReference === 'string' && att1.providerReference.trim()) ||
    '';

  if (os === ORDER_STATUS.PAID) {
    if (attStatus === FULFILLMENT_ATTEMPT_STATUS.FAILED) {
      reasons.push('paid_fulfillment_attempt_failed');
      return {
        nextStatus: PAYMENT_FULFILLMENT_RECON_STATUS.REQUIRED,
        enqueueFulfillment: false,
        reasons,
      };
    }
    if (attStatus === FULFILLMENT_ATTEMPT_STATUS.QUEUED) {
      return {
        nextStatus: PAYMENT_FULFILLMENT_RECON_STATUS.PENDING,
        enqueueFulfillment: false,
        reasons: ['paid_awaiting_fulfillment_claim'],
      };
    }
    if (attStatus === FULFILLMENT_ATTEMPT_STATUS.PROCESSING) {
      return {
        nextStatus: PAYMENT_FULFILLMENT_RECON_STATUS.PENDING,
        enqueueFulfillment: false,
        reasons: ['paid_fulfillment_in_flight'],
      };
    }
    return {
      nextStatus: PAYMENT_FULFILLMENT_RECON_STATUS.OK,
      enqueueFulfillment: false,
      reasons: [],
    };
  }

  /** PROCESSING */
  if (
    attStatus === FULFILLMENT_ATTEMPT_STATUS.SUCCEEDED ||
    attStatus === FULFILLMENT_ATTEMPT_STATUS.FAILED
  ) {
    reasons.push('order_processing_terminal_attempt_mismatch');
    return {
      nextStatus: PAYMENT_FULFILLMENT_RECON_STATUS.REQUIRED,
      enqueueFulfillment: false,
      reasons,
    };
  }

  if (attStatus === FULFILLMENT_ATTEMPT_STATUS.QUEUED) {
    reasons.push('processing_order_attempt_still_queued');
    return {
      nextStatus: PAYMENT_FULFILLMENT_RECON_STATUS.REQUIRED,
      enqueueFulfillment: true,
      reasons,
    };
  }

  if (attStatus === FULFILLMENT_ATTEMPT_STATUS.PROCESSING && !ref) {
    const started = att1.startedAt ? new Date(att1.startedAt).getTime() : null;
    if (started != null && now.getTime() - started > stuckMs) {
      reasons.push('processing_without_provider_reference_beyond_threshold');
      return {
        nextStatus: PAYMENT_FULFILLMENT_RECON_STATUS.REQUIRED,
        enqueueFulfillment: true,
        reasons,
      };
    }
    return {
      nextStatus: PAYMENT_FULFILLMENT_RECON_STATUS.PENDING,
      enqueueFulfillment: false,
      reasons: ['processing_awaiting_provider_reference'],
    };
  }

  return {
    nextStatus: PAYMENT_FULFILLMENT_RECON_STATUS.OK,
    enqueueFulfillment: false,
    reasons: [],
  };
}
