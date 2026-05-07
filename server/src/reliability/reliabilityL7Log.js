/**
 * L7 structured reliability events — stdout JSON, no PII (orderIdSuffix only).
 */

/** @typedef {import('./failureClassifier.js').FailureClassification} FailureClassification */

const RING_MAX = 48;
/** @type {object[]} */
const recentSamples = [];

/**
 * @param {object} row
 */
export function pushReliabilityRecentSample(row) {
  recentSamples.push(row);
  while (recentSamples.length > RING_MAX) recentSamples.shift();
}

/**
 * @returns {object[]}
 */
export function getReliabilityRecentSamples() {
  return recentSamples.slice();
}

/**
 * @param {string} event
 * @param {Record<string, unknown>} fields
 */
export function emitReliabilityL7Event(event, fields) {
  const line = {
    reliabilityL7: true,
    event,
    t: new Date().toISOString(),
    ...fields,
  };
  // eslint-disable-next-line no-console -- L7 contract: structured ops line
  console.log(JSON.stringify(line));
}

/**
 * @param {Record<string, unknown>} p
 */
export function emitReliabilityFailureDetected(p) {
  emitReliabilityL7Event('reliability_failure_detected', p);
  pushReliabilityRecentSample({
    kind: 'failure',
    ...p,
  });
}

/**
 * @param {Record<string, unknown>} p
 */
export function emitReliabilityRecoveryAttempted(p) {
  emitReliabilityL7Event('reliability_recovery_attempted', p);
}

/**
 * @param {Record<string, unknown>} p
 */
export function emitReliabilityRecoverySucceeded(p) {
  emitReliabilityL7Event('reliability_recovery_succeeded', p);
}

/**
 * @param {Record<string, unknown>} p
 */
export function emitReliabilityRecoveryBlocked(p) {
  emitReliabilityL7Event('reliability_recovery_blocked', p);
}

/**
 * @param {Record<string, unknown>} p
 */
export function emitReliabilityHealthSnapshot(p) {
  emitReliabilityL7Event('reliability_health_snapshot', p);
}
