/**
 * Layer 3 — fulfillment must not run without server-confirmed payment (webhook authority).
 * Delegates to existing Phase 1 gate + queue preconditions (single source of truth).
 */

import { assertPhase1FulfillmentQueuePreconditions } from '../domain/orders/phase1TransactionStateMachine.js';
import {
  OrderTransitionError,
} from '../domain/orders/orderLifecycle.js';

/**
 * @param {import('@prisma/client').PaymentCheckout | Record<string, unknown>} orderRow
 * @returns {{ ok: true } | { ok: false, reason: string, detail?: string | null }}
 */
export function evaluateFulfillmentPaymentGate(orderRow) {
  return assertPhase1FulfillmentQueuePreconditions(orderRow);
}

/**
 * @param {import('@prisma/client').PaymentCheckout | Record<string, unknown>} orderRow
 * @throws {OrderTransitionError}
 */
export function assertFulfillmentPaymentGateOrThrow(orderRow) {
  const pre = assertPhase1FulfillmentQueuePreconditions(orderRow);
  if (!pre.ok) {
    throw new OrderTransitionError(
      `Cannot queue fulfillment: ${pre.reason}${pre.detail != null ? ` (${String(pre.detail)})` : ''}`,
      'fulfillment_queue_precondition_failed',
    );
  }
}
