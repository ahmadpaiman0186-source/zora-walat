# L29 — Dashboard and log query specifications

**Status:** Spec only — translate field names into your vendor’s query language (Datadog, Loki, CloudWatch, etc.).

---

## Critical caveat — Stripe webhooks and HTTP status

**Do not** treat HTTP **200** alone as webhook success.

- The application may return **200** with `{ "received": true }` for some **database transaction failures** on the webhook path (operational tradeoff: Stripe does not retry on 2xx). See `stripeWebhook.routes.js` behavior.
- **Monitoring must use structured logs and metrics**, including:
  - `webhook_transaction_failed`, `webhook_processing_failed`, `webhook_failed`
  - `transactionFailureClass`, `prismaCode`, `stripeEventType`
  - `moneyPath` / L7 spans where present
- After **PR #5** (`l27-dispute-webhook-hardening`) merges, **`charge.dispute.created`** paths that require `charges.retrieve` and fail should return **HTTP 503** (`DisputeChargeLookupError`) — alert on **503** spike for that route separately from generic 5xx.

---

## Query conventions

- Prefer **JSON** log parsing where the line is a single JSON object.
- Use **suffix fields** (`orderIdSuffix`, `stripeEventIdSuffix`) for display; avoid full IDs in shared dashboards if policy requires.
- **Fallback text** (if JSON parse fails): substring search on tokens below.

---

## Panel catalog

| Topic | Structured fields (preferred) | Fallback text | Severity | Panel type | Threshold (initial) | False-positive notes |
|-------|------------------------------|---------------|----------|------------|---------------------|----------------------|
| API 5xx rate | pino `res.statusCode` ≥ 500 OR `err` present with 500 | `"statusCode":500` | P1 | Time series | >1% of requests over 15m | Spikes during deploy |
| Vercel runtime timeout | platform 504 / `FUNCTION_INVOCATION_TIMEOUT` | `504` `timeout` | P1 | Log count | >0 sustained | Cold start bursts |
| /ready degraded | synthetic or app log `readinessReason` | `readinessReason` | P0 | Stat + log | Any 503 from auth probe | Prelaunch without token |
| Stripe invalid signature spike | `securityEvent":"stripe_webhook_signature_invalid"` OR mission `webhooks_invalid_sig` | `stripe_webhook_signature_invalid` | P2 | Rate | > baseline × 3 | Pen test traffic |
| Stripe webhook 5xx / retry | HTTP `503` on `/webhooks/stripe` OR Stripe Dashboard | `dispute_charge_lookup_failed_pre_tx` OR status 503 path | P0/P1 | Count | > N / 10m | Post-PR5 dispute lookup |
| Duplicate / replay spike | `webhook_duplicate_ignored`, `stripe_webhook_db_idempotent_replay`, metrics `webhook_event_duplicate` | `webhook_duplicate` | P2 | Count | > baseline × 5 | Legitimate Stripe retries |
| moneyPathAlert critical | `"moneyPathAlert":true,"severity":"critical"` | `money_path_alert_critical` | P0 | Log + metric | any | Filter test env |
| phase1CriticalAlert | `"phase1CriticalAlert":true` | `phase1CriticalAlert` | P0 | Log | any | — |
| Payment captured, fulfillment not scheduled | `sla_fulfillment_breach`, `stuck_processing_over_threshold`, reconciliation logs | `sla_fulfillment_breach` | P0 | Log | any | Worker paused |
| Fulfillment failed / stuck | mission `fulfillment_failed` rate; `FULFILLMENT_FAILURE` money path | `fulfillment_failed` | P1 | Rate | > SLO | Provider blips |
| Provider unavailable | Reloadly circuit; `fulfillment_outbound_disabled` | `circuit` `reloadly` | P1 | Gauge + logs | circuit open | Planned maintenance |
| Reloadly sandbox/live mismatch | startup `[security]` logs; `/ready` diagnostics | `RELOADLY_SANDBOX` `production` | P2 | Log | any | Intentional drill |
| Ledger imbalance | `moneyPathAlert` code `missing_ledger`, `duplicate_payment_captured_ledger` | `missing_ledger` | P0 | Log | any | Recon lag |
| Reconciliation mismatch | `RECONCILIATION_DRIFT` critical alert; `reconciliation_required` | `reconciliation_drift` | P0 | Log | any | — |
| Refund / dispute | `post_payment_incident`, `charge_dispute`, `charge.refunded` audit | `post_payment_incident` | P2 | Log | trend | Support volume |
| Auth / security anomaly | `securityEvent`, fraud `fraud_risk_block` | `fraud_risk` | P1 | Log | threshold | A/B login tests |
| Rate limit spike | HTTP **429**; ratelimit headers in logs | `429` `rate` | P2 | Count | > baseline | Marketing spike |
| DB connection failures | `PrismaClientInitializationError`, `P1001` | `Prisma` `P1000` | P0 | Log | any | Neon maintenance |
| Redis / queue unavailable | `redis_unavailable`, `queue_unavailable`, enqueue failed | `enqueue_failed` | P1 | Log | sustained | Redis blip |

---

## Recommended dashboards (layout)

1. **Executive health:** synthetic OK badges, error rate, `/ready` reason.
2. **Money path:** payment success samples, fulfillment terminal, recovery rate (from metrics if Prometheus on).
3. **Webhooks:** invalid sig rate, transaction failed logs, **non-2xx** count, PR #5 dispute 503 series.
4. **Provider:** circuit state, Reloadly diagnostics snapshot (manual paste from `/ready` weekly).
5. **Security:** fraud alerts, rate limits, geo blocks.

---

## Prometheus (when `METRICS_PROMETHEUS_ENABLED=true`)

- Scrape `GET /metrics` with auth per `opsInfraHealthGate` / prelaunch rules.
- Use counters documented in `docs/runbooks/SLO.md` and `prometheusTextFormat.js` output.
- Enable `METRICS_REDIS_AGGREGATION=true` for multi-instance accuracy.

---

## Cross-reference

- Synthetic definitions: `L29_SYNTHETIC_MONITORS.md`
- Incident steps: `../runbooks/L29_OBSERVABILITY_INCIDENT_RESPONSE.md`
- Routing: `L29_ALERT_ROUTING_ADR.md`
