# CORE-00 Payment / Webhook / Order Safety Gate

**Date:** 2026-05-28
**Status:** **GATE SPEC ONLY / NOT REAL-MONEY-READY**

---

## 1. Payment confirmation boundary

| State | Meaning |
|-------|---------|
| Checkout opened | **Not paid** |
| Stripe `checkout.session.completed` (paid) | Payment confirmed |
| Expired / unpaid | **Not paid** |

Fulfillment **only** after confirmed paid path.

---

## 2. Webhook signature verification

| Rule | Status |
|------|--------|
| Verify Stripe signature on `/webhooks/stripe` | **REQUIRED** (existing product) |
| Invalid signature → 400, no state change | **REQUIRED** |
| Fast-ack path (STR-12) | Merged — runtime proof **PENDING** |

---

## 3. Paid vs unpaid order state

| Terminal | Fulfillment allowed? |
|----------|---------------------|
| `PAID` / confirmed | **YES** (if other gates pass) |
| `PENDING` / unpaid | **NO** |
| `CANCELLED` / expired | **NO** |
| `REFUNDED` | **NO** (new purchase required) |

---

## 4. Order creation boundary

Order / fulfillment record created or advanced **only** through validated webhook or approved internal transition — not client-side alone.

---

## 5. No-pay-no-service invariant

**INV-NPNS-CORE-01:** If payment is not confirmed, **zero** provider fulfillment and **zero** service delivery.

Violation → **SEV-1** incident.

---

## 6. Duplicate webhook prevention

Same `event.id` → idempotent no-op; fulfillment count unchanged.

Align STR-12 / L-5 / L-13 checklists.

---

## 7. Missing webhook behavior

| Scenario | Behavior |
|----------|----------|
| User paid; webhook delayed | Order stays pending; user comms; ops reconcile |
| User paid; webhook never arrives | Manual reconcile via Stripe Dashboard — **ops only** |
| Never assume paid from UI alone | **REQUIRED** |

---

## 8. Failed provider fulfillment

Paid but provider fails → order marked failed/pending refund path; **no silent success**.

Manual review placeholder for refund policy.

---

## 9. Refund / manual review placeholder

Refunds via approved Stripe ops path only — separate L-11 evidence; not expanded in CORE-00.

---

## 10. Claim boundary

| Claim | Status |
|-------|--------|
| Safety gate specified | **YES** |
| Real-money-ready / webhook-ready / payment-ready | **NOT CLAIMED** |
| Post-STR-12 full proof | **PENDING** |

---

*CORE-00 payment/webhook gate — not proven in this pack*
