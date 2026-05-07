/**
 * Compare Reloadly reports row vs `PaymentCheckout` / attempt persisted intent.
 * Amount tolerance: ±2 cents (rounding / FX noise).
 */

/**
 * @param {unknown} v
 */
function digitsOnly(v) {
  return String(v ?? '').replace(/\D/g, '');
}

/**
 * @param {unknown} amountRaw
 * @returns {number | null} USD cents
 */
export function reloadlyReportAmountToUsdCents(amountRaw) {
  if (amountRaw == null) return null;
  const n = Number(amountRaw);
  if (!Number.isFinite(n)) return null;
  if (Number.isInteger(n) && Math.abs(n) > 50_000) {
    return Math.round(n);
  }
  return Math.round(n * 100);
}

/**
 * @param {Record<string, unknown>} hitRow
 */
export function extractReloadlyReportTruth(hitRow) {
  const r = hitRow && typeof hitRow === 'object' ? hitRow : {};
  const amountRaw =
    r.requestedAmount ?? r.amount ?? r.faceValue ?? r.requestedAmountUsd ?? null;
  const amountCents = reloadlyReportAmountToUsdCents(amountRaw);
  let phone = '';
  const rp = r.recipientPhone;
  if (rp && typeof rp === 'object' && rp.number != null) {
    phone = digitsOnly(rp.number);
  } else if (r.recipientPhone != null) {
    phone = digitsOnly(r.recipientPhone);
  } else if (r.phone != null) {
    phone = digitsOnly(r.phone);
  }
  const operatorId =
    r.operatorId != null
      ? String(r.operatorId).trim()
      : r.operator != null
        ? String(r.operator).trim()
        : '';
  const status = r.status != null ? String(r.status).trim() : '';
  return { amountCents: amountCents ?? null, phone, operatorId, status };
}

/**
 * @param {{
 *   amountUsdCents: number,
 *   recipientNational?: string | null,
 *   operatorKey?: string | null,
 * }} order
 * @param {{ amountCents: number | null, phone: string, operatorId: string, status: string }} remote
 * @param {{ operatorMap?: Record<string, string> }} [opts] — map checkout `operatorKey` → Reloadly numeric id string
 */
export function compareReloadlyTruthToOrder(order, remote, opts = {}) {
  /** @type {string[]} */
  const mismatches = [];

  const localCents = Math.max(0, Math.floor(Number(order.amountUsdCents) || 0));
  if (remote.amountCents != null) {
    if (Math.abs(remote.amountCents - localCents) > 2) {
      mismatches.push('amount');
    }
  }

  const localPhone = digitsOnly(order.recipientNational);
  if (remote.phone && localPhone && remote.phone !== localPhone) {
    mismatches.push('phone');
  }

  const map = opts.operatorMap && typeof opts.operatorMap === 'object' ? opts.operatorMap : {};
  const key = String(order.operatorKey ?? '').trim();
  const mapped = key && map[key] != null ? String(map[key]).trim() : '';
  const expectOp = mapped || key;
  if (remote.operatorId && expectOp && remote.operatorId !== expectOp) {
    mismatches.push('operator');
  }

  const st = String(remote.status ?? '').toUpperCase();
  if (
    st &&
    st !== 'SUCCESSFUL' &&
    st !== 'COMPLETED' &&
    st !== 'DELIVERED'
  ) {
    if (st === 'FAILED' || st === 'REFUNDED' || st === 'CANCELLED') {
      mismatches.push('status_terminal_negative');
    }
  }

  return { ok: mismatches.length === 0, mismatches };
}
