# Transaction fortress report (Phase 1 MOBILE_TOPUP)

Brutally honest status after the hardening pass. This is **not** a security certification.

## SECTION A — Duplicate-processing risks found

| Area | Risk | Mitigation in code |
|------|------|---------------------|
| Stripe `checkout.session.completed` replay | Second finalize could enqueue duplicate logic | `updateMany` on `PENDING` + `orderStatus !== PENDING` early return; `ensureQueuedFulfillmentAttempt` returns existing attempt #1; **`fortress_idempotency_noop`** events |
| Webhook event replay | Double apply | `StripeWebhookEvent` **unique `id`** → `P2002` → `webhook_duplicate_replay` (existing) |
| Fulfillment worker double-claim | Two sends | **`updateMany` claim** on `QUEUED`→`PROCESSING` (existing) + **payment gate** before work |
| Client `/api/recharge/execute` | Kick before payment truth | **`canOrderProceedToFulfillment`** requires `PAYMENT_SUCCEEDED` + PI or `evt_` completion id |
| Fee capture | Double persist | Existing idempotency in fee service (unchanged) |
| Refund/dispute | Send after money reversed | Gate blocks **`REFUNDED`**, **`DISPUTED`**, **`CHARGEBACK_LOST`** on row |

**Remaining:** Global nonce for every sub-operation (provider idempotency keys are attempt-scoped, not a single “commercial transaction id” across all layers). Cross-table anomalies still need reconciliation scans.

## SECTION B — Global idempotency protections added

- **`emitFortressIdempotencyNoop`** → `phase1Ops` event **`fortress_idempotency_noop`** with `fortressReasonCode`
- **Replay paid checkout:** `CHECKOUT_SESSION_REPLAY_AFTER_PAID`, `CHECKOUT_SESSION_PAID_TRANSITION_RACE`
- **Fulfillment attempt #1:** `FULFILLMENT_ATTEMPT_ONE_ALREADY_PRESENT` when row already exists
- **Schedule skipped:** `FULFILLMENT_SCHEDULE_SKIPPED_GATE` when preconditions fail

Authoritative commercial identity remains **`PaymentCheckout.id`** + **`FulfillmentAttempt` (`orderId`,`attemptNumber`) unique**.

## SECTION C — Exact fulfillment gate now enforced

**Helper:** `canOrderProceedToFulfillment(order, { lifecycle })` in `server/src/lib/phase1FulfillmentPaymentGate.js`.

**Enforced on:**

- **`processFulfillmentForOrder`** — `PAID_ONLY` + payment server state before claim / provider I/O
- **`scheduleFulfillmentProcessing`** — same check before calling the worker
- **`postExecute` (recharge)** — `PAID_OR_PROCESSING` but still requires **`PAYMENT_SUCCEEDED`** and Stripe correlation

**Exposed on canonical DTO:** `fulfillmentPaymentGate` (worker vs client kick + denial codes).

**Principle:** No fulfillment without persisted **`PAYMENT_SUCCEEDED`** (Checkout webhook path), non-blocking incidents only, MOBILE_TOPUP + USD + positive amount.

## SECTION D — Anti-intrusion / anti-abuse hardening added

| Change | Notes |
|--------|------|
| **`rechargeExecuteLimiter`** | Stricter than generic recharge bucket (prod **45 / 15 min** per IP+user on `POST /api/recharge/execute`) |
| Webhook failure logs | **`transactionFailureClass`** on `webhook_transaction_failed` ops events |
| Canonical API | Already **owner-only**; gate fields are **derived server-side** (no new trust in client) |

**Not done in this pass:** New Redis-backed rate stores, WAF rules, or mTLS — only application-layer tightening.

## SECTION E — Concurrency protections and tests added

| Primitive | Use |
|-----------|-----|
| **Unique** `StripeWebhookEvent.id` | Webhook dedupe |
| **Atomic `updateMany` claim** | Single worker wins QUEUED attempt |
| **Transactional checkout finalize** | `PENDING` → `PAID` single winner |

**Tests:** `test/integrations/transactionFortressConcurrency.integration.test.js` (requires `TEST_DATABASE_URL`): duplicate session completion, parallel `processFulfillmentForOrder` on same order, parallel distinct orders.

**Load script:** `scripts/phase1-money-path-load.mjs` now includes **`fulfillmentConcurrencyProbe`** (same-order double `processFulfillmentForOrder`).

## SECTION F — Failure classes introduced

**File:** `server/src/constants/transactionFailureClass.js`

- `TRANSIENT_DB` | `TRANSIENT_STRIPE` | `TRANSIENT_PROVIDER` | `PERMANENT_VALIDATION` | `PERMANENT_PAYMENT_MISMATCH` | `PERMANENT_DUPLICATE_BLOCKED` | `MANUAL_REVIEW_REQUIRED` | `UNKNOWN`
- **`isTransientTransactionFailureClass`** for future retry policy wiring

**Applied today:** Stripe webhook error path → ops JSON field **`transactionFailureClass`**. Full mapping through fulfillment workers is **incremental** (existing retry/confidence logic not replaced wholesale).

## SECTION G — Measured concurrency / latency results

**No numbers are printed in this document.** Run on your infra, e.g. from `server/`:

```bash
DATABASE_URL=... npm run phase1:money-path-load
```

The JSON output includes webhook latency percentiles, canonical fanout, and **`fulfillmentConcurrencyProbe`**. Configure `PHASE1_LOAD_WEBHOOK_CONCURRENCY` / `PHASE1_LOAD_WEBHOOKS` per `phase1-money-path-load.mjs` header comments.

## SECTION H — Files changed (this pass)

- `server/src/lib/phase1FulfillmentPaymentGate.js` (new)
- `server/src/lib/transactionFortressIdempotency.js` (new)
- `server/src/constants/transactionFailureClass.js` (new)
- `server/src/services/fulfillmentProcessingService.js`
- `server/src/services/phase1StripeCheckoutSessionCompleted.js`
- `server/src/services/canonicalPhase1OrderService.js`
- `server/src/services/phase1SupportTraceService.js`
- `server/src/controllers/rechargeController.js`
- `server/src/routes/recharge.routes.js`
- `server/src/routes/stripeWebhook.routes.js`
- `server/src/middleware/rateLimits.js`
- `server/scripts/phase1-money-path-load.mjs`
- `server/package.json` (integration test list)
- `server/test/transactionFortressGate.test.js` (new)
- `server/test/integrations/transactionFortressConcurrency.integration.test.js` (new)
- `server/test/phase1CanonicalContract.test.js`
- `server/docs/PHASE1_CANONICAL_ORDER_DTO.schema.md`
- `server/docs/TRANSACTION_FORTRESS_REPORT.md` (this file)

## SECTION I — Remaining risks

1. **Horizontal rate limits** still in-memory per instance.
2. **Provider-level duplicate** depends on Reloadly / mock behavior; DB gate does not replace provider idempotency.
3. **PROCESSING stuck** paths still depend on recovery/manual tooling if worker dies mid-flight.
4. **`payment_intent.succeeded`** for non-topup Phase 1 checkouts is not the primary pay path; scope remains MOBILE_TOPUP Checkout.
5. **Measured production** p99 under multi-region load **not** claimed without your runs.

## SECTION J — Harsh scorecard (/10)

| Criterion | Score | Notes |
|-----------|------:|-------|
| Anti-duplication | **7** | Strong DB + webhook dedupe + gate + ops reasons; not formally proven beyond tests + load script |
| Payment-authoritative safety | **8** | `PAYMENT_SUCCEEDED` + correlation required before worker; dispute/refund blocks |
| Anti-abuse resistance | **6** | Limiter on execute + existing checkout limits; no Redis/fraud ML |
| Concurrency safety | **7** | Atomic claim + new integration tests; not exhaustive formal model |
| Failure resilience | **6** | Taxonomy added; partial wiring (webhook); legacy classifications remain |
| Support traceability | **8** | Full-trace + gate on DTO + fortress block |
| **Overall readiness** | **7** | Meaningful hardening; not “bank grade” without ops discipline and measured SLOs |
