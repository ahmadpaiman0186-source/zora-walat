/**
 * Static + row-shape gates for Phase 1 (PaymentCheckout) Reloadly **sandbox** dispatch proof.
 * No provider HTTP — safe for unit tests and dry-run scripts.
 */
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { FULFILLMENT_ATTEMPT_STATUS } from '../constants/fulfillmentAttemptStatus.js';
import { env } from '../config/env.js';
import { isReloadlyConfigured } from '../services/reloadlyClient.js';

/**
 * @returns {{
 *   airtimeProviderReloadly: boolean,
 *   reloadlySandbox: boolean,
 *   reloadlyCredentialsConfigured: boolean,
 * }}
 */
export function getPhase1ReloadlySandboxEnvGate() {
  const airtimeProviderReloadly =
    String(process.env.AIRTIME_PROVIDER ?? '')
      .trim()
      .toLowerCase() === 'reloadly';
  return {
    airtimeProviderReloadly,
    reloadlySandbox: env.reloadlySandbox === true,
    reloadlyCredentialsConfigured: isReloadlyConfigured(),
  };
}

/**
 * @param {import('@prisma/client').PaymentCheckout | null} order
 * @param {import('@prisma/client').FulfillmentAttempt | null} queuedAttempt — must be QUEUED row or null
 * @returns {string[]}
 */
export function collectPhase1ReloadlySandboxBlockers(order, queuedAttempt) {
  const gate = getPhase1ReloadlySandboxEnvGate();
  /** @type {string[]} */
  const blockers = [];

  if (!gate.airtimeProviderReloadly) {
    blockers.push(
      `[environment] AIRTIME_PROVIDER must be "reloadly" (currently "${String(process.env.AIRTIME_PROVIDER ?? 'mock').trim() || 'mock'}").`,
    );
  }
  if (!gate.reloadlySandbox) {
    blockers.push(
      '[environment] RELOADLY_SANDBOX must be true (or 1 / yes) for labeled sandbox dispatch proof.',
    );
  }
  if (!gate.reloadlyCredentialsConfigured) {
    blockers.push('[environment] RELOADLY_CLIENT_ID / RELOADLY_CLIENT_SECRET missing or empty.');
  }

  const map = env.reloadlyOperatorMap ?? {};
  if (order && typeof order.operatorKey === 'string' && order.operatorKey.trim()) {
    const key = order.operatorKey.trim();
    const id = map[key];
    if (id == null || String(id).trim() === '') {
      blockers.push(
        `[operator] reloadlyOperatorMap has no numeric operator id for operatorKey "${key}" (merge RELOADLY_OPERATOR_MAP_JSON with defaults).`,
      );
    }
  } else if (order) {
    blockers.push('[order] operatorKey is missing — cannot build Reloadly payload.');
  }

  if (!order) {
    blockers.push('[order] PaymentCheckout not found.');
    return blockers;
  }

  if (order.orderStatus !== ORDER_STATUS.PAID) {
    blockers.push(
      `[order] orderStatus must be PAID to claim fulfillment (currently "${order.orderStatus}").`,
    );
  }

  if (!queuedAttempt) {
    blockers.push(
      '[attempt] No QUEUED FulfillmentAttempt — nothing to claim (already PROCESSING/SUCCEEDED/FAILED or not created).',
    );
  }

  return blockers;
}

/**
 * @param {boolean} blockersEmpty
 * @returns {string}
 */
export function phase1SandboxDispatchNextAction(blockersEmpty) {
  return blockersEmpty
    ? 'Run with --execute to call processFulfillmentForOrder once (same path as fulfillment worker).'
    : 'Fix blockers; use --dry-run to re-check without provider HTTP.';
}
