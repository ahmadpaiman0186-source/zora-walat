/**
 * Structured log line for order lifecycle (Stripe + fulfillment).
 * @param {{ info?: (obj: object, msg?: string) => void } | null | undefined} log
 * @param {{
 *   orderId: string,
 *   from: string,
 *   to: string,
 *   idempotentReplay?: boolean,
 *   reason?: string | null,
 * }} fields
 */
export function emitOrderTransitionLog(log, fields) {
  const payload = {
    event: 'order_transition',
    orderId: String(fields.orderId),
    from: fields.from,
    to: fields.to,
    timestamp: new Date().toISOString(),
    ...(fields.idempotentReplay ? { idempotentReplay: true } : {}),
    ...(fields.reason ? { reason: String(fields.reason) } : {}),
  };
  if (log && typeof log.info === 'function') {
    log.info(payload, 'order_transition');
    return;
  }
  console.log(JSON.stringify(payload));
}
