# L-10 — Expired checkout session safety

**Verdict:** **PASS (automated)** — staging Dashboard expire **not run** (not required for L-10 proof)  
**Date:** 2026-05-18  
**Rules:** No secrets, JWTs, env values, API keys, customer PII, or raw webhook payloads.

---

## 1. Goal

Prove `checkout.session.expired` is safe:

- Does **not** mark order **PAID**
- Does **not** trigger fulfillment
- Does **not** create a fake order for unknown correlation ids
- Known **PENDING** checkout may move to **CANCELLED** + `PAYMENT_FAILED` (intentional business logic)
- Webhook returns **200** / safe ack (including slim fast-ack for unmatched metadata)

**Out of scope:** refunds, `checkout.session.completed` resend, live Stripe Dashboard expire (optional corroboration only).

---

## 2. Code paths (desk)

| Layer | Location | Behavior |
|-------|----------|----------|
| Slim classifier | `server/api/slimStripeWebhookHandler.mjs` — `stripeEventSlimUnmatchedFastAck` | Missing/invalid `internalCheckoutId` → unmatched fast ack |
| Slim HTTP | same — `handleSlimStripeWebhookPost` | Unmatched → **200** `{ ok: true, status: 'ignored', reason: 'unmatched_event' }`; no `getHandler()` |
| Express webhook | `server/src/routes/stripeWebhook.routes.js` | Valid id + **PENDING** row → **CANCELLED**, `PAYMENT_FAILED`, `failureReason: checkout_session_expired`; invalid/missing id → early return; unknown id → no row created |
| L-7 overlap | `Ap786/L7_UNMATCHED_STRIPE_EVENT_SAFETY_PLAN.md` | Expired unknown id + pending cancel covered in chaos suite |

---

## 3. Commands run (focused, local only)

```powershell
cd C:\Users\ahmad\zora_walat\server

# Classifier (includes 2× checkout.session.expired cases)
node --test test/slimStripeWebhookUnmatchedFastAck.test.js

# Slim serverless entry — expired without metadata (synthetic whsec via chaos preload)
node --import ./test/integrations/registerChaosWebhookEnv.mjs --test --test-name-pattern "checkout.session.expired" test/slimStripeWebhookEntrypoint.test.js

# Integration DB (TEST_DATABASE_URL + registerChaosWebhookEnv)
node --import ./test/integrations/preloadTestDatabaseUrl.mjs --import ./test/integrations/registerChaosWebhookEnv.mjs --test --test-name-pattern "checkout.session.expired" test/integrations/stripeWebhookHttpChaos.integration.test.js
```

**Prerequisites:** `TEST_DATABASE_URL` → local `zora_walat_test` (P-1). No live Stripe API calls.

---

## 4. Test results summary

| Suite | Tests (expired-focused) | Result |
|-------|-------------------------|--------|
| `slimStripeWebhookUnmatchedFastAck.test.js` | 2 expired classifier + 6 related | **8/8 PASS** |
| `slimStripeWebhookEntrypoint.test.js` | 1 slim fast-ack expired | **1/1 PASS** |
| `stripeWebhookHttpChaos.integration.test.js` | 2 HTTP chaos expired | **2/2 PASS** |

**Total expired-focused automated proof:** **11/11 PASS**

---

## 5. Observed outcomes (enum-only)

### 5a. Unknown `internalCheckoutId` (integration)

| Field | Value |
|-------|--------|
| `WEBHOOK_HTTP` | **200** |
| `WEBHOOK_BODY_RECEIVED` | **true** |
| `PAYMENT_CHECKOUT_ROW` | **none** (no fake order) |
| `FULFILLMENT_ATTEMPT_COUNT` | **0** |
| `ORDER_STATUS` | n/a (no row) |

### 5b. Known pending checkout (integration)

| Field | Value |
|-------|--------|
| `WEBHOOK_HTTP` | **200** |
| `ORDER_STATUS` | **CANCELLED** |
| `PAYMENT_STATUS` | **PAYMENT_FAILED** |
| `ORDER_STATUS_PAID` | **false** (not `PAID` / `FULFILLED`) |
| `FULFILLMENT_ATTEMPT_COUNT` | **0** |
| `FAILURE_REASON_CLASS` | `checkout_session_expired` (enum label only) |

### 5c. Expired without metadata (slim fast-ack)

| Field | Value |
|-------|--------|
| `WEBHOOK_HTTP` | **200** |
| `SLIM_STATUS` | `ignored` |
| `SLIM_REASON` | `unmatched_event` |
| `STRIPE_EVENT_TYPE` | `checkout.session.expired` |
| `FULL_HANDLER_INVOKED` | **false** |

---

## 6. Pass criteria mapping

| Criterion | Result |
|-----------|--------|
| Expired does not PAID | **PASS** |
| No fulfillment | **PASS** — count **0** in all cases |
| No fake order on unknown id | **PASS** |
| Pending → CANCELLED only (intentional) | **PASS** |
| Webhook safe-acks | **PASS** — **200** / slim ignored |
| No live Stripe used | **PASS** |
| Evidence enum-only | **PASS** |

---

## 7. Manual Stripe action required?

| Action | Required for L-10 PASS? |
|--------|-------------------------|
| Dashboard “expire session” on staging | **No** — automated proof sufficient |
| Stripe CLI trigger | **No** — not run |

Optional staging corroboration remains gated: `Approved: L-10 expired checkout staging proof` in `DAY2_L8_L13_EXECUTION_PLAN.md`.

---

## 8. Verdict

| Layer | Verdict |
|-------|---------|
| Classifier + slim fast-ack | **PASS** |
| Express + integration DB (signed fixture POST) | **PASS** |
| **L-10 overall** | **PASS (automated)** |
| Staging live expire event | **PENDING** (optional; not run) |

**Relation to L-9:** L-9 proved unpaid abandon (`PENDING` / `CHECKOUT_CREATED`). L-10 proves webhook-driven expiry cancels a **pending** row without pay or fulfill.
