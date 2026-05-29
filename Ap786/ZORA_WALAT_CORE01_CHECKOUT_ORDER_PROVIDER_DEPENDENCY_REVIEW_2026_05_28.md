# CORE-01 Checkout / Order / Provider Dependency Review

**Date:** 2026-05-28
**Parent:** [CORE-01 readiness review](./ZORA_WALAT_CORE01_PROVIDER_CATALOG_RELOADLY_READINESS_REVIEW_2026_05_28.md)
**Aligns with:** [CORE-00 payment webhook gate](./ZORA_WALAT_CORE00_PAYMENT_WEBHOOK_ORDER_SAFETY_GATE_2026_05_28.md)

---

## 1. Checkout dependency

| Step | Dependency | Repo module | Gap |
|------|------------|-------------|-----|
| Product + operator selection | Client catalog / server validation | `ZoraWalatTopUp.tsx`, `allowedCheckout.js` | Mock vs server drift |
| Trusted pricing | Server pricing engine | `pricingEngine.js`, `catalogResolver.js` | Provider cost accuracy |
| Stripe session create | Stripe API (not called in CORE-01) | Checkout controller layer | Live proof pending |
| Metadata binding | Order ID, operator, product type | `topupOrderPayload.js`, Stripe metadata constants | Correlation proof pending |

**Checkout is blocked for data/calling at server boundary (Phase 1).**

---

## 2. Webhook dependency

| Requirement | Observation | Status |
|-------------|-------------|--------|
| Signature verification | Slim webhook tests reference fast 400 on bad signature | **Unit tested; staging STR-02 gaps OPEN** |
| `checkout.session.completed` → PAID | Webhook handlers in `webtopupWebhookHandlers.js` | **NOT FULLY PROVEN staging** |
| Amount mismatch fail-closed | Documented in Phase 1 profit report | **Policy present** |
| Expired / cancelled sessions | L-9/L-10 evidence in Ap786 | **Partial staging history** |

Provider fulfillment **must not** proceed without webhook-confirmed paid state.

---

## 3. Paid / unpaid order state dependency

| State | Provider action allowed? |
|-------|-------------------------|
| PENDING / unpaid | **NO fulfillment** |
| PAID (confirmed) | Fulfillment queue eligible |
| FULFILLMENT_PROCESSING | Provider invoke in flight |
| Terminal (fulfilled / failed / refunded) | No duplicate provider POST without idempotency |

State machine: `webtopupStateMachine.js` — **production transitions NOT PROVEN end-to-end in CORE-01.**

---

## 4. Provider fulfillment dependency

| Link | Description |
|------|-------------|
| Order → executor | `webTopupFulfillmentExecutor.js` selects provider from registry |
| Provider selection | `WEBTOPUP_FULFILLMENT_PROVIDER` env name (default `mock`) |
| Reloadly path | Only AF + airtime via `reloadlyWebTopupProvider` |
| Outcome → order update | Fulfillment result mapped to terminal status |

**Provider fulfillment depends on paid state + product type + operator map + provider availability — all must pass before POST.**

---

## 5. No-pay-no-service invariant

| Check | Location |
|-------|----------|
| Fulfillment skips unpaid | `fulfillmentEligibility.js`, Phase 1 docs |
| Success URL alone insufficient | Documented Super-System policy |
| Wallet top-up separate path | Different API surface — not mixed in this review |

**Invariant: documented and partially coded — NOT production-proven.**

---

## 6. Duplicate webhook / order dependency

| Control | Module |
|---------|--------|
| Stripe event id dedupe | Webhook handler layer |
| Order idempotency keys | Checkout / order create |
| Fulfillment attempt uniqueness | DB + service layer |
| Reloadly custom identifier | Provider correlation |

Staging replay evidence (STR-02/STR-03) shows **gaps** — duplicate safety **NOT FULLY PROVEN in deployed staging.**

---

## 7. Failed fulfillment dependency

| Scenario | Expected | Current |
|----------|----------|---------|
| Provider hard fail after PAID | Order → failed; user notified; refund/manual review | Handlers exist — **runbook proof PENDING** |
| Provider timeout | Stuck → reconcile → manual | Reconciliation engine referenced |
| Partial success | Inquiry + truth compare | Code present — **evidence PENDING** |

---

## 8. Refund / manual review placeholder

Per CORE-00 policy:

- Refund automation for failed top-up after PAID — **NOT PROVEN as production-safe**
- Manual review queue — **placeholder only**
- Support escalation — see [CORE-00 trust gate](./ZORA_WALAT_CORE00_RECEIPT_SUPPORT_AND_USER_TRUST_GATE_2026_05_28.md)

---

## 9. Evidence needed before sandbox / pilot

| Evidence ID | Description | Status |
|-------------|-------------|--------|
| CORE1-EV-CHK-01 | Checkout create → Stripe session (sandbox, redacted) | **PENDING** |
| CORE1-EV-CHK-02 | Webhook PAID transition log correlated to order ID | **PENDING** |
| CORE1-EV-CHK-03 | Unpaid order → zero fulfillment attempts | **PENDING** |
| CORE1-EV-CHK-04 | Paid → provider invoke → terminal state trace | **PENDING** |
| CORE1-EV-CHK-05 | Failed fulfillment → user state + ops alert | **PENDING** |
| CORE1-EV-CHK-06 | Duplicate webhook negative test | **PENDING** |

**Controlled pilot: NO-GO until evidence filed and approved.**

---

*CORE-01 checkout/order dependency review — no real-money-ready claim*
