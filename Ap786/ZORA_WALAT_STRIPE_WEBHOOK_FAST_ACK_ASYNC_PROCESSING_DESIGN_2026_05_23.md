# Zora-Walat — Stripe Webhook Fast ACK + Async Processing Design

**Date:** 2026-05-23
**Status:** **DESIGN ONLY** — not implemented
**Parent:** [CHECKOUT_EXPIRED_TIMEOUT_REMEDIATION_PLAN](./ZORA_WALAT_CHECKOUT_EXPIRED_TIMEOUT_REMEDIATION_PLAN_2026_05_23.md)
**Approval gate:** [IMPLEMENTATION_APPROVAL_GATE](./ZORA_WALAT_STRIPE_WEBHOOK_FAST_ACK_IMPLEMENTATION_APPROVAL_GATE_2026_05_23.md) — **PENDING**
**Evidence:** PR **#50** · root cause **NOT CONFIRMED** · fix **NOT EXECUTED**

---

## 1. Purpose

Define a production-grade webhook ingress pattern that:

1. Satisfies Stripe delivery time limits.
2. Prevents duplicate money-path effects under retry.
3. Preserves auditability and no-pay-no-service boundaries.
4. Applies to **`checkout.session.expired`** and all other Stripe event types on `/webhooks/stripe`.

**This document does not authorize implementation.**

---

## 2. Problem statement (evidence-backed)

| Fact | Source |
|------|--------|
| `checkout.session.expired` deliveries **failed** (timeout) | Filed Stripe PNGs (PR #50) |
| Endpoint `https://zora-walat-api-staging.vercel.app/webhooks/stripe` | Filed captures |
| May 19 Vercel correlation | **BLOCKED / INCONCLUSIVE** |
| Prior slim path optimized `checkout.session.completed` | [DAY1_WEBHOOK_SLIM_PATH](./DAY1_WEBHOOK_SLIM_PATH.md) |

**Design driver:** Even without confirmed root cause, industry best practice and staging failure evidence justify planning **fast ACK after durable receipt**, not synchronous business processing on the HTTP thread.

---

## 3. Target architecture

```text
Stripe POST /webhooks/stripe
        │
        ▼
┌───────────────────┐
│ 1. webhook_received │  ← structured log (no raw payload secrets)
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ 2. Verify signature │  ← Stripe SDK; constant-time compare
└─────────┬─────────┘
          │ invalid → 400 + signature_verified=false
          ▼
┌───────────────────┐
│ 3. Idempotency pre-check │  ← event.id seen? → 200 + duplicate_event_blocked
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ 4. event_persisted │  ← durable outbox row / queue message (txn)
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ 5. ack_returned  │  ← HTTP 2xx to Stripe (≤ target e.g. 5s wall-clock)
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ 6. Async worker   │  ← processing_started → business logic → processing_completed
└───────────────────┘
```

---

## 4. Component design

### 4.1 Ingress handler (sync path)

| Step | Requirement | Max wall-clock budget (target) |
|------|-------------|--------------------------------|
| Parse raw body | Preserve for signature verification | < 100 ms |
| Verify signature | `STRIPE_WEBHOOK_SECRET` (env — never logged) | < 200 ms |
| Extract `event.id`, `event.type` | Log suffixes only | < 50 ms |
| Idempotency lookup | By `event.id` | < 300 ms |
| Persist receipt | Insert outbox with status `RECEIVED` | < 2 s |
| Return 2xx | Only if persist committed | — |

**Hard rule:** No order mutation, wallet credit, fulfillment trigger, or external API call **before** step 5 except DB write for receipt/outbox.

### 4.2 Durable receipt store (outbox)

| Field | Purpose |
|-------|---------|
| `stripe_event_id` (unique) | Idempotency key |
| `event_type` | Routing (`checkout.session.expired`, etc.) |
| `payload_hash` | Integrity; not full PAN/PII |
| `received_at` | Audit |
| `processing_status` | `RECEIVED` → `PROCESSING` → `COMPLETED` / `FAILED` |
| `checkout_session_id` / `order_id` (nullable) | Correlation |
| `attempt_count` | Worker retries |

**Storage:** Existing DB (Prisma) or dedicated queue — decision at Track H; must be **transactional** with ack decision.

### 4.3 Async worker

| Behavior | Detail |
|----------|--------|
| Trigger | Poll outbox / queue consumer / cron tick |
| Claim | Optimistic lock `RECEIVED` → `PROCESSING` |
| Handler map | Per `event.type` — including **`checkout.session.expired`** |
| Expired path | Transition checkout/order to expired/cancelled; **no** fulfillment; no-pay-no-service |
| Failure | `processing_failed` + alert; manual reconciliation queue |
| Success | `processing_completed` + audit row |

### 4.4 Event-type parity

| Event type | Current concern | Planned sync path work |
|------------|-----------------|------------------------|
| `checkout.session.completed` | Slim path exists | Receipt + ack only; worker runs existing domain transition |
| `checkout.session.expired` | **Timeout failures filed** | Receipt + ack only; worker runs expiry transition |
| `charge.refunded` | Partial recovery filed | Same pattern |
| Others | Unknown timeout risk | Same pattern — no exceptions |

---

## 5. Failure modes and responses

| Condition | HTTP to Stripe | Log event | Money-path effect |
|-----------|----------------|-----------|-------------------|
| Invalid signature | **400** | `signature_verified=false` | None |
| Duplicate `event.id` | **200** | `duplicate_event_blocked` | None (idempotent) |
| Persist failure | **500** (Stripe retries) | `event_persisted=false` | None until worker succeeds |
| Worker failure after ack | **200** already sent | `processing_failed` | Fail-closed; no silent fulfill |
| Unpaid / invalid state | N/A (async) | `no_pay_no_service_blocked` | No service delivery |

---

## 6. No-pay-no-service and fail-closed

| Rule | Implementation intent |
|------|----------------------|
| Expired session | Mark order/checkout expired; do **not** grant paid access |
| Missing payment proof | Block fulfillment gates |
| Processing uncertainty | Prefer **blocked** over **granted** |
| Manual override | Explicit approval gate + audit log |

Cross-ref: [MONEY_PATH_ZERO_DUPLICATE_NO_PAY_NO_SERVICE_AUDIT](./MONEY_PATH_ZERO_DUPLICATE_NO_PAY_NO_SERVICE_AUDIT.md), [L10_EXPIRED_CHECKOUT_SESSION_SAFETY](./L10_EXPIRED_CHECKOUT_SESSION_SAFETY.md).

---

## 7. Manual reconciliation path

| Step | Owner | Approval |
|------|-------|----------|
| Detect `processing_failed` or Stripe dashboard failure | SRE / Payments | — |
| Pull redacted outbox row + Stripe event type | Engineering | Ticket |
| Compare order state vs Stripe state | Payments | **Required** |
| Manual state fix (if any) | Engineering | **Explicit user + payments approval** |
| File Ap786 evidence | Operator | Post-action |

**Forbidden:** Autonomous wallet credit, order PAID transition, or fulfillment without approval.

---

## 8. Rollback and kill switch

| Control | Plan |
|---------|------|
| Feature flag | Disable async worker; optionally revert to prior handler (Track H) |
| Kill switch env | `WEBHOOK_ASYNC_PROCESSING_ENABLED=false` (name TBD at implement) |
| Deploy rollback | Vercel previous deployment SHA |
| Stripe | Do **not** disable endpoint without runbook |

---

## 9. Future implementation branch

**Branch name (do not create now):** `feat/stripe-webhook-fast-ack-async-processing`

| Deliverable | Evidence required |
|-------------|-------------------|
| Handler refactor | Unit tests + CI |
| Outbox schema | Migration in Track H only |
| Worker | Integration tests |
| Staging deploy | Replay plan PASS |

---

## 10. Verdict

| Item | Status |
|------|--------|
| Design | **FILED** |
| Implementation approval | **PENDING** |
| Implementation | **NOT EXECUTED** |
| Root cause | **NOT CONFIRMED** |
| Production / pilot | **NO-GO** |

---

*Fast ACK design · plan only · Track H required for code*

