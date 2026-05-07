/**
 * Shared sanitization for Phase 1 observability + critical alerts (no I/O).
 */

const SECRET_PATTERN =
  /\b(sk_live_|sk_test_|rk_live_|rk_test_|whsec_|RELOADLY_CLIENT_SECRET|RELOADLY_CLIENT_ID)\b/i;

/**
 * @param {unknown} v
 * @param {number} depth
 * @returns {unknown}
 */
export function sanitizePhase1ObservabilityValue(v, depth = 0) {
  if (depth > 5) return '[max_depth]';
  if (v == null) return v;
  if (typeof v === 'boolean' || typeof v === 'number') return v;
  if (typeof v === 'string') {
    const s = v.length > 400 ? `${v.slice(0, 400)}…` : v;
    if (SECRET_PATTERN.test(s)) return '[redacted_secret_pattern]';
    if (
      /\b(sk_live_|sk_test_|rk_live_|rk_test_|whsec_[a-zA-Z0-9])/i.test(s)
    ) {
      return '[redacted_secret_pattern]';
    }
    return s;
  }
  if (Array.isArray(v)) {
    return v.slice(0, 40).map((x) => sanitizePhase1ObservabilityValue(x, depth + 1));
  }
  if (typeof v !== 'object') return '[unsupported]';
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, val] of Object.entries(v)) {
    const kl = k.toLowerCase();
    if (kl === 'emailverified' || kl === 'email_verified' || kl === 'isemailverified') {
      out[k] = sanitizePhase1ObservabilityValue(val, depth + 1);
      continue;
    }
    if (
      kl.includes('email') &&
      kl !== 'emailverified' &&
      kl !== 'email_verified'
    ) {
      out[k] = redactEmailLike(val);
      continue;
    }
    if (
      kl.includes('secret') ||
      kl.includes('password') ||
      kl.includes('token') ||
      kl === 'authorization' ||
      kl.includes('cookie') ||
      kl.includes('card') ||
      kl.includes('cvv') ||
      kl === 'stripesignature' ||
      kl.includes('webhook_secret') ||
      kl === 'jwt' ||
      kl.includes('bearer')
    ) {
      continue;
    }
    if (
      kl.includes('phone') ||
      kl.includes('recipient') ||
      kl.includes('national') ||
      kl.includes('msisdn')
    ) {
      out[k] = redactPhoneLike(val);
      continue;
    }
    out[k] = sanitizePhase1ObservabilityValue(val, depth + 1);
  }
  return out;
}

/**
 * @param {unknown} v
 */
function redactPhoneLike(v) {
  if (v == null) return null;
  const digits = String(v).replace(/\D/g, '');
  if (digits.length < 6) return '[redacted]';
  return `***${digits.slice(-4)}`;
}

/**
 * @param {unknown} v
 */
function redactEmailLike(v) {
  if (v == null) return null;
  if (typeof v !== 'string') return sanitizePhase1ObservabilityValue(v, 0);
  const s = v.trim();
  const at = s.indexOf('@');
  if (at <= 0) return '[redacted_email]';
  const domain = s.slice(at + 1).slice(0, 120);
  return domain ? `***@${domain}` : '[redacted_email]';
}

/**
 * @param {Record<string, unknown>} fields
 */
export function sanitizePhase1ObservabilityFields(fields) {
  return /** @type {Record<string, unknown>} */ (
    sanitizePhase1ObservabilityValue(fields)
  );
}
