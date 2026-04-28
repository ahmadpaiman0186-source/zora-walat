/**
 * Customer-facing canonical order lifecycle (logging, runbooks, external DTOs).
 * Persisted Phase 1 rows still use `PaymentCheckout.orderStatus` (PENDING, PAID, …)
 * plus `FulfillmentAttempt.status`; this module maps and validates the unified view.
 */

export const CANONICAL_ORDER_STATUS = {
  CREATED: 'CREATED',
  PAID: 'PAID',
  QUEUED: 'QUEUED',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
};

const { CREATED, PAID, QUEUED, SENT, DELIVERED, FAILED } = CANONICAL_ORDER_STATUS;

/** Non-FAILED states that may transition to FAILED (includes post-delivery incidents). */
const MAY_FAIL = new Set([CREATED, PAID, QUEUED, SENT, DELIVERED]);

const NORMAL_EDGES = /** @type {Record<string, Set<string>>} */ ({
  [CREATED]: new Set([PAID, FAILED]),
  [PAID]: new Set([QUEUED, FAILED]),
  [QUEUED]: new Set([SENT, FAILED]),
  [SENT]: new Set([DELIVERED, FAILED]),
  [DELIVERED]: new Set([]),
  [FAILED]: new Set([]),
});

/**
 * @param {string} from
 * @param {string} to
 * @returns {{ ok: true, noop?: boolean } | { ok: false, reason: string }}
 */
export function assertCanonicalTransition(from, to) {
  if (!from || !to) {
    return { ok: false, reason: 'missing_status' };
  }
  if (from === to) {
    return { ok: true, noop: true };
  }
  if (to === FAILED) {
    if (from === FAILED) {
      return { ok: false, reason: 'already_failed' };
    }
    if (!MAY_FAIL.has(from)) {
      return { ok: false, reason: 'forbidden_fail_transition', from, to };
    }
    return { ok: true };
  }
  const allowed = NORMAL_EDGES[from];
  if (!allowed?.has(to)) {
    return { ok: false, reason: 'forbidden_transition', from, to };
  }
  return { ok: true };
}

/**
 * Derive canonical status from persisted Phase 1 rows.
 *
 * @param {{ orderStatus: string | null | undefined }} order
 * @param {{ status: string | null | undefined } | null | undefined} [attempt] — attempt #1 when known
 */
export function deriveCanonicalOrderStatus(order, attempt) {
  const os = String(order?.orderStatus ?? '').toUpperCase();
  const att = attempt ? String(attempt.status ?? '').toUpperCase() : '';

  if (os === 'PENDING') return CREATED;
  if (os === 'FAILED') return FAILED;
  if (os === 'CANCELLED') return FAILED;
  if (os === 'FULFILLED') return DELIVERED;

  if (os === 'PAID') {
    if (att === 'QUEUED') return QUEUED;
    return PAID;
  }

  if (os === 'PROCESSING') {
    if (att === 'SUCCEEDED') return DELIVERED;
    return SENT;
  }

  return CREATED;
}
