/**
 * Strip common secret / credential fields (shallow + one nested `headers` object).
 * @param {Record<string, unknown>} obj
 */
export function redactAuditPayloadSecrets(obj) {
  /** Lowercase field names only — lookup uses `String(key).toLowerCase()`. */
  const deny = new Set([
    'authorization',
    'stripesignature',
    'stripewebhooksecret',
    'stripesecretkey',
    'stripecustomersecret',
    'webhooksecret',
    'clientsecret',
    'accesstoken',
    'refreshtoken',
    'password',
    'idtoken',
    'token',
    'apikey',
    'secretkey',
    'jwt',
    'bearertoken',
    'reloadlyclientsecret',
    'reloadly_client_secret',
    'reloadly_api_secret',
    'email',
    'phone',
    'recipientnational',
    'recipientphone',
  ]);
  /**
   * @param {unknown} v
   * @param {number} depth
   * @returns {unknown}
   */
  function walk(v, depth) {
    if (v == null || depth > 8) return v;
    if (Array.isArray(v)) {
      return v.map((x) => walk(x, depth + 1));
    }
    if (typeof v !== 'object') return v;
    /** @type {Record<string, unknown>} */
    const o = /** @type {Record<string, unknown>} */ (v);
    const out = {};
    for (const [k, val] of Object.entries(o)) {
      if (deny.has(String(k).toLowerCase())) continue;
      if (val && typeof val === 'object') {
        out[k] = walk(val, depth + 1);
      } else {
        out[k] = val;
      }
    }
    return out;
  }

  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return {};
  }
  const out = walk(obj, 0);
  if (
    out &&
    typeof out === 'object' &&
    !Array.isArray(out) &&
    out.headers &&
    typeof out.headers === 'object' &&
    !Array.isArray(out.headers)
  ) {
    const h = walk(out.headers, 0);
    out.headers = h;
  }
  return /** @type {Record<string, unknown>} */ (out);
}

/**
 * Structured audit trail in `AuditLog` — never pass card numbers, tokens, or raw webhook bodies.
 * @param {import('@prisma/client').Prisma.TransactionClient | import('@prisma/client').PrismaClient} db
 */
export async function writeOrderAudit(db, { event, payload, ip }) {
  const safe = redactAuditPayloadSecrets(
    payload && typeof payload === 'object' && !Array.isArray(payload) ? { ...payload } : {},
  );
  await db.auditLog.create({
    data: {
      event: String(event),
      payload: JSON.stringify(safe),
      ip: ip ? String(ip).slice(0, 64) : null,
    },
  });
}
