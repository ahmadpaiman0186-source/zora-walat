/**
 * WebTopup money-path reconciliation — stable category codes for operators and automation.
 * Severity: info < low < medium < high < critical
 */

/** @typedef {'info'|'low'|'medium'|'high'|'critical'} WebtopReconSeverity */

export const WEBTOPUP_RECON_CATEGORY = {
  CONSISTENT_PAID_AND_DELIVERED: 'consistent_paid_and_delivered',
  PAID_BUT_NOT_FULFILLED: 'paid_but_not_fulfilled',
  FULFILLED_BUT_PAYMENT_NOT_CONFIRMED: 'fulfilled_but_payment_not_confirmed',
  PAID_BUT_PROVIDER_REFERENCE_MISSING: 'paid_but_provider_reference_missing',
  FULFILLMENT_FAILED_AFTER_PAYMENT: 'fulfillment_failed_after_payment',
  STALE_PENDING_AFTER_PAYMENT: 'stale_pending_after_payment',
  STALE_PROCESSING: 'stale_processing',
  AMOUNT_OR_CURRENCY_MISMATCH: 'amount_or_currency_mismatch',
  WEBHOOK_PAYMENT_MISMATCH: 'webhook_payment_mismatch',
  DUPLICATE_OR_CONTRADICTORY_TERMINAL_STATE: 'duplicate_or_contradictory_terminal_state',
  INSUFFICIENT_EVIDENCE: 'insufficient_evidence',
  CONSISTENT_NON_TERMINAL: 'consistent_non_terminal',
};

/**
 * @type {Record<string, { severity: WebtopReconSeverity, repairable: boolean, explanation: string }>}
 */
export const WEBTOPUP_RECON_CATEGORY_META = {
  [WEBTOPUP_RECON_CATEGORY.CONSISTENT_PAID_AND_DELIVERED]: {
    severity: 'info',
    repairable: false,
    explanation:
      'Payment is confirmed and fulfillment reached delivered with provider evidence aligned.',
  },
  [WEBTOPUP_RECON_CATEGORY.PAID_BUT_NOT_FULFILLED]: {
    severity: 'medium',
    repairable: true,
    explanation:
      'Order is paid but fulfillment has not completed (queued, processing, or still pending dispatch).',
  },
  [WEBTOPUP_RECON_CATEGORY.FULFILLED_BUT_PAYMENT_NOT_CONFIRMED]: {
    severity: 'high',
    repairable: true,
    explanation:
      'Fulfillment shows success or provider activity but local payment status is not paid — investigate Stripe and webhooks.',
  },
  [WEBTOPUP_RECON_CATEGORY.PAID_BUT_PROVIDER_REFERENCE_MISSING]: {
    severity: 'low',
    repairable: true,
    explanation:
      'Payment is paid and fulfillment is marked delivered but no provider reference is stored — weak audit trail.',
  },
  [WEBTOPUP_RECON_CATEGORY.FULFILLMENT_FAILED_AFTER_PAYMENT]: {
    severity: 'high',
    repairable: true,
    explanation: 'Payment succeeded but fulfillment failed — customer may need refund or manual retry.',
  },
  [WEBTOPUP_RECON_CATEGORY.STALE_PENDING_AFTER_PAYMENT]: {
    severity: 'medium',
    repairable: true,
    explanation:
      'Paid order stayed in fulfillment pending without progressing beyond configured SLA — dispatch or worker may be stuck.',
  },
  [WEBTOPUP_RECON_CATEGORY.STALE_PROCESSING]: {
    severity: 'medium',
    repairable: true,
    explanation:
      'Fulfillment queued or processing longer than threshold — provider or worker may be hung.',
  },
  [WEBTOPUP_RECON_CATEGORY.AMOUNT_OR_CURRENCY_MISMATCH]: {
    severity: 'high',
    repairable: true,
    explanation:
      'Stripe PaymentIntent amount/currency/metadata does not match the WebTopupOrder row.',
  },
  [WEBTOPUP_RECON_CATEGORY.WEBHOOK_PAYMENT_MISMATCH]: {
    severity: 'high',
    repairable: true,
    explanation:
      'Stripe PaymentIntent lifecycle does not match local payment state (e.g. PI succeeded but order pending).',
  },
  [WEBTOPUP_RECON_CATEGORY.DUPLICATE_OR_CONTRADICTORY_TERMINAL_STATE]: {
    severity: 'critical',
    repairable: true,
    explanation:
      'Incompatible terminal signals on one row (e.g. delivered without paid, or conflicting timestamps).',
  },
  [WEBTOPUP_RECON_CATEGORY.INSUFFICIENT_EVIDENCE]: {
    severity: 'low',
    repairable: false,
    explanation:
      'Not enough local (or Stripe) data to classify safely — expand lookup or wait for lifecycle events.',
  },
  [WEBTOPUP_RECON_CATEGORY.CONSISTENT_NON_TERMINAL]: {
    severity: 'info',
    repairable: false,
    explanation: 'Order is in a normal non-terminal checkout or pre-payment state.',
  },
};
