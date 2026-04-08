# SLO concepts (draft — not yet monitored as formal error budgets)

These are **targets for instrumentation**, not contractual guarantees until wired to alerting.

## Availability

- **API liveness** (`GET /health`): target 99.9% monthly (excluding planned maintenance).
- **API readiness** (`GET /ready`): target 99.5% — includes DB; page when failing.

## Latency (p95)

| Flow | Target p95 | Notes |
|------|----------------|------|
| Authenticated catalog / session read | < 300ms | Exclude client networks |
| Checkout session create | < 800ms | Includes Stripe round-trip variance |
| Webhook processing | < 2s | ack within Stripe retry window |
| Fulfillment (queue mode, mock) | < 30s end-to-end | Provider-bound in production |

Prometheus (when enabled): `zora_http_request_duration_ms_bucket`, `zora_http_request_duration_milliseconds` histogram fields.

## Error budget (fulfillment)

- **Stuck paid** rows beyond SLA: near-zero after worker healthy 15m.
- **DLQ growth rate**: alert on sustained **> N/hour** per environment.
- **Retry exhausted**: any sustained rate warrants provider or DB investigation.

## Failure intelligence

Alert on spikes in `zora_failure_intelligence_total{class="retry_exhausted"}` or `unavailable` aggregated in Redis when `METRICS_REDIS_AGGREGATION=true`.
