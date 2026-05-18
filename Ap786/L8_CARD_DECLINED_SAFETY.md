# L-8 — Card declined / failed payment safety

**Verdict:** **PASS** — automated + desk + **staging decline UX** (2026-05-18)  
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

## 4. Staging decline UX proof (operator)

### 4a. Agent session attempt (2026-05-18)

| Step | Result |
|------|--------|
| `login` (no `STAGING_OPERATOR_*` in `.env.local`) | **BLOCKED** — `LOCAL_VALIDATION_ERROR email_required` |
| `status-check` | **BLOCKED** — `TOKEN_EXPIRED true` |
| Disposable register + checkout (smoke path) | Register **201**; `create-checkout-session` **403** (not operator account) |

Staging decline browser step was **not** reached. Operator credentials must be set in the **same** PowerShell session (not committed).

### 4b. Operator runbook (complete locally)

```powershell
cd C:\Users\ahmad\zora_walat\server
$env:STAGING_OPERATOR_EMAIL = "<operator staging email>"
$env:STAGING_OPERATOR_PASSWORD = "<min 10 chars>"
node tools/staging-auth-checkout-operator.mjs login
node tools/staging-auth-checkout-operator.mjs status-check
$env:STAGING_ALLOW_STRIPE_TEST_PAYMENT = "true"
node tools/staging-auth-checkout-operator.mjs checkout-open-test
```

1. Open gitignored `.staging-checkout-url.local` in browser (**test mode** only).
2. Pay with Stripe **decline test card** (PAN ending **0002** — do **not** use **4242**).
3. Confirm Stripe shows decline; **do not** retry with a success card.
4. `node tools/staging-auth-checkout-operator.mjs status-check`

**Expected enums after decline:**

| Field | Expected |
|-------|----------|
| `STATUS_CHECK_HTTP` | **200** |
| `ORDER_FOUND` | **true** |
| `ORDER_STATUS` | **PENDING** (or **CANCELLED** if session expired per L-10) |
| `PAYMENT_STATUS` | **CHECKOUT_CREATED** or safe failed/unpaid — **not** `RECHARGE_COMPLETED` |
| `PAID_CONFIRMED` | **false** |
| `FULFILLMENT_ATTEMPT_COUNT` | **0** |
| `FULFILLMENT_DUPLICATE_SAFE` | **false** (unpaid) |

**Record observed enums in this file §4c when complete (enum-only).**

### 4c. Staging observed enums (post-decline) — **PASS**

**Browser (Stripe Checkout, test mode):** Decline test card ending **0002**; Stripe message: *Your credit card was declined.* No retry with a successful card.

| Field | Value |
|-------|--------|
| `STATUS_CHECK_HTTP` | **200** |
| `ORDER_FOUND` | **true** |
| `ORDER_STATUS` | **PENDING** |
| `PAYMENT_STATUS` | **CHECKOUT_CREATED** |
| `PAID_CONFIRMED` | **false** |
| `FULFILLMENT_ATTEMPT_COUNT` | **0** |
| `FULFILLMENT_DUPLICATE_SAFE` | **false** |

**Not observed:** `RECHARGE_COMPLETED`, `FULFILLED`, `PAID_CONFIRMED true`, fulfillment ≥ 1.

---

## 5. Pass criteria mapping

| Criterion | Result |
|-----------|--------|
| No PAID / no fulfill on failed payment path | **PASS** (automated + staging) |
| No `RECHARGE_COMPLETED` / no `FULFILLED` | **PASS** |
| Fulfillment count **0** | **PASS** |
| Webhook safe handling | **PASS** — unrelated PI **200**, no erroneous PAID |
| Live decline card on staging | **PASS** — browser decline + `status-check` enums above |

---

## 6. Verdict

| Layer | Verdict |
|-------|---------|
| Automated integration + classifier | **PASS** |
| Desk (decline = no `checkout.session.completed`) | **PASS** |
| Staging Checkout + decline test card (browser) | **PASS** |
| **L-8 overall** | **PASS** |

**Relation to L-9 / L-10:** L-9 proved unpaid abandon on staging; L-10 proved `checkout.session.expired` cancel path. L-8 proves failed/declined payment cannot drive the **paid** webhook path for hosted checkout.
