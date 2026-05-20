# Zora-Walat fulfillment and failure handling report — 2026-05-15

## 1. Executive summary

Phase 1 airtime fulfillment (hosted `PaymentCheckout` + `FulfillmentAttempt` + worker/`scheduleFulfillmentProcessing`) and web top-up fulfillment (separate eligibility and job processors) were reviewed against the stated safety invariants. The architecture already separates **payment confirmation** (Stripe-verified webhook + `PAYMENT_SUCCEEDED` / correlation fields) from **provider I/O** (claimed worker path), uses **DB uniqueness** on `(orderId, attemptNumber)` with savepoint recovery for attempt #1, and normalizes provider payloads so **invalid shapes never become `success`** without an explicit enum outcome.

This pass **did not change runtime server code**; it adds **documentation** and **DB-free unit anchors** in `server/test/fulfillmentFailureSafetyAudit.test.js`.

## 2. Fulfillment architecture

| Path | Entry | Preconditions | Provider I/O |
|------|--------|---------------|--------------|
| Phase 1 hosted checkout | `checkout.session.completed` → `applyPhase1CheckoutSessionCompleted` → `ensureQueuedFulfillmentAttempt` | `assertPhase1FulfillmentQueuePreconditions` → `assertFulfillmentPaymentGateOrThrow` (paid + `canOrderProceedToFulfillment`) | Queued in webhook txn; `scheduleFulfillmentProcessing` / worker claims → `executeDelivery` / airtime adapter |
| Web top-up | `payment_intent.succeeded` → `handleWebTopupPaymentIntentSucceeded` → `scheduleWebTopupFulfillmentAfterPaid` | WebTopup row + metadata + state machine | Separate fulfillment services + eligibility (`fulfillmentEligibility.js`) |
| Incidents | `charge.refunded` / disputes | `applyPhase1ChargeRefunded` / `applyPhase1DisputeCreated` | Updates post-payment incident fields; fulfillment gate reads incident |

Key modules: `server/src/services/fulfillmentProcessingService.js`, `server/src/payment/paymentFulfillmentGuard.js`, `server/src/domain/orders/phase1TransactionStateMachine.js`, `server/src/lib/phase1FulfillmentPaymentGate.js`, `server/src/domain/fulfillment/providerResultNormalization.js`, `server/src/services/topupFulfillment/fulfillmentEligibility.js`.

## 3. State transition map (Phase 1 narrative)

See comments in `phase1TransactionStateMachine.js`: **PENDING (+ pre-paid statuses)** → webhook → **PAID + PAYMENT_SUCCEEDED** → **attempt #1 QUEUED** → worker claim → **PROCESSING + RECHARGE_PENDING** → adapter → attempt **SUCCEEDED | FAILED** and order **FULFILLED | FAILED** (with recovery edges documented in order lifecycle).

## 4. Failure handling model

- **Provider result boundary:** `normalizeFulfillmentProviderResult` — does not fabricate `success`; missing/unknown outcomes clear to `undefined` with metrics + structured `console.warn` (suffix-only `orderIdSuffix`).
- **Retry policy:** `retryPolicy.js` + webtopup job hardening tests; terminal vs retryable codes distinguished in eligibility helpers.
- **Stuck / ambiguous:** `AIRTIME_OUTCOME.AMBIGUOUS` / `PENDING_VERIFICATION` paths avoid marking delivered without proof (completion logic in fulfillment service; see existing `fulfillmentOutcome` / integration tests).

## 5. Duplicate / idempotency model

- **Stripe events:** `StripeWebhookEvent` PK (`event.id`) + `P2002` replay handling in `stripeWebhook.routes.js`.
- **Fulfillment attempt #1:** `ensureQueuedFulfillmentAttempt` — `findFirst` short-circuit, `SAVEPOINT` + `P2002` recovery, `emitPhase1DuplicateFulfillmentBlocked` / fortress noop metrics.
- **Worker claim:** `updateMany`-style atomic claim patterns (see `fulfillmentProcessingService.js` continuation after `ensureQueuedFulfillmentAttempt`).

## 6. Risks found (classification)

| Risk | Class | Notes |
|------|-------|------|
| Misconfigured provider / operator map | High | Startup diagnostics; outbound policy blocks Reloadly without config |
| Ledger post failure after payment row update | High | Existing Stripe retry semantics; monitor |
| Worker crash between claim and completion | Medium | Replay + idempotent attempt design |
| Ambiguous provider response | Medium | May require manual review — by design |
| Local `npm test` without valid DB | Low | Dev experience; CI should run full suite |

No **Critical** “unpaid fulfill” or “double fulfill same success” gap was proven in this read-only pass.

## 7. Fixes applied

- **Docs:** this file.
- **Tests:** `server/test/fulfillmentFailureSafetyAudit.test.js` (anchors only).

## 8. Tests run

- `npm run lint` / `npm run typecheck` / `npm run build` — **not defined** in `server/package.json`.
- `npm test` — **not run to completion** (expected failure: `DATABASE_URL` unusable on this machine per `unit-test-db-precheck`).
- **Targeted:**  
  `node --import ./test/setupTestEnv.mjs --test test/fulfillmentFailureSafetyAudit.test.js`

## 9. Remaining risks

1. End-to-end proof still depends on **integration DB** + provider sandboxes (`npm run test:integration`, Reloadly dry-run scripts).
2. **Timeout bounding** for outbound HTTP is environment- and client-specific; verify in provider client modules and ops timeouts, not reimplemented here.

## 10. Next action

Restore a valid **`DATABASE_URL`** (or CI `TEST_DATABASE_URL`) and run **`npm test`** then **`npm run test:integration`** (concurrency already limited in scripts). Execute a **sandbox fulfillment** smoke (`proof:reloadly-dry-run` or mock provider) and confirm a single **SUCCEEDED** attempt per order in DB.
