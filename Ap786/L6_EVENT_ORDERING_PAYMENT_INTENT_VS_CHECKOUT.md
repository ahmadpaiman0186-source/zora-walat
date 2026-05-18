# L-6 — Event ordering safety (`payment_intent.succeeded` vs `checkout.session.completed`)

**Status:** **PASS (automated)** — staging multi-event replay **PENDING** approval  
**Date:** 2026-05-18 (tests added 2026-05-18)  
**Scope:** Hosted Stripe Checkout / Phase 1 mobile top-up on staging architecture  
**Rules:** No secrets, raw webhook payloads, keys, JWTs, PII, or full Stripe object ids in this file.

---

## 1. Purpose

Prove that **out-of-order** Stripe delivery does not leave money-path state inconsistent for hosted checkout:

| Scenario | Required safe behavior |
|----------|------------------------|
| `payment_intent.succeeded` **before** `checkout.session.completed` | Order must not reach PAID/fulfillment from PI alone; PAID when checkout completes |
| `checkout.session.completed` **before** `payment_intent.succeeded` | PAID from checkout; late PI must not double-fulfill or corrupt terminal state |
| Duplicate / late `payment_intent.succeeded` | Must not change final order incorrectly |
| **Authority** | `checkout.session.completed` is the **authoritative** PAID event for Phase 1 hosted checkout |

---

## 2. Architecture verdict (desk review) — **PASS**

| Layer | Finding |
|-------|---------|
| **Documented authority** | `server/src/lib/paymentCompletionLinkage.js` — `authoritativeStripeEventType: 'checkout.session.completed'` |
| **Slim hosted path** | `server/api/slimStripeWebhookCheckoutCompleted.mjs` — only events with valid `metadata.internalCheckoutId` enter slim PAID processing |
| **PI without Zora webtopup metadata** | `server/api/slimStripeWebhookHandler.mjs` — `payment_intent.succeeded` with empty `metadata` or without `metadata.source === WEBTOPUP_STRIPE_PI_METADATA_SOURCE` is **unmatched** → fast **200** ack, **no** `getHandler()` cold start |
| **WebTopup PI path** | PI with `topup_order_id` + Zora `metadata.source` hands off to full Express — **separate product surface**, not Phase 1 hosted checkout |
| **State machine** | `server/test/orderStateSafetyAudit.test.js` — API cannot authorize L3 → PAID; paid requires Stripe webhook authority |
| **Replay eligibility** | `paymentCheckoutPendingForPhase1CheckoutSessionPaidReplay` — only eligible pending/checkout-created rows accept paid replay |

**Conclusion:** Hosted checkout PAID state is **not** designed to depend solely on `payment_intent.succeeded`. PI-first delivery is expected to be a **no-op or fee-side effect** until `checkout.session.completed` correlates via `internalCheckoutId`.

---

## 3. Ordering matrix (expected behavior)

| Order of arrival | Phase 1 hosted checkout expected behavior |
|------------------|---------------------------------------------|
| `checkout.session.completed` first | PAID persisted; fulfillment scheduled; PI later may attach fee metadata without extra fulfillment |
| `payment_intent.succeeded` first (no Zora PI metadata) | Slim **ignored** ack; order stays unpaid until checkout completes |
| `payment_intent.succeeded` first, then `checkout.session.completed` | Order becomes PAID **once** on checkout; **one** fulfillment attempt |
| `checkout.session.completed` first, then duplicate PI | PAID unchanged; fulfillment count stays **1**; fee capture idempotent |
| Only PI, never checkout completed | Order remains unpaid in hosted model — operational runbook item, not an Ap786 staging pass |

---

## 4. Automated test coverage — **PASS**

### Primary integration suite

**File:** `server/test/integrations/stripeWebhookHttpChaos.integration.test.js`  
**Requires:** `TEST_DATABASE_URL` / `DATABASE_URL` (skipped when no DB URL)

| Test name | What it proves |
|-----------|----------------|
| `interleave: payment_intent.succeeded before checkout.session.completed (order becomes paid once)` | PI with **empty metadata** → 200; order stays **PENDING** with **0** fulfillment attempts until checkout; then PAID/FULFILLED; **1** fulfillment attempt |
| `interleave: checkout.session.completed before payment_intent.succeeded (single fulfillment, fee idempotent)` | Checkout first → paid; **two** duplicate PI deliveries → still **1** fulfillment; fee field unchanged |
| `L-6: late duplicate payment_intent.succeeded after checkout completed does not increase fulfillment` | After checkout PAID, **two** late PI events → fulfillment count remains **1** |

### Supporting unit / audit tests

| File | Relevance |
|------|-----------|
| `server/test/paymentCompletionLinkage.test.js` | Authoritative event type + session row integrity contract |
| `server/test/orderStateSafetyAudit.test.js` | Paid transition authority; duplicate paid rejected at core layer |
| `server/test/webhookTruthLayer.test.js` | Checkout session completed truth validation |
| `server/test/slimStripeWebhookEntrypoint.test.js` | Fixture-shaped PI fast-acks without `getHandler()` |

### Slim entrypoint (ordering-related)

| File | Relevance |
|------|-----------|
| `server/test/slimStripeWebhookCheckoutCompleted.test.js` | Classifier: hosted path only when `internalCheckoutId` shape valid |

**Coverage summary:** Core L-6 interleave scenarios are **covered in integration tests** when the integration DB is available. No new payment code changes were required for this evidence pass.

---

## 5. Staging / live replay — **PENDING**

| Item | Status |
|------|--------|
| Stripe CLI `trigger` multi-event ordering on staging | **Not run** (per Day 1 gate) |
| Operator `status-check` across delayed deliveries | **Not run** |
| Vercel log review for ordering breadcrumbs | **Not run** |

**Confirmation gate (unchanged):**

> **STOP:** Scripted multi-event replay on staging requires **“Approved: L-6 ordering proof on staging”**.

Allowed in future runs: event **type**, id **suffixes**, transition **result**, latency buckets — **not** raw JSON or signing secrets.

---

## 6. Remaining gaps (optional)

| Gap | Notes |
|-----|--------|
| Slim-path PI-before-checkout without Express (mocked DB) | Covered indirectly: PI fast-ack on slim + Express interleave tests |
| Only-PI-never-checkout operational alert | Runbook / monitoring — not a unit test |
| Late PI after terminal **FULFILLED** | Optional future integration case |

---

## 7. L-6 verdict

| Layer | Verdict |
|-------|---------|
| Desk / code authority | **PASS** |
| Automated tests (integration + unit anchors) | **PASS** |
| Staging live multi-event replay | **PENDING** |
| **Overall L-6** | **PASS (automated)** — staging replay still **PENDING** |

**Investor read:** Event ordering for hosted checkout is **covered by automated tests** in the repository (PI-before-checkout does not PAID; late PI does not add fulfillment). **Live staging replay** remains gated and was **not** executed.
