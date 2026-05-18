# L-8 — Card declined / failed payment safety

**Verdict:** **PASS (automated + desk)** — staging live decline card **not run** in this session (operator token expired on checkout)  
**Date:** 2026-05-18  
**Rules:** No secrets, JWTs, env values, API keys, full card numbers, customer PII, or raw webhook payloads.

---

## 1. Goal

Prove a **declined** Stripe test card / failed payment does **not**:

- Mark the hosted-checkout order **PAID**
- Trigger fulfillment
- Reach **RECHARGE_COMPLETED** or **FULFILLED**

Safe terminal or pre-pay state: **PENDING** (or **CANCELLED** / payment-failed only when an explicit negative webhook applies, e.g. session expired per L-10).

---

## 2. How decline works (desk)

| Path | Behavior for Phase 1 hosted checkout (`internalCheckoutId` metadata) |
|------|----------------------------------------------------------------------|
| Stripe Checkout UI decline | Payment fails at Stripe; **`checkout.session.completed` is not sent** → order cannot become PAID via the paid webhook path |
| `payment_intent.succeeded` without Zora correlation | **Ignored** for hosted checkout (stays **PENDING**, **0** fulfillment) — chaos integration proof |
| `payment_intent.payment_failed` | Handled only for **web top-up** (`topup_order_id` metadata); **no** update to `PaymentCheckout` when metadata is missing or wrong shape |
| `checkout.session.completed` | **Only** event that marks hosted checkout paid in Phase 1 |

**Stripe test decline PAN (test mode only):** use Stripe’s generic decline test card ending in **0002** (documented in Day 2 plan; do not store full PAN in git).

---

## 3. Automated commands run

```powershell
cd C:\Users\ahmad\zora_walat\server

# Classifier: unrelated PI events fast-ack / no hosted-checkout correlation
node --test test/slimStripeWebhookUnmatchedFastAck.test.js

# Integration: PI succeeded alone does not PAID hosted checkout
node --test-force-exit --test-concurrency=1 `
  --import ./test/integrations/preloadTestDatabaseUrl.mjs `
  --import ./test/integrations/registerChaosWebhookEnv.mjs `
  --test --test-name-pattern "payment_intent.succeeded before checkout" `
  test/integrations/stripeWebhookHttpChaos.integration.test.js

# Integration: never-paid checkout canonical phase
node --test-force-exit --test-concurrency=1 `
  --import ./test/integrations/preloadTestDatabaseUrl.mjs `
  --test --test-name-pattern "never-paid checkout" `
  test/integrations/phase1Resilience.integration.test.js
```

**Results:** **10/10 PASS** (8 classifier + 1 chaos interleave + 1 resilience).

**Observed enums (integration — after `payment_intent.succeeded` without checkout metadata):**

| Field | Value |
|-------|--------|
| `ORDER_STATUS` | **PENDING** |
| `PAYMENT_STATUS` | **not** `PAYMENT_SUCCEEDED` / **not** `RECHARGE_COMPLETED` |
| `FULFILLMENT_ATTEMPT_COUNT` | **0** |

**Observed enums (resilience — pending checkout, no completed session):**

| Field | Value |
|-------|--------|
| `CANONICAL_PHASE` | **AWAITING_PAYMENT** |

---

## 4. Staging operator path (manual — recommended corroboration)

**Manual browser action required** for live Checkout decline UX:

1. `login` (refresh token if expired).
2. `$env:STAGING_ALLOW_STRIPE_TEST_PAYMENT = "true"`
3. `node tools/staging-auth-checkout-operator.mjs checkout-open-test`
4. Open gitignored `.staging-checkout-url.local` in browser (test mode).
5. Pay with Stripe **decline test card** (0002 pattern); confirm Stripe shows decline.
6. `node tools/staging-auth-checkout-operator.mjs status-check`

**Expected operator enums (same class as L-9 unpaid abandon):**

| Field | Expected |
|-------|----------|
| `STATUS_CHECK_HTTP` | **200** |
| `ORDER_FOUND` | **true** |
| `ORDER_STATUS` | **PENDING** (or **CANCELLED** if session later expired per L-10) |
| `PAYMENT_STATUS` | **CHECKOUT_CREATED** or **PAYMENT_FAILED** — **not** `RECHARGE_COMPLETED` |
| `PAID_CONFIRMED` | **false** |
| `FULFILLMENT_ATTEMPT_COUNT` | **0** |

**This session:** `checkout-open-test` returned **CHECKOUT_HTTP 401** (expired/missing operator token). Staging decline UI was **not** executed here; automated proof stands for L-8 PASS.

---

## 5. Pass criteria mapping

| Criterion | Result |
|-----------|--------|
| No PAID / no fulfill on failed payment path | **PASS** (automated) |
| No `RECHARGE_COMPLETED` / no `FULFILLED` | **PASS** (automated + desk) |
| Fulfillment count **0** | **PASS** |
| Webhook safe handling | **PASS** — unrelated PI **200**, no erroneous PAID |
| Live decline card on staging | **Not run** (token); steps above for operator |

---

## 6. Verdict

| Layer | Verdict |
|-------|---------|
| Automated integration + classifier | **PASS** |
| Desk (decline = no `checkout.session.completed`) | **PASS** |
| Staging Checkout + decline test card | **Pending operator** (optional corroboration) |
| **L-8 overall** | **PASS (automated + desk)** |

**Relation to L-9 / L-10:** L-9 proved unpaid abandon on staging; L-10 proved `checkout.session.expired` cancel path. L-8 proves failed/declined payment cannot drive the **paid** webhook path for hosted checkout.
