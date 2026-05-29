/**
 * CORE-08 safe repair dry-run engine (plan only — apply NOT ENABLED).
 */

export { CORE08_APPROVAL_PHRASE, classifyRepairSignal } from './classify.js';
export { planSafeRepairDryRun } from './planDryRun.js';
export {
  collectRepairSignals,
  signalFromDeliveryDecision,
  signalFromDoctorFinding,
  signalFromIdempotencyDecision,
} from './signals.js';
export {
  buildDryRunReport,
  createRepairPlan,
  DRY_RUN_SCHEMA_VERSION,
  REPAIR_CLASS,
} from './types.js';
