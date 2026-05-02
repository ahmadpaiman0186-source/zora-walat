# Provider sandbox E2E + reconciliation safety — `20260503190000`

## Scope and method

This report combines **non-secret env verification** (`reloadly:sandbox-readiness`), **automated integration evidence** against a local PostgreSQL (`phase1MoneyPath.test.js`), and **explicit gaps** where a full human-driven flow (Stripe Checkout UI + `stripe listen` + Reloadly HTTP) was **not** executed in this session. No Stripe live keys, no production Reloadly hosts, no pricing logic changes, no idempotency removals.

---

## 1. Provider integration mode (observed, no secrets printed)

| Check | Result |
|--------|--------|
| `npm --prefix server run reloadly:sandbox-readiness` | Exit **1** — **NOT READY** for a real Reloadly-labelled attempt |
| `RELOADLY_CLIENT_ID` / `RELOADLY_CLIENT_SECRET` | **present** (values not logged) |
| `RELOADLY_SANDBOX` | **present**; script reported **`RELOADLY_SANDBOX=true`** → Reloadly sandbox hosts only (`server/src/config/env.js` binding) |
| `RELOADLY_OPERATOR_MAP_JSON` | **present** |
| `AIRTIME_PROVIDER` | **missing** in effective env → readiness treats pipeline as **not** Reloadly for airtime dispatch |
| Pipeline (DB, Stripe key, webhook secret, JWT) | **present** per readiness script |

**Ding:** No Phase 1 airtime provider integration under `AIRTIME_PROVIDER=ding` was found in the backend fulfillment path audited; **Reloadly** is the configurable real provider for Phase 1 top-up in this repo.

**Conclusion:** Sandbox **credentials and sandbox flag** load; **Reloadly dispatch is not active** until `AIRTIME_PROVIDER=reloadly` is set (non-secret config — user must set intentionally).

---

## 2. E2E scenario (requested vs executed)

| Step | Executed here? | Evidence |
|------|----------------|----------|
| Create checkout session (HTTP + Stripe test) | **No** (no browser / no `stripe trigger checkout` in this run) | — |
| Complete Stripe test payment | **No** | — |
| Receive webhook | **No** (live HTTP path) | Integration tests + existing `stripeWebhookHttpChaos` suite cover handler elsewhere |
| Trigger fulfillment + provider sandbox HTTP | **No** | Blocked by missing `AIRTIME_PROVIDER=reloadly` for labelled sandbox proof; worker would use **mock** provider in current integration runs |

**Proxy evidence (DB + services, same code paths as production minus real Stripe/Reloadly I/O):**

```text
Command: node --import ./test/integrations/preloadTestDatabaseUrl.mjs --test-force-exit --test-concurrency=1 --test test/integrations/phase1MoneyPath.test.js
Result: pass 8, fail 0
Effective DB: localhost:5433/zora_walat (from preload log)
```

Logs show `provider":"mock"` and `fulfillmentAttempt` **QUEUED** after simulated `checkout.session.completed` application — consistent with **mock** airtime when Reloadly is not selected.

---

## 3. Outcomes: provider success / failure

| Case | Observed |
|------|----------|
| Reloadly sandbox **success** HTTP | **Not observed** (no `--execute` on `phase1-reloadly-sandbox-dispatch-proof.mjs`; preflight would fail without `AIRTIME_PROVIDER=reloadly`) |
| Reloadly **failure** / error response | **Not observed** live; **failure classification + retry policy** covered in unit/integration suites (`fulfillmentProcessingService`, `webTopupFulfillmentFailure.integration.test.js`, etc.) |

---

## 4. DB consistency checks (integration)

From `phase1MoneyPath.test.js` run: tests assert transitions on **`PaymentCheckout`** (`orderStatus`, `status`), **`FulfillmentAttempt`**, fee/financial truth, duplicate webhook idempotency (P2002), and anomaly codes on canonical DTO. **All 8 tests passed** in this run.

---

## 5. Failure cases (requested vs evidence)

| Scenario | Evidence this session |
|----------|------------------------|
| Provider returns error | Not exercised against Reloadly API; code paths exist in fulfillment service + tests |
| Webhook delayed | Not timed; Stripe retries webhooks; idempotent `evt_` storage prevents double-apply |
| Retry behavior | BullMQ/worker retry knobs + `processFulfillmentForOrder` claim semantics — see existing integration tests |

---

## 6. No duplication (double fulfillment / double provider call)

- **Duplicate Stripe event id:** `phase1MoneyPath` integration includes **“duplicate Stripe webhook event id → idempotent DB reject (P2002)”** — **passed**.
- **Second fulfillment attempt #1:** Blocked by DB unique `(orderId, attemptNumber)` + `ensureQueuedFulfillmentAttempt` (see state machine audit).
- **Real Reloadly double POST:** **Not observed**; second `processFulfillmentForOrder` run with no `QUEUED` attempt should no-op (documented in `phase1-reloadly-sandbox-dispatch-proof.mjs`).

---

## 7. Reconciliation: webhook vs DB gap

**Gap scenario:** Stripe shows **succeeded** payment intent / checkout session, but local row stays **`PENDING`** (webhook never verified or handler failed before commit).

**Safe mechanisms (already in codebase / ops):**

1. **Idempotency:** Replay same `checkout.session.completed` after fixing infra — `applyPhase1CheckoutSessionCompleted` early-exits if order not `PENDING` (`phase1StripeCheckoutSessionCompleted.js`).
2. **Audit trail:** `StripeWebhookEvent` stores processed `evt_` ids; P2002 = duplicate delivery.
3. **Proposed operational reconciliation (no code change required for first pass):**
   - Export Stripe **PaymentIntents** / **Checkout Sessions** (test mode) for the window.
   - Query `PaymentCheckout` where `orderStatus = PENDING` and `createdAt` in window.
   - Join on `stripePaymentIntentId` / `stripeCheckoutSessionId` / metadata `internalCheckoutId`.
   - For **paid in Stripe, unpaid locally:** inspect API logs and `StripeWebhookEvent` for missing `evt_`; re-send event via Stripe Dashboard or `stripe events resend` **only** after confirming no partial DB write.
4. **Longer-term:** Scheduled job comparing Stripe balance transactions vs `PaymentCheckout` paid totals (patterns in `sprint5ReconciliationTraceability`, `reconciliation-scan` scripts).

---

## 8. Files changed

**None** for this mission (audit + report + read-only commands only).

---

## 9. Commands run

| Command | Result |
|---------|--------|
| `npm --prefix server run reloadly:sandbox-readiness` | Exit **1** (not ready — `AIRTIME_PROVIDER` missing) |
| `node … test/integrations/phase1MoneyPath.test.js` (with preload) | **PASS** (8 tests) |

---

## 10. Unresolved before real Reloadly sandbox E2E

1. Set **`AIRTIME_PROVIDER=reloadly`** (and keep **`RELOADLY_SANDBOX=true`**) in the env file that actually wins (`server/.env` / `.env.local` precedence per bootstrap logs).
2. Run one checkout with **Stripe test** card, **`stripe listen --forward-to`** matching `STRIPE_WEBHOOK_SECRET`.
3. Run `npm run proof:phase1:reloadly:sandbox -- --checkout=<id> --dry-run` then `--execute` once, or let the worker consume the queue.

---

## 11. Executive summary table

| Question | Answer |
|----------|--------|
| Real Reloadly sandbox HTTP called? | **No** |
| Stripe Checkout + browser payment completed here? | **No** |
| DB/integration path sound on mock provider? | **Yes** (tests passed) |
| Double fulfillment from duplicate `evt_` in tests? | **No** (idempotent) |

---

## Final verdicts (for user-facing summary)

- **Verdict:** **PARTIAL** — Configuration and automated DB path are consistent; **full provider sandbox E2E was not executed** because **`AIRTIME_PROVIDER` is unset** and no live Stripe checkout was run in this session.
- **Provider behavior:** **Not exercised** against Reloadly API; env indicates **sandbox mode ON** and credentials **loaded**, but **Reloadly is not selected** as the active airtime provider.
- **Fulfillment result:** Integration run shows **mock** provider and **QUEUED** attempts after simulated payment completion; **no real top-up** to Reloadly.
- **Money-risk gaps:** **Cannot certify** real-money or real-provider behavior; **logical** duplicate-webhook protection **verified** in tests. Operational gap: **Stripe paid / local unpaid** requires reconciliation process above.
- **Ready for Stripe Live?** **No** — remain on **test mode**; complete at least one **end-to-end sandbox** drill with **`AIRTIME_PROVIDER=reloadly`** and ops sign-off before any live consideration.
