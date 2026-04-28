/**
 * Read-only reconciliation runner — aggregates snapshot builders for ops/cron use.
 * **Never** mutates payment, ledger, or fulfillment state (fail-closed reporting).
 */

import {
  buildPhase1MoneyTruthSnapshot,
  PHASE1_RECONCILIATION_DRIFT_CODES,
} from './phase1MoneyTruthReconciliation.js';

export const PHASE1_RECONCILIATION_RUNNER_VERSION = 1;

/**
 * @param {import('@prisma/client').PaymentCheckout | Record<string, unknown>} order
 * @param {Array<Record<string, unknown>>} fulfillmentAttempts
 * @param {import('./phase1MoneyTruthReconciliation.js').StripeTruthSlice} [stripeTruth]
 */
export function runPhase1ReconciliationReport(order, fulfillmentAttempts, stripeTruth = {}) {
  const snapshot = buildPhase1MoneyTruthSnapshot(order, fulfillmentAttempts, stripeTruth);
  return {
    ...snapshot,
    runnerVersion: PHASE1_RECONCILIATION_RUNNER_VERSION,
    mutationPolicy: 'report_only',
    driftCodeCatalogVersion: PHASE1_RECONCILIATION_DRIFT_CODES.__catalogVersion,
  };
}

export { PHASE1_RECONCILIATION_DRIFT_CODES };
