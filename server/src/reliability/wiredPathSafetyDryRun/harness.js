/**
 * L-77 local wired-path safety dry-run harness.
 * Simulates money-path boundary using CORE-05 + CORE-06 (classify-only).
 * No Stripe, provider APIs, webhooks, DB, env, or production runtime.
 */
import {
  classifyIdempotencyAttempt,
  createIdempotencyRegistry,
  seedIdempotencyRegistry,
} from '../idempotencyKernel/index.js';
import { evaluateNoPayNoServiceDelivery } from '../noPayNoServiceProof/index.js';
import { WIRED_PATH_DRY_RUN_SCHEMA_VERSION } from './types.js';

const FULFILLMENT_ALLOW_IDEMPOTENCY = new Set(['ALLOW', 'RETRY_SAFE']);
const DELIVERY_ALLOW = 'ALLOW_DELIVERY';

/** @type {Readonly<import('./types.js').WiredPathDryRunReport['mutations']>} */
const NO_MUTATIONS = Object.freeze({
  stripe: false,
  provider: false,
  payment: false,
  webhook: false,
  db: false,
  fulfillmentScheduled: false,
});

/** @type {Readonly<import('./types.js').WiredPathDryRunReport['safety']>} */
const SAFETY_BOUNDARY = Object.freeze({
  fail_closed_by_default: true,
  dry_run_only: true,
  network_access: false,
  db_writes: false,
  external_api_calls: false,
});

/**
 * @param {import('./types.js').WiredPathDryRunInput} input
 * @returns {import('./types.js').WiredPathDryRunReport}
 */
export function runWiredPathSafetyDryRun(input) {
  const registry = createIdempotencyRegistry();
  seedIdempotencyRegistry(registry, input.registrySeeds ?? []);

  const idempotencyDecision = classifyIdempotencyAttempt(
    input.idempotencyAttempt,
    registry,
  );
  const deliveryDecision = evaluateNoPayNoServiceDelivery(input.npnsBundle);

  const fulfillmentIntentAllowed =
    FULFILLMENT_ALLOW_IDEMPOTENCY.has(idempotencyDecision.decision) &&
    deliveryDecision.decision === DELIVERY_ALLOW &&
    idempotencyDecision.mutationAllowed === false &&
    deliveryDecision.mutationAllowed === false;

  return {
    schemaVersion: WIRED_PATH_DRY_RUN_SCHEMA_VERSION,
    scenarioId: input.scenarioId,
    mode: 'local_wired_path_simulation_dry_run',
    boundary: input.boundary ?? 'webhook_to_fulfillment',
    classifyOnly: true,
    wiredSimulation: true,
    productionProof: false,
    idempotencyDecision,
    deliveryDecision,
    fulfillmentIntentAllowed,
    mutations: { ...NO_MUTATIONS },
    safety: { ...SAFETY_BOUNDARY },
  };
}

/**
 * @param {import('./types.js').WiredPathDryRunInput[]} scenarios
 */
export function runWiredPathSafetyDryRunBatch(scenarios) {
  return scenarios.map((s) => runWiredPathSafetyDryRun(s));
}
