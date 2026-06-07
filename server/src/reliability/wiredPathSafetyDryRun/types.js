/**
 * L-77 wired-path safety dry-run — local simulation types (no mutations).
 */

export const WIRED_PATH_DRY_RUN_SCHEMA_VERSION = 1;

/** @typedef {'webhook_to_fulfillment' | 'paid_to_provider_dispatch'} WiredPathBoundary */

/**
 * @typedef {object} WiredPathDryRunInput
 * @property {string} scenarioId
 * @property {WiredPathBoundary} [boundary]
 * @property {import('../idempotencyKernel/attemptContext.js').AttemptContext} idempotencyAttempt
 * @property {import('../idempotencyKernel/registry.js').IdempotencySeed[]} [registrySeeds]
 * @property {import('../noPayNoServiceProof/types.js').NoPayNoServiceProofBundle} npnsBundle
 */

/**
 * @typedef {object} WiredPathDryRunReport
 * @property {number} schemaVersion
 * @property {string} scenarioId
 * @property {'local_wired_path_simulation_dry_run'} mode
 * @property {WiredPathBoundary} boundary
 * @property {boolean} classifyOnly
 * @property {boolean} wiredSimulation
 * @property {boolean} productionProof
 * @property {import('../idempotencyKernel/types.js').IdempotencyDecision} idempotencyDecision
 * @property {import('../noPayNoServiceProof/types.js').DeliveryProofDecision} deliveryDecision
 * @property {boolean} fulfillmentIntentAllowed
 * @property {object} mutations
 * @property {object} safety
 */
