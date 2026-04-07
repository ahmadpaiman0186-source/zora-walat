/** Stripe + internal economics sign-off for Phase 1 (canonical DTO). */
export const RECONCILIATION_STATUS = Object.freeze({
  /** Delivered path, fee captured, no financial anomaly codes. */
  MATCH: 'MATCH',
  /** At least one `financialAnomalyCodes` entry on the row. */
  MISMATCH: 'MISMATCH',
  /** Not delivered yet, fee not finalized, or insufficient data to sign off. */
  UNKNOWN: 'UNKNOWN',
});
