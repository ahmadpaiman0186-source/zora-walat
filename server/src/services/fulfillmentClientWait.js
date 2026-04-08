import { prisma } from '../db.js';
import { isTerminalOrderStatus } from '../domain/orders/orderLifecycle.js';

/**
 * Polls until `PaymentCheckout.orderStatus` is terminal (FULFILLED / FAILED / CANCELLED) or timeout.
 * Used when fulfillment runs asynchronously (BullMQ) but HTTP must reflect eventual outcome.
 */
export async function waitForPaymentCheckoutTerminal(orderId, { timeoutMs, pollMs = 250 }) {
  const id = String(orderId ?? '').trim();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const row = await prisma.paymentCheckout.findUnique({
      where: { id },
      select: { orderStatus: true },
    });
    if (row?.orderStatus && isTerminalOrderStatus(row.orderStatus)) {
      return { ok: true, orderStatus: row.orderStatus };
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return { ok: false, reason: 'timeout_waiting_terminal_order_status' };
}
