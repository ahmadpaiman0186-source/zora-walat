/**
 * L-77 wired-path safety dry-run scenarios — deterministic local fixtures.
 */
import { healthyPaymentProviderAudit } from '../noPayNoServiceProof/bundles.mjs';
import {
  duplicateProviderExecutionAttempt,
  duplicateProviderExecutionSeed,
  duplicateWebhookAttempt,
  duplicateWebhookSeed,
  missingIdempotencyKeyMaterial,
} from '../idempotencyKernel/attempts.mjs';

/** @typedef {import('../../src/reliability/wiredPathSafetyDryRun/types.js').WiredPathDryRunInput & { expectedFulfillmentIntentAllowed: boolean }} WiredPathScenario */

/** @type {WiredPathScenario} */
export const healthyWiredPathFirstWebhook = {
  scenarioId: 'healthy_wired_path_first_webhook',
  boundary: 'webhook_to_fulfillment',
  idempotencyAttempt: {
    attemptKind: 'webhook',
    keyMaterial: {
      scope: 'webhook',
      source: 'stripe',
      type: 'checkout.session.completed',
      eventId: 'evt_wire_healthy_001',
    },
    entityIds: { eventId: 'evt_wire_healthy_001', orderId: 'ord_wire_healthy' },
    paymentState: { stripePaid: true, orderStatus: 'PROCESSING' },
    providerState: { proofPresent: true, providerReference: 'RLY_OK_100' },
  },
  registrySeeds: [],
  npnsBundle: {
    ...healthyPaymentProviderAudit,
    entityIds: { orderId: 'ord_wire_healthy', userId: 'user_ok' },
  },
  expectedFulfillmentIntentAllowed: true,
};

/** @type {WiredPathScenario} */
export const unpaidWebhookBlocksFulfillment = {
  scenarioId: 'unpaid_webhook_blocks_fulfillment',
  boundary: 'webhook_to_fulfillment',
  idempotencyAttempt: {
    attemptKind: 'webhook',
    keyMaterial: {
      scope: 'webhook',
      source: 'stripe',
      type: 'checkout.session.completed',
      eventId: 'evt_wire_unpaid_001',
    },
    entityIds: { eventId: 'evt_wire_unpaid_001', orderId: 'ord_wire_unpaid' },
    paymentState: { stripePaid: false, orderStatus: 'PENDING' },
  },
  registrySeeds: [],
  npnsBundle: {
    entityIds: { orderId: 'ord_wire_unpaid' },
    payment: { stripePaid: false, orderStatus: 'PENDING', webhookPaymentReceived: false },
    provider: { providerExecuted: false },
    order: { orderStatus: 'PENDING' },
  },
  expectedFulfillmentIntentAllowed: false,
};

/** @type {WiredPathScenario} */
export const duplicateWebhookBlocksFulfillment = {
  scenarioId: 'duplicate_webhook_blocks_fulfillment',
  boundary: 'webhook_to_fulfillment',
  idempotencyAttempt: duplicateWebhookAttempt,
  registrySeeds: [duplicateWebhookSeed],
  npnsBundle: {
    ...healthyPaymentProviderAudit,
    entityIds: { orderId: 'ord_wh_1' },
  },
  expectedFulfillmentIntentAllowed: false,
};

/** @type {WiredPathScenario} */
export const duplicateProviderDispatchBlocked = {
  scenarioId: 'duplicate_provider_dispatch_blocked',
  boundary: 'paid_to_provider_dispatch',
  idempotencyAttempt: duplicateProviderExecutionAttempt,
  registrySeeds: [duplicateProviderExecutionSeed],
  npnsBundle: {
    ...healthyPaymentProviderAudit,
    entityIds: { orderId: 'ord_prv_dup' },
  },
  expectedFulfillmentIntentAllowed: false,
};

/** @type {WiredPathScenario} */
export const missingKeyFailClosed = {
  scenarioId: 'missing_key_fail_closed',
  boundary: 'webhook_to_fulfillment',
  idempotencyAttempt: missingIdempotencyKeyMaterial,
  registrySeeds: [],
  npnsBundle: {
    ...healthyPaymentProviderAudit,
    entityIds: { orderId: 'ord_missing_key' },
  },
  expectedFulfillmentIntentAllowed: false,
};

/** @type {WiredPathScenario} */
export const ambiguousProviderFailClosed = {
  scenarioId: 'ambiguous_provider_fail_closed',
  boundary: 'paid_to_provider_dispatch',
  idempotencyAttempt: {
    attemptKind: 'provider_execution',
    keyMaterial: {
      scope: 'provider_attempt',
      source: 'internal',
      type: 'dispatch',
      orderId: 'ord_prv_ambig',
      attemptId: 'att_ambig_1',
    },
    entityIds: { orderId: 'ord_prv_ambig', attemptId: 'att_ambig_1' },
    paymentState: { stripePaid: true, orderStatus: 'PROCESSING' },
    providerState: { lastAttemptStatus: 'UNKNOWN', ambiguous: true },
  },
  registrySeeds: [],
  npnsBundle: {
    entityIds: { orderId: 'ord_prv_ambig' },
    payment: { stripePaid: true, orderStatus: 'PROCESSING' },
    provider: { timeout: true, ambiguous: true, lastAttemptStatus: 'UNKNOWN', providerExecuted: true },
    order: { orderStatus: 'PROCESSING' },
  },
  expectedFulfillmentIntentAllowed: false,
};

/** @type {WiredPathScenario[]} */
export const allWiredPathScenarios = [
  healthyWiredPathFirstWebhook,
  unpaidWebhookBlocksFulfillment,
  duplicateWebhookBlocksFulfillment,
  duplicateProviderDispatchBlocked,
  missingKeyFailClosed,
  ambiguousProviderFailClosed,
];
