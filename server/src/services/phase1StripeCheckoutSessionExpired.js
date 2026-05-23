import { PAYMENT_CHECKOUT_STATUS } from '../constants/paymentCheckoutStatus.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { assertTransition } from '../domain/orders/orderLifecycle.js';
import { isLikelyPaymentCheckoutId } from '../lib/paymentCheckoutId.js';
import { safeSuffix } from '../lib/webTopupObservability.js';
import { logStripeWebhookLifecycle } from '../lib/stripeWebhookLifecycleLog.js';
import { writeOrderAudit } from './orderAuditService.js';

/**
 * @param {import('stripe').Stripe.Event} event
 */
export function isHostedCheckoutSessionExpiredEvent(event) {
  if (event?.type !== 'checkout.session.expired') return false;
  const session = event.data?.object;
  if (!session || typeof session !== 'object') return false;
  const raw = session.metadata?.internalCheckoutId;
  if (raw == null || String(raw).trim() === '') return false;
  return isLikelyPaymentCheckoutId(String(raw));
}

/**
 * Cancel a pending hosted checkout when Stripe session expires. Fail-closed: never
 * downgrade PAID/PROCESSING orders; no fulfillment side effects.
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {{ session: import('stripe').Stripe.Checkout.Session, traceId?: string | null, log?: import('pino').Logger | { warn?: Function } }} opts
 * @returns {Promise<{ stateTransition: string, orderId: string | null, updated: number }>}
 */
export async function applyPhase1CheckoutSessionExpired(tx, opts) {
  const { session, traceId = null, log } = opts;
  const raw = session.metadata?.internalCheckoutId;
  if (!raw || !isLikelyPaymentCheckoutId(String(raw))) {
    if (raw && !isLikelyPaymentCheckoutId(String(raw))) {
      log?.warn?.(
        { securityEvent: 'webhook_invalid_metadata_shape' },
        'security',
      );
    }
    return { stateTransition: 'ignored_invalid_metadata', orderId: null, updated: 0 };
  }

  const orderId = String(raw);
  const row = await tx.paymentCheckout.findUnique({
    where: { id: orderId },
    select: { orderStatus: true, status: true },
  });

  if (!row) {
    return { stateTransition: 'checkout_not_found', orderId, updated: 0 };
  }

  if (row.orderStatus !== ORDER_STATUS.PENDING) {
    logStripeWebhookLifecycle('no_pay_no_service_blocked', {
      stripeEventType: 'checkout.session.expired',
      orderIdSuffix: safeSuffix(orderId, 10),
      reason: 'order_not_pending_no_cancel',
      orderStatus: row.orderStatus,
    });
    return { stateTransition: 'not_pending_noop', orderId, updated: 0 };
  }

  assertTransition(row.orderStatus, ORDER_STATUS.CANCELLED);
  const updated = await tx.paymentCheckout.updateMany({
    where: {
      id: orderId,
      orderStatus: ORDER_STATUS.PENDING,
    },
    data: {
      orderStatus: ORDER_STATUS.CANCELLED,
      status: PAYMENT_CHECKOUT_STATUS.PAYMENT_FAILED,
      cancelledAt: new Date(),
      failureReason: 'checkout_session_expired',
    },
  });

  if (updated.count > 0) {
    await writeOrderAudit(tx, {
      event: 'order_status_changed',
      payload: {
        orderId,
        to: ORDER_STATUS.CANCELLED,
        traceId,
      },
      ip: null,
    });
    return { stateTransition: 'pending_to_cancelled', orderId, updated: updated.count };
  }

  return { stateTransition: 'concurrent_update_noop', orderId, updated: 0 };
}
