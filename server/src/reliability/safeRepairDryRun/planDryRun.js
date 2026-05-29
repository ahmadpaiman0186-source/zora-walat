import { classifyRepairSignal } from './classify.js';
import { collectRepairSignals } from './signals.js';
import { buildDryRunReport } from './types.js';

/**
 * @typedef {object} DryRunPlannerInput
 * @property {import('./signals.js').RepairSignal[]} [signals]
 * @property {import('../runtimeDoctor/types.js').DiagnosticFinding[]} [findings]
 * @property {import('../idempotencyKernel/types.js').IdempotencyDecision[]} [idempotencyDecisions]
 * @property {import('../noPayNoServiceProof/types.js').DeliveryProofDecision[]} [deliveryDecisions]
 */

/**
 * Pure dry-run planner — never mutates inputs or external state.
 * @param {DryRunPlannerInput} input
 */
export function planSafeRepairDryRun(input) {
  const frozen = {
    signals: input.signals ? [...input.signals] : [],
    findings: input.findings ? input.findings.map((f) => ({ ...f })) : [],
    idempotencyDecisions: input.idempotencyDecisions
      ? input.idempotencyDecisions.map((d) => ({ ...d }))
      : [],
    deliveryDecisions: input.deliveryDecisions
      ? input.deliveryDecisions.map((d) => ({ ...d }))
      : [],
  };

  const collected = collectRepairSignals(frozen);
  const plans = collected.map((s, i) => classifyRepairSignal(s, i));

  return buildDryRunReport(plans);
}
