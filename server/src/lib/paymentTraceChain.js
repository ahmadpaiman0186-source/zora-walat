/**
 * Append a hop to `PaymentCheckout.metadata.traceChain` (bounded ring).
 * @param {unknown} metadata
 * @param {{ stage: string, traceId?: string | null, requestId?: string | null }} hop
 * @param {{ max?: number }} [opts]
 * @returns {Record<string, unknown>}
 */
export function appendPaymentTraceChainHop(metadata, hop, opts = {}) {
  const max = Math.min(Math.max(opts.max ?? 32, 4), 64);
  const base =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? /** @type {Record<string, unknown>} */ ({ ...metadata })
      : {};
  const prev = Array.isArray(base.traceChain) ? base.traceChain.filter(Boolean) : [];
  const entry = {
    t: new Date().toISOString(),
    stage: String(hop.stage ?? '').slice(0, 64),
    traceId: hop.traceId != null ? String(hop.traceId).slice(0, 128) : null,
    requestId: hop.requestId != null ? String(hop.requestId).slice(0, 128) : null,
  };
  const next = [...prev, entry].slice(-max);
  base.traceChain = next;
  return base;
}
