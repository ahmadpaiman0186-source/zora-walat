/**
 * Correlates incident signals with config and optional order context — no side effects.
 */

/**
 * @param {{
 *   incidentSignals: import('./webtopIncidentSignals.js').getWebtopIncidentSignals extends (...args: any) => infer R ? R : never;
 *   configSnapshot: Record<string, unknown>;
 *   orderId?: string | null;
 * }} ctx
 * @returns {{
 *   incidentType: string;
 *   probableCauses: string[];
 *   affectedSubsystems: string[];
 *   confidence: 'high' | 'medium' | 'low';
 *   focusIncidentId?: string;
 * }}
 */
export function diagnoseWebtopIncident(ctx) {
  const { incidentSignals, configSnapshot } = ctx;
  const incidents = incidentSignals.incidents ?? [];
  if (incidents.length === 0) {
    return {
      incidentType: 'none',
      probableCauses: ['No active incident signals in this snapshot.'],
      affectedSubsystems: [],
      confidence: 'high',
    };
  }

  const critical = incidents.filter((i) => i.severity === 'critical');
  const primary = critical[0] ?? incidents[0];
  const type = String(primary.type ?? 'unknown');

  /** @type {string[]} */
  const probableCauses = [];
  /** @type {string[]} */
  const affectedSubsystems = ['webtopup'];

  const flags = /** @type {Record<string, unknown>} */ (configSnapshot.flags ?? {});
  const uxOn = flags.uxPublicFieldsEnabled !== false;

  switch (type) {
    case 'provider_circuit':
      probableCauses.push('Provider or network failures tripped the durable or in-memory circuit.');
      probableCauses.push('Downstream Reloadly Topups API latency or auth failures.');
      affectedSubsystems.push('reloadly', 'fulfillment_dispatch');
      break;
    case 'payment_webhook_fallback':
      probableCauses.push('Stripe webhooks delayed, misconfigured endpoint, or rolling deploy gap.');
      probableCauses.push('Fallback poller is compensating — not necessarily data loss.');
      affectedSubsystems.push('stripe_webhooks', 'payment_projection');
      break;
    case 'fulfillment_stale_processing':
    case 'fulfillment_stale_queued':
    case 'fulfillment_queue':
      probableCauses.push('Worker not draining, lease expiry not running, or provider slowness.');
      affectedSubsystems.push('fulfillment_worker', 'webtopup_fulfillment_job');
      break;
    case 'sla_breach':
      probableCauses.push('Queue/processing delay, retry exhaustion, or SLA thresholds tighter than provider p99.');
      affectedSubsystems.push('sla_enforcement', 'fulfillment');
      break;
    case 'abuse_rate':
      probableCauses.push('Abusive traffic, integration bug causing retries, or mis-tuned thresholds.');
      affectedSubsystems.push('abuse_protection', 'edge_rate_limits');
      break;
    case 'financial_protection':
      probableCauses.push('Invalid amounts/currencies, caps, or contradictory payment vs fulfillment state.');
      affectedSubsystems.push('financial_guardrails', 'reconciliation');
      break;
    case 'fulfillment_failures':
      probableCauses.push('Provider terminal errors, unsupported routes, or retryable failures accumulating.');
      affectedSubsystems.push('provider_adapter', 'fulfillment');
      break;
    case 'fulfillment_dead_letter':
      probableCauses.push('Repeated errors exceeded max job attempts; requires human review before retry.');
      affectedSubsystems.push('webtopup_fulfillment_job');
      break;
    default:
      probableCauses.push('See incident hint and correlate with metrics + queue-health.');
  }

  if (!uxOn) {
    probableCauses.push('UX public fields are off — client-visible status may be reduced (check feature flag).');
  }

  let confidence = /** @type {'high'|'medium'|'low'} */ ('medium');
  if (type === 'provider_circuit' || type === 'payment_webhook_fallback') confidence = 'high';
  if (type === 'system_health') confidence = 'low';

  return {
    incidentType: type,
    probableCauses,
    affectedSubsystems: [...new Set(affectedSubsystems)],
    confidence,
    focusIncidentId: primary.id,
  };
}
