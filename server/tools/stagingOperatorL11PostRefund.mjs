/**
 * L-11 post-refund state classification (enum-only, no secrets).
 */

/**
 * @param {{
 *   postPaymentIncidentStatus: string,
 *   stripeRefundAlreadyExists: boolean | null,
 *   preflightPass?: boolean,
 *   refundExecuteAttempted?: boolean,
 * }} input
 * @returns {{
 *   state: 'STATE_A_READY_NOT_REFUNDED' | 'STATE_B_REFUND_EXISTS_WEBHOOK_PENDING' | 'STATE_C_REFUND_EXISTS_APP_NOT_UPDATED' | 'STATE_D_REFUND_EXECUTION_FAILED' | 'STATE_E_UNSAFE_BLOCKED',
 *   rootCauseCode: string,
 *   nextSafeCommand: string,
 * }}
 */
export function classifyL11RefundState(input) {
  const incident = String(input.postPaymentIncidentStatus ?? '').trim().toUpperCase();
  const stripeRefund = input.stripeRefundAlreadyExists === true;
  const incidentRefunded = incident === 'REFUNDED';

  if (incidentRefunded) {
    return {
      state: 'STATE_PASS_INCIDENT_REFUNDED',
      rootCauseCode: 'ok',
      nextSafeCommand: 'l11-post-refund-verify',
    };
  }

  if (stripeRefund && !incidentRefunded) {
    return {
      state: 'STATE_C_REFUND_EXISTS_APP_NOT_UPDATED',
      rootCauseCode: 'webhook_mirror_pending_or_failed',
      nextSafeCommand: 'l11-post-refund-verify',
    };
  }

  if (!stripeRefund && !incidentRefunded) {
    return {
      state: 'STATE_A_READY_NOT_REFUNDED',
      rootCauseCode: 'refund_not_executed',
      nextSafeCommand: 'l11-refund-execute',
    };
  }

  return {
    state: 'STATE_E_UNSAFE_BLOCKED',
    rootCauseCode: 'unknown_refund_state',
    nextSafeCommand: 'l11-stripe-diagnose',
  };
}

/**
 * Post-refund verify when Stripe shows refund but app incident not REFUNDED yet.
 * @param {boolean} stripeRefundAlreadyExists
 */
export function postRefundBlockedReason(stripeRefundAlreadyExists) {
  if (stripeRefundAlreadyExists) {
    return 'webhook_mirror_pending_charge_refunded';
  }
  return 'post_refund_verify_failed';
}
