# Money path state machine audit — `20260503120000`

## Executive verdict

**PARTIAL PASS** — The Phase 1 paid → queued → claimed → delivered/failed path is **explicitly modeled, transition-guarded, and covered by unit + integration tests**. **Refund, dispute, and chargeback** are tracked primarily via `PaymentCheckout.postPaymentIncidentStatus` (and related fields), **not** as additional `ORDER_STATUS` values; reconciliation and ops runbooks must treat that as a **parallel incident layer** (see §Critical findings).

---

## 1. Status enums in use

| Layer | Enum / values | Persisted on |
|--------|-----------------|--------------|
| **Order (canonical business)** | `PENDING`, `PAID`, `PROCESSING`, `FULFILLED` (alias `DELIVERED`), `FAILED`, `CANCELLED` | `PaymentCheckout.orderStatus` (`server/src/constants/orderStatus.js`) |
| **Payment / recharge row** | `INITIATED`, `CHECKOUT_CREATED`, `PAYMENT_PENDING`, `PAYMENT_SUCCEEDED`, `PAYMENT_FAILED`, `RECHARGE_PENDING`, `RECHARGE_COMPLETED`, `RECHARGE_FAILED` | `PaymentCheckout.status` (`paymentCheckoutStatus.js`) |
| **Fulfillment attempt** | `QUEUED`, `PROCESSING`, `SUCCEEDED`, `FAILED` | `FulfillmentAttempt.status` (`fulfillmentAttemptStatus.js`) |
| **Post-payment incidents** | e.g. `REFUNDED`, `DISPUTED`, … | `PaymentCheckout.postPaymentIncidentStatus` (blocks fulfillment via gate) |
| **Canonical (DTO / logging)** | `CREATED`, `PAID`, `QUEUED`, `SENT`, `DELIVERED`, `FAILED` | Derived only (`canonicalOrderLifecycle.js`) |

---

## 2. State machine — `PaymentCheckout.orderStatus` (valid edges)

Defined in `server/src/domain/orders/orderLifecycle.js` (`EDGES` + `TERMINAL`).

| Current state | Event (conceptual) | Next state | Where enforced |
|---------------|-------------------|------------|----------------|
| `PENDING` | Stripe success + integrity OK | `PAID` | `applyPhase1CheckoutSessionCompleted` → `updateMany` + `assertTransition` |
| `PENDING` | Stripe / integrity failure paths | `FAILED` | Same module (mismatch, session id mismatch) |
| `PENDING` | Cancel (if implemented) | `CANCELLED` | Policy / APIs using `assertTransition` |
| `PAID` | Worker claims fulfillment | `PROCESSING` | `processFulfillmentForOrderInner` after claim |
| `PAID` | Fulfillment fatal / policy | `FAILED` | Fulfillment pipeline |
| `PROCESSING` | Provider + DB commit success | `FULFILLED` | `fulfillmentProcessingService.js` completion path |
| `PROCESSING` | Provider failure terminal | `FAILED` | Same |
| `PROCESSING` | Stuck recovery release | `PAID` | Documented edge for re-queue (`orderLifecycle.js` comment) |
| Terminal (`FULFILLED` / `FAILED` / `CANCELLED`) | Any | *(none)* | `TERMINAL` → `canTransition` false |

**Invalid (examples):** `PAID` → `FULFILLED` (must go through `PROCESSING`); any transition from terminal; `INITIATED` is not an order status (it is payment-row only).

---

## 3. State machine — `PaymentCheckout.status` (payment row)

Edges from `canPaymentCheckoutStatusTransition` in `phase1LifecyclePolicy.js`.

| From | To (examples) |
|------|----------------|
| `INITIATED` | `CHECKOUT_CREATED`, `PAYMENT_SUCCEEDED`, `PAYMENT_FAILED` |
| `CHECKOUT_CREATED` | `PAYMENT_PENDING`, `PAYMENT_SUCCEEDED`, `PAYMENT_FAILED` |
| `PAYMENT_PENDING` | `PAYMENT_SUCCEEDED`, `PAYMENT_FAILED` |
| `PAYMENT_SUCCEEDED` | `RECHARGE_PENDING` |
| `RECHARGE_PENDING` | `RECHARGE_COMPLETED`, `RECHARGE_FAILED` |

Incoherent pairs are detected by `detectPhase1LifecycleIncoherence` (same file).

---

## 4. State machine — `FulfillmentAttempt.status`

Valid edges in `validateFulfillmentAttemptStatusTransition` (`phase1TransactionStateMachine.js`):

| From | To |
|------|-----|
| `QUEUED` | `PROCESSING` |
| `PROCESSING` | `SUCCEEDED`, `FAILED`, `QUEUED` (retry / release) |

Attempt **#1** is created idempotently: `ensureQueuedFulfillmentAttempt` (`fulfillmentProcessingService.js`) — `findFirst` + `@@unique([orderId, attemptNumber])` + savepoint around create + `P2002` recovery.

---

## 5. Critical events → code locations

| Event | File / function |
|-------|-----------------|
| Checkout row created | `paymentCheckoutService.createInitiatedRow` / `paymentController.createCheckoutSession` |
| Idempotent replay same `Idempotency-Key` | `findReusableCheckout` in `createCheckoutSession` |
| `checkout.session.completed` applies payment | `applyPhase1CheckoutSessionCompleted` (`phase1StripeCheckoutSessionCompleted.js`) |
| Queue fulfillment attempt #1 | `ensureQueuedFulfillmentAttempt` (inside webhook txn after PAID) |
| Worker schedules job | `scheduleFulfillmentProcessing` → `enqueuePhase1FulfillmentJob` (webhook post-commit) |
| Claim QUEUED → PROCESSING | `processFulfillmentForOrderInner` (`updateMany` claim) |
| Provider dispatch + terminal order | `fulfillmentProcessingService.js` (delivery execution, retries policy) |
| Duplicate Stripe `evt_` id | `stripeWebhook.routes.js` → `stripeWebhookEvent.create` → **P2002** → `200 { received: true }` |
| Replay same session after PAID | `applyPhase1CheckoutSessionCompleted` early return + `emitFortressIdempotencyNoop` |

---

## 6. Critical risks — assessment

| Risk | Mitigation (code / data) | Residual |
|------|---------------------------|----------|
| Duplicate checkout session (double pay) | `idempotencyKey` **required** header; `findReusableCheckout`; unique `idempotencyKey` on `PaymentCheckout` | Client must send stable key; abuse classifier rate-limits rapid duplicates |
| Duplicate webhook processing | `StripeWebhookEvent` unique on `event.id` | **OK** — P2002 path acks |
| Duplicate fulfillment / double top-up | Single primary attempt **#1** + unique `(orderId, attemptNumber)`; idempotent `ensureQueuedFulfillmentAttempt`; claim uses conditional `updateMany` | Retries use policy / attempt numbers (see fulfillment service) |
| Paid order stuck without fulfillment | Worker + queue; reconciliation categories (`reconciliationIssue.js`); stuck probes in ops tooling | Ops monitoring required |
| Provider success, DB not updated | Completion paths use transactions; failure classification + retry | **Medium** — requires prod observability |
| DB updated, provider failed | Attempt `FAILED`, order can fail terminal; retry policy | Covered by retry + manual paths |
| Stripe paid, local unpaid | Webhook is source of truth; replay idempotent; `completedByWebhookEventId` unique | If webhook never arrives, order stays `PENDING` — **reconciliation** needed |
| Refund / reversal | `postPaymentIncidentStatus` + webhooks `charge.refunded` / dispute handlers (`phase1StripeChargeIncidents.js`); gate blocks new fulfillment | **Not** modeled as `ORDER_STATUS=REFUNDED` — **incident layer** |
| Retry duplicates successful top-up | Terminal order short-circuit in `processFulfillmentForOrderInner`; eligibility / duplicate dispatch tests | Provider sandbox E2E still required |
| Missing idempotency key | HTTP 400 `checkout_idempotency_required` | **OK** for API contract |

**Restricted-region payment:** Global `blockRestrictedCountries` on app (`app.js`); pricing quote tests (`restrictedCountries.test.js`); checkout compliance `topupComplianceAssert` / `HttpError` 403 in controller paths. Fulfillment never runs without server-confirmed payment + gate (`phase1FulfillmentPaymentGate.js`).

---

## 7. Tests added

| File | Purpose |
|------|---------|
| `server/test/moneyPathStateMachineAudit.test.js` | Unit assertions: invalid order/payment/fulfillment transitions; queue preconditions; `evaluatePhase1CompoundIntegrity`; canonical derive |

**Existing tests (not added here) that cover required scenarios:**

- Duplicate webhook / duplicate fulfillment: `phase1Resilience.integration.test.js`, `transactionFortressConcurrency.integration.test.js`, `stripeWebhookHttpChaos.integration.test.js`, `sprint4PaymentLoopProof.integration.test.js`, `phase1MoneyPath.test.js` (P2002).
- Failed provider / duplicate dispatch: `webTopupFulfillmentFailure.integration.test.js`, `fulfillmentEligibility.test.js`.
- Restricted region HTTP: `restrictedCountries.test.js`, `topupComplianceAssert.test.js`.

---

## 8. Tests run (commands and results)

| Command | Result |
|---------|--------|
| `npm --prefix server test` | **PASS** (exit 0) |
| `npm --prefix server run test:ci` | **PASS** (exit 0) |
| `npm --prefix server run verify:local-pricing` | **PASS** (exit 0) |
| `npm --prefix server run doctor:super-system` | **PASS** (exit 0; WARN only) |

---

## 9. Unresolved blockers — Stripe Live

- Do **not** enable live keys per mission rules.
- Before go-live: run controlled proof scripts already in `package.json` (`proof:*`, `phase1:launch-readiness`), confirm env + webhook endpoints + DB migrations in staging.

---

## 10. Unresolved blockers — Provider Live (sandbox E2E)

- **Safe to proceed to Provider Sandbox E2E** from a **state-machine and idempotency** perspective: automated tests passed; duplicate webhook and fulfillment idempotency are explicitly tested under PostgreSQL.
- Remaining: **real** sandbox credentials, rate limits, and operator-specific failure modes — **not** fully provable by unit tests alone.

---

## 11. Files changed (this audit)

- `server/test/moneyPathStateMachineAudit.test.js` (new)
- `MONEY_PATH_STATE_MACHINE_AUDIT_20260503120000.md` (this report)

---

## 12. Recommended next steps

1. Run Reloadly (or chosen provider) **sandbox** end-to-end with **test** Stripe + single webhook forwarder.
2. Align support runbooks with **post-payment incident** fields vs `orderStatus`.
3. Add metrics/dashboards for “PAID + no terminal attempt” and “PROCESSING stuck” if not already in production observability.
