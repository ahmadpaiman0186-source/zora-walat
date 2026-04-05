/**
 * Shared metadata patch for `PaymentCheckout.metadata.processingRecovery` manual queue.
 * Kept in lib to avoid import cycles (fulfillment ↔ processing recovery).
 */

/**
 * @param {unknown} metadata
 * @param {{ reason: string, traceId?: string | null, classification: string }} opts
 */
export function mergeManualRequiredMetadata(metadata, opts) {
  const base =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? { ...metadata }
      : {};
  const prev =
    base.processingRecovery &&
    typeof base.processingRecovery === 'object' &&
    !Array.isArray(base.processingRecovery)
      ? { ...base.processingRecovery }
      : {};
  prev.manualRequired = true;
  prev.manualRequiredAt = new Date().toISOString();
  prev.manualRequiredReason = opts.reason;
  prev.manualRequiredClassification = opts.classification;
  if (opts.traceId) {
    prev.manualRequiredTraceId = String(opts.traceId).slice(0, 48);
  }
  base.processingRecovery = prev;
  return base;
}
