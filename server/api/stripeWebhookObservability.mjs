const OBSERVABILITY_PREFIX = 'ZW_STRIPE_WEBHOOK_OBSERVABILITY';

const ALLOWED_FIELDS = new Set([
  'method',
  'path',
  'event_id',
  'event_type',
  'status_code',
  'duration_ms',
  'decision',
  'result',
  'reason',
]);

/**
 * Emits a small, searchable Stripe webhook runtime breadcrumb for Vercel logs.
 * Only allowlisted scalar fields are logged; never pass headers, body, secrets, or PII.
 *
 * @param {string} marker
 * @param {Record<string, unknown>} [fields]
 * @param {'info' | 'warn' | 'error'} [level]
 */
export function logStripeWebhookObservability(marker, fields = {}, level = 'info') {
  const payload = {
    marker,
    timestamp: new Date().toISOString(),
  };

  for (const [key, value] of Object.entries(fields)) {
    if (!ALLOWED_FIELDS.has(key) || value == null) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      payload[key] = value;
    }
  }

  const line = `${OBSERVABILITY_PREFIX} ${JSON.stringify(payload)}`;
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  if (level === 'error') {
    console.error(line);
    return;
  }
  console.info(line);
}

/**
 * @param {import('http').IncomingMessage} req
 */
export function webhookPathFromRequest(req) {
  const raw = typeof req?.url === 'string' ? req.url : '';
  const q = raw.indexOf('?');
  return q === -1 ? raw : raw.slice(0, q);
}

export { OBSERVABILITY_PREFIX };
