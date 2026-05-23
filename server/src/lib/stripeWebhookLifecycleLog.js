/**
 * Structured, redacted Stripe webhook lifecycle logs (observability plan v1).
 * Never log secrets, raw payloads, or full Stripe ids.
 */

/**
 * @param {string} eventName
 * @param {Record<string, unknown>} [fields]
 */
export function logStripeWebhookLifecycle(eventName, fields = {}) {
  console.log(
    JSON.stringify({
      event: eventName,
      schema: 'zora.stripe_webhook_lifecycle.v1',
      route: '/webhooks/stripe',
      t: new Date().toISOString(),
      ...fields,
    }),
  );
}
