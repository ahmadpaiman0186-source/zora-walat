# Zora Walat — three-layer system foundation (repository-specific)

This document describes how the codebase is structured for **startup-grade** reliability without pretending to be hyperscale infrastructure.

## Layer 1 — Strong now (environment, logs, contracts, errors)

| Area | What exists | Where |
|------|-------------|--------|
| **Environment** | Single server `env` object after `bootstrap.js` loads dotenv; fulfillment queue gate is `FULFILLMENT_QUEUE_ENABLED` + `REDIS_URL` via `queues/queueEnabled.js` (also exposed as `env.fulfillmentQueueEnabled`). | `server/src/config/env.js`, `server/bootstrap.js` |
| **Frontend public env** | Reads isolated through `lib/env/publicRuntime.ts` (`NEXT_PUBLIC_*` only). | Root Next app |
| **Frontend API errors** | `parseApiErrorBody` — stable `{ message, code }` from `clientErrorBody` JSON. | `lib/api/readApiError.ts` (used by marketing top-up UI) |
| **Structured money-path logs** | One JSON line per event: `{ "moneyPath": true, "event": "…", "t": "…" }`. Grep: `moneyPath` or event names in `domain/payments/moneyPathEvents.js`. **`risk_decision`** mirrors `logRiskDecision` (safe fields only). | `server/src/infrastructure/logging/moneyPathLog.js` |
| **Payment / webhook hooks** | Emissions on PI create, **checkout session created**, **WebTopup order create / mark-paid**, webhook ingress/verify, payment confirmed, fulfillment queue/inline dispatch/success/failure, **inline schedule failure + retry decision**, retry classifier output (webhook tx), **risk decisions**. | `paymentController`, `topupOrderController`, `stripeWebhook.routes`, `fulfillmentProcessingService`, `phase1FulfillmentWorker`, `services/risk/logRiskDecision.js` |
| **API error shape** | `clientErrorBody`: `success`, `message`, `code`, optional `details` (documented). | `server/src/lib/clientErrorJson.js` |
| **HTTP errors** | `errorHandler` maps `HttpError`, Zod, Stripe, rate-limit edge cases. | `server/src/middleware/errorHandler.js` |

**State transitions** for paid mobile checkout remain in `domain/orders/orderLifecycle.js` and related services — do not bypass `assertTransition` when tightening flows.

**WebTopup (marketing) payment/fulfillment edges** are explicit in `domain/topupOrder/webtopupStateMachine.js` (`assertWebTopupPaymentTransition` / `assertWebTopupFulfillmentTransition`) — used by webhook handlers and `topupOrderService`.

## Layer 2 — Scaffolded / operational (queues, retries, monitoring, ops)

| Area | What exists | Where |
|------|-------------|--------|
| **Queue-ready fulfillment** | BullMQ Phase 1 queue + worker; explicit job contract (`orderId`, `traceId`, `v: 1`). Producer validates before `add`; worker parses before execution. | `queues/phase1FulfillmentProducer.js`, `queues/phase1FulfillmentWorker.js`, `infrastructure/fulfillment/fulfillmentJobContract.js` |
| **Retry / idempotency** | Transient vs terminal classification, BullMQ attempts, DLQ, `reliabilityOrchestrator`, `transactionRetryPolicy`. No duplicate-send: idempotency keys + webhook dedupe. | `services/reliability/*`, `constants/transactionFailureClass.js` |
| **Monitoring hooks** | `opsMetrics`, `phase1OperationalEvents`, `logOpsEvent`, `moneyPath` JSON lines. | `lib/opsMetrics.js`, `lib/phase1OperationalEvents.js`, `services/opsLog.js` |
| **Operator visibility** | Staff routes: `/ops/summary` with **`?webtopupDb=1`** embeds **`moneyPathDbCounts`** (WebTopup `paymentStatus` / `fulfillmentStatus` + Phase 1 `PaymentCheckout.orderStatus` — legacy key **`webtopupDbCounts`** points at the same object). **`/ops/webtopup-money-path-counts`** returns the unified snapshot. Also `/ops/phase1-*`, `/ops/order-health`, `/ops/fulfillment-queue`. | `server/src/routes/ops.routes.js`, `server/src/services/opsMoneyPathCountService.js` |

## Layer 3 — Prepared (boundaries only)

| Concern | Preparation | Where to read |
|---------|-------------|----------------|
| **API vs worker vs webhook** | `ZW_RUNTIME_KIND` and lifecycle gates. **`DEPLOYMENT_ROLE_BOUNDARIES`** documents how to split replicas (API+webhooks vs worker vs serverless) without new code paths. | `server/src/runtime/serverLifecycle.js`, `server/src/infrastructure/scaling/topologyHints.js` |
| **Extension table** | Where to plug scaling, failover, metrics, risk; **`MONITORING_INSERTION_POINTS`** labels grep-friendly hooks. | `server/src/infrastructure/scaling/topologyHints.js` |
| **Risk / fraud** | Non-blocking metadata and engines (existing). | `services/risk/logRiskDecision.js`, Prisma `WebTopupOrder.fraudSignals` / `riskScore` |

Do **not** add new distributed systems here until traffic and team size justify it.

## Evolution rough guide

| Stage | Focus |
|-------|--------|
| **0–100 users** | Layer 1 logs + ops routes + single API + worker when Redis enabled; fix keys and webhooks first. |
| **100–500** | Harden queue concurrency, alerts on `moneyPath` + `phase1Ops` volume, read replicas if DB-bound. |
| **500–1000+** | Split processes by `ZW_RUNTIME_KIND`, dedicated webhook ingress, horizontal workers, external metrics backend feeding off JSON logs. |

## Related docs

- `docs/CONTINUATION_CHECKPOINT_2026-04-16.md` — last known local dev checkpoint.
- `server/README.md`, `server/.env.example` — backend env checklist.
