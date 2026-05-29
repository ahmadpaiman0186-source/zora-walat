/**
 * In-memory snapshot for detect-only scans (no DB).
 * Operators/tests supply plain JSON-serializable records.
 */

/**
 * @typedef {object} FulfillmentAttemptRecord
 * @property {string} attemptId
 * @property {string} [status] — SUCCESS | FAILED | PENDING | ambiguous
 * @property {string} [providerReference]
 * @property {string} [providerKey] — reloadly | mock
 * @property {boolean} [ambiguous]
 * @property {boolean} [providerReportedSuccess]
 * @property {string} [createdAt] — ISO
 */

/**
 * @typedef {object} OrderSnapshotRecord
 * @property {string} orderId
 * @property {string} orderStatus — PENDING | PAID | PROCESSING | FULFILLED | FAILED | CANCELLED
 * @property {boolean} [stripePaid]
 * @property {string} [idempotencyKey]
 * @property {string} [updatedAt] — ISO
 * @property {string} [paidAt] — ISO
 * @property {FulfillmentAttemptRecord[]} [fulfillmentAttempts]
 * @property {string[]} [auditEvents] — event names present
 */

/**
 * @typedef {object} StripeWebhookEventRecord
 * @property {string} eventId
 * @property {number} [deliveryCount]
 */

/**
 * @typedef {object} WalletMismatchHint
 * @property {string} orderId
 * @property {number} checkoutAmountCents
 * @property {number} walletLedgerDeltaCents
 */

/**
 * @typedef {object} ReliabilityScanSnapshot
 * @property {string} [scanAt] — ISO; default now at scan
 * @property {OrderSnapshotRecord[]} orders
 * @property {StripeWebhookEventRecord[]} [stripeWebhookEvents]
 * @property {WalletMismatchHint[]} [walletMismatches]
 * @property {{ nodeEnv?: string, reloadlySandbox?: boolean, airtimeProvider?: string }} [environmentHints] — names/flags only
 * @property {number} [stalePendingThresholdMs]
 */

/** @param {unknown} raw */
export function normalizeSnapshot(raw) {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { orders: [], stripeWebhookEvents: [], walletMismatches: [] };
  }
  const o = /** @type {Record<string, unknown>} */ (raw);
  return {
    scanAt: typeof o.scanAt === 'string' ? o.scanAt : undefined,
    orders: Array.isArray(o.orders) ? o.orders : [],
    stripeWebhookEvents: Array.isArray(o.stripeWebhookEvents)
      ? o.stripeWebhookEvents
      : [],
    walletMismatches: Array.isArray(o.walletMismatches) ? o.walletMismatches : [],
    environmentHints:
      o.environmentHints != null && typeof o.environmentHints === 'object'
        ? o.environmentHints
        : {},
    stalePendingThresholdMs:
      typeof o.stalePendingThresholdMs === 'number'
        ? o.stalePendingThresholdMs
        : 600_000,
  };
}
