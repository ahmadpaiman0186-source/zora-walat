/**
 * L21 — Multi-provider fallback policy (declarative; no I/O).
 *
 * Reloadly remains the primary adapter when `AIRTIME_PROVIDER=reloadly`. Mock airtime is the only
 * bundled secondary for UNAVAILABLE / outbound-blocked paths; a real second commercial provider
 * would require a new adapter module and explicit env — never implicit from payment/webhook code.
 */

import { AIRTIME_OUTCOME } from '../fulfillment/airtimeFulfillmentResult.js';

/**
 * Only `UNAVAILABLE` (config/auth/network up to reloadlyClient) may chain to mock when explicitly allowed.
 * FAILURE / PENDING_VERIFICATION / AMBIGUOUS are returned to fulfillment for retry or terminal handling — no blind fallback.
 *
 * @param {string} outcome
 * @returns {boolean}
 */
export function reloadlyOutcomeEligibleForUnavailableMockFallback(outcome) {
  return String(outcome ?? '').trim().toLowerCase() === AIRTIME_OUTCOME.UNAVAILABLE;
}

/**
 * @param {{ reloadlyAllowUnavailableMockFallback?: boolean }} envSnapshot — typically `env` from config
 */
export function explicitReloadlyMockFallbackEnabled(envSnapshot) {
  return envSnapshot?.reloadlyAllowUnavailableMockFallback === true;
}

/**
 * Local proof hook — never enables fallback in production safety gates; used with outbound drills only.
 * @param {NodeJS.ProcessEnv} processEnv
 */
export function liveSimulationProofAllowsOutboundMock(processEnv) {
  return String(processEnv?.ZW_LIVE_SIMULATION_PROOF ?? '')
    .trim()
    .toLowerCase() === 'true';
}
