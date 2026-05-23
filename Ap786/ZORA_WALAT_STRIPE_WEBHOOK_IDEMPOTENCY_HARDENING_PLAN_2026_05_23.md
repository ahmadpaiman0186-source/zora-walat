# Zora-Walat — Stripe Webhook Idempotency Hardening Plan

**Date:** 2026-05-23
**Status:** **PLAN ONLY**
**Parent:** [CHECKOUT_EXPIRED_TIMEOUT_REMEDIATION_PLAN](./ZORA_WALAT_CHECKOUT_EXPIRED_TIMEOUT_REMEDIATION_PLAN_2026_05_23.md)
**Related:** [FAST_ACK_ASYNC_PROCESSING_DESIGN](./ZORA_WALAT_STRIPE_WEBHOOK_FAST_ACK_ASYNC_PROCESSING_DESIGN_2026_05_23.md) · [L4/L5 staging docs](./L6_EVENT_ORDERING_PAYMENT_INTENT_VS_CHECKOUT.md)

---

## 1. Purpose

Define idempotency and duplicate-event controls for Stripe webhooks so that:

- Stripe retries after timeout do **not** double-charge, double-credit wallets, or double-fulfill.
- **`checkout.session.expired`** and **`checkout.session.completed`** cannot race into inconsistent paid/expired states.
- Production claims require **filed test evidence**, not design intent alone.

**Blockers addressed (when executed):** STRIPE-WH-005, STRIPE-WH-006 (partial).

---

## 2. Threat model

| Scenario | Risk | Current status |
|----------|------|----------------|
| Stripe timeout → retry same `event.id` | Duplicate side effects | **NOT PROVEN** safe (prod) |
| Timeout → retry **before** first completes | Two workers same event | **NOT PROVEN** |
| `completed` then `expired` ordering | Wrong terminal state | **NOT PROVEN** (L-6) |
| Missed webhook entirely | Unpaid fulfill | **NOT PROVEN** (NPS) |
| Manual replay (operator) | Duplicate | **FORBIDDEN** without G-02 |

---

## 3. Idempotency keys

| Key | Scope | Use |
|-----|-------|-----|
| **`stripe_event_id`** (`evt_*` — store hashed/redacted in logs) | Global | Primary dedupe at ingress |
| **`checkout_session_id`** | Checkout-scoped events | Secondary correlation |
| **`order_id`** (internal) | Domain | State machine guard |
| **`payment_intent_id`** (if present) | PI-scoped events | Cross-event dedupe where applicable |

**Rule:** Business mutations require **both** event-id idempotency **and** order-state guard (optimistic version or status enum).

---

## 4. Ingress idempotency (sync path)

```text
IF exists(processed_events, stripe_event_id):
  LOG duplicate_event_blocked
  RETURN 200  // Stripe stops retrying
ELSE:
  BEGIN TX
    INSERT outbox (stripe_event_id, ..., status=RECEIVED)
    INSERT processed_events (stripe_event_id)  // or unique constraint on outbox
  COMMIT
  RETURN 200
```

| Property | Requirement |
|----------|-------------|
| Uniqueness | DB unique index on `stripe_event_id` |
| Race | TX isolation; duplicate insert → catch → 200 |
| Logging | Never log full `evt_*` in prod logs — suffix or hash |

---

## 5. Worker idempotency (async path)

| Step | Guard |
|------|-------|
| Claim job | `UPDATE ... WHERE status=RECEIVED AND id=?` |
| Before PAID transition | Order status must be in allowed set |
| Before EXPIRED transition | Reject if already PAID (unless refund path) |
| Wallet credit | Unique constraint on (order_id, credit_reason) |
| Fulfillment enqueue | Idempotent job id = f(order_id, event_id) |

### 5.1 checkout.session.expired specific rules

| Rule | Behavior |
|------|----------|
| Already EXPIRED/CANCELLED | No-op; log `duplicate_event_blocked` |
| Already PAID | **Do not** downgrade to unpaid without refund workflow |
| In-flight PAYMENT_PENDING | Transition to EXPIRED; block fulfill |
| Unknown order | Log; no fulfill; manual reconciliation |

Cross-ref: [L10_EXPIRED_CHECKOUT_SESSION_SAFETY](./L10_EXPIRED_CHECKOUT_SESSION_SAFETY.md).

---

## 6. Zero duplicate transaction enforcement

| Layer | Control |
|-------|---------|
| DB | Unique constraints on payment records per Stripe reference |
| Application | Check-before-insert in same TX as state transition |
| Fulfillment | Gate: `order.status === PAID` AND payment proof |
| Metrics | Counter `duplicate_event_blocked` — alert if > 0 sustained |

---

## 7. Safe retry behavior

| Actor | Behavior |
|-------|----------|
| **Stripe** | Automatic retry on non-2xx or timeout — **expected** |
| **Application** | 200 after durable receipt even if worker pending |
| **Worker** | Exponential backoff on transient DB errors; max attempts → DLQ |
| **Human** | Resend in dashboard — **FORBIDDEN** without G-02 ticket |

---

## 8. Required tests (before production claim)

| Test ID | Description | Pass criteria |
|---------|-------------|---------------|
| **ID-T-01** | Same `event.id` POST twice | Single outbox row; second returns 200 + `duplicate_event_blocked` |
| **ID-T-02** | Concurrent duplicate POSTs | Exactly one processing outcome |
| **ID-T-03** | Timeout simulation: ack then slow worker + Stripe retry | No double PAID |
| **ID-T-04** | `completed` then `expired` (ordering) | Terminal state consistent with policy |
| **ID-T-05** | `expired` then `completed` (late) | Fail-closed or explicit rejection |
| **ID-T-06** | No wallet double-credit on retry | Balance delta = 1x |
| **ID-T-07** | No double fulfillment job | Job count = 1 |

**Evidence filing:** Results in Ap786 `evidence/stripe-webhook-replay-YYYY-MM-DD/` (folder **not created** until test execution).

---

## 9. Staging vs production

| Environment | Requirement |
|-------------|-------------|
| Staging | All ID-T-01…07 before replay sign-off |
| Production | Re-run subset after deploy; 7-day delivery log clean |

**Today:** Staging tests **NOT EXECUTED**.

---

## 10. Future branch

**Branch (do not create):** `feat/stripe-webhook-fast-ack-async-processing` (shared with fast ACK)
**Test branch (do not create):** `test/stripe-webhook-staging-replay-proof`

---

## 11. Verdict

| Item | Status |
|------|--------|
| Idempotency plan | **FILED** |
| Implementation | **NOT EXECUTED** |
| Prod duplicate safety | **NOT PROVEN** |
| Root cause | **NOT CONFIRMED** |
| Production / pilot | **NO-GO** |

---

*Idempotency plan · plan only · STRIPE-WH-005 remains open until tests filed*

