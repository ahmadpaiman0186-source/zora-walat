# Phase 1 observability baseline

## Design

- **Structured JSON** to stdout: `opsLog: true` (`logOpsEvent` in `server/src/lib/opsLog.js`), `recoveryLog`, Stripe webhook logs (`webTopupLog`), fulfillment delivery logs (`logDeliveryEvent`).
- **In-process counters** (`server/src/lib/opsMetrics.js`): `getOpsMetricsSnapshot()` — suitable for single-node / dev; multi-instance production should scrape logs or export to Prometheus/Datadog.

## Core events (consistent names)

| Domain | Event | When |
|--------|-------|------|
| `payment` | `checkout_session_created` | Stripe Checkout session created for app recharge |
| `stripe_webhook` | `checkout.session.completed` / outcome `paid` | Order transitioned to PAID in webhook txn |
| `stripe_webhook` | `checkout.session.completed` / outcome `amount_mismatch` | Stripe total ≠ locked row |
| `fulfillment` | `fulfillment_attempt_claimed` | QUEUED → PROCESSING claim succeeded |
| `fulfillment` | `fulfillment_delivered` | Terminal success path after margin snapshot |
| `stripe_webhook` | `webhook_transaction` / `error` | Webhook handler threw (non-duplicate) |

**Financial truth:** `financial_truth` logger in `financialTruthService.js` (recompute, anomaly codes) — search `financialTruth:` in logs.

## Counters (selected)

| Counter | Meaning |
|---------|---------|
| `checkout_session_created_total` | Checkout sessions created |
| `payment_checkout_ok` / `payment_checkout_fail` | Webhook payment outcome rollup |
| `fulfillment_run_started` | Fulfillment worker claims |
| `fulfillment_delivered` / `fulfillment_failed` | Terminal fulfillment (via push pipeline + metrics) |
| `retry_webhook_event_duplicate` | Idempotent Stripe event replay |
| `stripe_webhook_transaction_failed` | Webhook txn failure |

**Anomaly / stuck (helpers reserved in `opsMetrics.js`):** `phase1_anomaly_*`, `phase1_stuck_*` — wire from batch jobs if you need counter-based dashboards; canonical `stuckSignals` on `phase1-truth` is computed at read time.

## SQL / DB queries (truth when dashboards absent)

- **Anomaly counts:** `financialAnomalyCodes` JSON array on `PaymentCheckout` — filter by `@>` in PostgreSQL.
- **Stuck paid orders:** `orderStatus IN ('PAID','PROCESSING')` and `paidAt < now() - interval '15 minutes'` (tune to `PROCESSING_TIMEOUT_MS`).
- **Webhook health:** `StripeWebhookEvent` table — duplicate `evt_` ids expected on retries.

## Latency / blocking

- Stripe **fee capture** and **financial truth recompute** run **after** webhook HTTP response (`setImmediate` / async) — customers are not blocked on fee API calls.
- Fulfillment runs **async** (`scheduleFulfillmentProcessing`) after webhook commit.
