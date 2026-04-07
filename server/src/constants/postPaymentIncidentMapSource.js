/** How `postPaymentIncidentStatus` was resolved (audit / support). */
export const POST_PAYMENT_INCIDENT_MAP_SOURCE = Object.freeze({
  /** Stripe Charge object included `payment_intent`. */
  REFUND_CHARGE_PAYLOAD: 'REFUND_CHARGE_PAYLOAD',
  /** Dispute payload included `payment_intent`. */
  DISPUTE_PAYLOAD_PI: 'DISPUTE_PAYLOAD_PI',
  /** `payment_intent` obtained via `charges.retrieve(dispute.charge)`. */
  DISPUTE_CHARGE_LOOKUP: 'DISPUTE_CHARGE_LOOKUP',
  /** Lookup attempted but no PI resolvable (logged; row may be unchanged). */
  DISPUTE_UNMAPPED: 'DISPUTE_UNMAPPED',
});
