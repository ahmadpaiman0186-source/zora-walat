# Phase 1 — scale and stress (honest bounds)

## What we measure locally

`npm run phase1:scale-sanity` issues parallel `SELECT 1` pings through Prisma to approximate **DB round-trip** under concurrency. Tune with:

- `PHASE1_SCALE_ITERATIONS` (default 120)
- `PHASE1_SCALE_CONCURRENCY` (default 15)

This is **not** an end-to-end Stripe or fulfillment benchmark.

## Observed bottlenecks (architecture)

1. **Stripe webhooks** — Each event runs signature verification + at least one Postgres transaction (often including `StripeWebhookEvent` insert). Throughput scales with **CPU + connection pool + DB fsync**.
2. **`PaymentCheckout` updates** — Paid path uses targeted `updateMany` with lifecycle guards; contention is **per-order**, not a global lock.
3. **Fulfillment** — One active dispatch per order by design (claim pattern). More instances add **throughput across distinct orders**, not duplicate sends for the same order.
4. **`queryPhase1OperationalExceptionReport`** — Scans up to 500 stuck candidates with related attempts; fine for ops dashboards, not for per-request customer hot paths.

## Practical limits (order-of-magnitude)

Without your exact hardware and Postgres tuning, treat **tens of webhook commits per second per API instance** as a planning figure — **validate with production-like load**.

Multi-instance: aggregate **`phase1Ops` logs** and **`/api/admin/ops/health`** (DB counts are global; process counters are per pod).

## Stripe webhook types (Phase 1 money truth)

Ensure the endpoint is subscribed at least to:

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.succeeded` / `payment_intent.payment_failed` (web top-up + fee side paths)
- **`charge.refunded`** — updates `postPaymentIncidentStatus`
- **`charge.dispute.created`** — updates `postPaymentIncidentStatus`

Dispute payloads must include **`payment_intent`** (string or object); if Stripe sends only `charge`, resolve PI via Dashboard/API (automation gap documented).
