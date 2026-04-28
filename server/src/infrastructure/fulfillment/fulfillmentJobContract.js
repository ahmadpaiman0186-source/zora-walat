/**
 * BullMQ job contract for Phase 1 PaymentCheckout fulfillment (`phase1FulfillmentProducer`).
 * Version field allows future payload evolution without silent misreads.
 */

/** @typedef {{ orderId: string, traceId?: string | null, v?: number }} Phase1FulfillmentJobPayload */

const JOB_SCHEMA_VERSION = 1;

/**
 * @param {unknown} data
 * @returns {{ ok: true, payload: Phase1FulfillmentJobPayload } | { ok: false, reason: string }}
 */
export function parsePhase1FulfillmentJobPayload(data) {
  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, reason: 'payload_not_object' };
  }
  const o = /** @type {Record<string, unknown>} */ (data);
  const orderId = typeof o.orderId === 'string' ? o.orderId.trim() : '';
  if (!orderId) {
    return { ok: false, reason: 'missing_orderId' };
  }
  const v = o.v == null ? 1 : Number(o.v);
  if (!Number.isFinite(v) || v !== JOB_SCHEMA_VERSION) {
    return { ok: false, reason: `unsupported_schema_v:${o.v}` };
  }
  const traceId =
    o.traceId == null
      ? null
      : typeof o.traceId === 'string'
        ? o.traceId
        : null;
  return {
    ok: true,
    payload: { orderId, traceId, v: JOB_SCHEMA_VERSION },
  };
}

export function phase1FulfillmentJobPayloadExample() {
  return { orderId: 'paychk_…', traceId: null, v: JOB_SCHEMA_VERSION };
}
