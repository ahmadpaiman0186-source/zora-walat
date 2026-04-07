# Phase 1 — operational metrics and investigation

## Log pipeline (recommended)

Structured **single-line JSON** events for Phase 1 use stable keys:

- `phase1Ops: true`
- `event` — e.g. `checkout_session_created`, `checkout_paid`, `webhook_processed`, `webhook_duplicate_replay`, `webhook_transaction_failed`, `fulfillment_attempt_started`, `fulfillment_delivered`, `fulfillment_failed`, `financial_anomaly_detected`, `stuck_order_detected`
- `t` — ISO timestamp
- Optional: `traceId`, `orderIdSuffix`, `stripeEventType`, `anomalyCodes`, etc.

Filter application logs for `"phase1Ops":true` (or `phase1Ops\\":true` depending on your log store).

Correlate with HTTP responses: **`X-Trace-Id`** (also accepted on inbound requests as `X-Trace-Id`).

## In-process counters (single-instance)

`GET /api/admin/ops/summary` (staff JWT) returns `getOpsMetricsSnapshot()`:

- Rolling windows for payment / fulfillment / push failure rates
- Counters such as `checkout_session_created_total`, `checkout_paid_phase1_total`, `stripe_webhook_transaction_failed`, `phase1_financial_anomaly_order_total`, `phase1_anomaly_*`, `phase1_stuck_*`

For multi-node production, treat these as **hints**; prefer log-based aggregation.

## DB-backed Phase 1 report (staff)

`GET /api/admin/ops/phase1-report` — counts and **stuck candidates** (orders paid or processing longer than the processing timeout, with derived `stuckSignals`).

- **`marketReadiness`**: 24h cohort on `PaymentCheckout.createdAt` with explicit denominators — `deliverySuccessRate`, `failureRate`, `incidentRate` (share of **fulfilled** orders in cohort with non-`NONE` post-payment incident flag), plus `avgResolutionTimeNote` explaining that mean time-to-resolve is **not** emitted without structured incident timestamps.
- Optional: `?emitStuckSignals=1` bumps in-process stuck counters when scanning (default off).

Use together with `GET /api/admin/ops/order-health?id=<checkoutId>`, **`GET /api/admin/support/order/:id/full-trace`** (staff — canonical Phase 1 row + audit trail + fulfillment attempts + merged timeline + derived DB-only timing gaps), and the canonical order API (`GET /api/orders/:id/phase1-truth`).

## Stripe webhooks — refund / dispute (Phase 1)

Configure Stripe to send at least:

- `charge.refunded` → sets `PaymentCheckout.postPaymentIncidentStatus` to **`REFUNDED`** (matched by `stripePaymentIntentId`).
- `charge.dispute.created` → sets **`DISPUTED`** when `payment_intent` is present on the dispute object.

If a dispute arrives **without** `payment_intent`, the handler logs `charge_dispute_skipped_no_pi` — correlate in Stripe Dashboard.

## Money-path integration suite (CI)

- **`npm run test`** — fast unit tests (`test/*.test.js` only).
- **`npm run test:integration`** — PostgreSQL-backed Phase 1 flow (`test/integrations/*.test.js`); requires **`TEST_DATABASE_URL`** (never uses `DATABASE_URL` implicitly).
- **`npm run test:ci`** — both; GitHub Actions runs **`db:migrate`** then **`test:ci`**, sets **`PHASE1_CI_MONEY_PATH_CERTIFIED=1`**, then **`phase1:launch-readiness --strict --require-ci-money-path-certified`**. No separate Prisma seed is required (tests create rows).

Staff endpoints:

- **`GET /api/admin/ops/summary`** — in-process counters; add **`?phase1=1`** for **`phase1Ops`** (DB + process snapshot).
- **`GET /api/admin/ops/health`** — same **`phase1Ops`**-style payload as summary’s `phase1Ops` (canonical staff health JSON).
- **`GET /api/admin/ops/phase1-report`** — stuck candidates + anomaly histogram (DB) + **`marketReadiness`**.
- **`GET /api/admin/support/order/:id/full-trace`** — support bundle (staff JWT).

## Launch gate script

From `server/`:

```bash
npm run phase1:launch-readiness
npm run phase1:launch-readiness -- --strict
```

CI / merge gates:

```bash
npm run phase1:launch-readiness -- --strict --require-ci-money-path-certified
```

(`PHASE1_CI_MONEY_PATH_CERTIFIED=1` is exported by CI only after **`test:ci`** succeeds.)

**`--production`** — requires webhook secret, `STRIPE_SECRET_KEY`, PostgreSQL `DATABASE_URL`.

**`--production-launch`** — rejects mock airtime/webtopup without explicit `ALLOW_*` flags and enforces webhook secret + Postgres URL (without forcing `NODE_ENV=production`).

## Investigation order (on-call)

1. **Customer reference:** `checkoutId`, `stripeCheckoutSessionId`, `stripePaymentIntentId` from canonical DTO or DB.
2. **Trace:** `X-Trace-Id` from app response or logs; search money-path logs (`payment`, `stripe webhook`, `fulfillment`, `financial_truth`).
3. **Stripe Dashboard:** session amount, payment status, disputes/refunds (money movement SoT).
4. **Ops endpoints:** `/api/admin/ops/order-health`, `/api/admin/ops/phase1-report`.
