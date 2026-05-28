# CORE-00 Provider Reliability And Fail-Closed Gate

**Date:** 2026-05-28
**Status:** **GATE SPEC ONLY / NO PROVIDER EXECUTION**

---

## 1. Provider availability checks

| Check | When | Fail-closed |
|-------|------|-------------|
| Provider API reachable | Pre-catalog load | Degrade gracefully; block purchase if unknown |
| Product in catalog | Pre-checkout | Reject invalid SKU |
| Operator/country supported | Pre-checkout | Reject |

**No live provider calls authorized in CORE-00 pack.**

---

## 2. Catalog drift checks

| Drift type | Detection | Action |
|------------|-----------|--------|
| SKU removed | Periodic diff | Hide product |
| Price change | Provider vs cache | Refresh + disclose |
| Denomination mismatch | Validation | Reject |

---

## 3. Product mismatch checks

Order SKU must match provider product ID at fulfillment — mismatch → **hold + ops**.

---

## 4. Timeout / failure handling

| Event | Behavior |
|-------|----------|
| Provider timeout | Fail-closed; no double submit |
| Provider 5xx | Retry policy bounded — **no unbounded money retry** |
| Provider 4xx | User error; no fulfill |

---

## 5. Duplicate request prevention

Idempotency on fulfillment requests keyed by `orderId` / internal idempotency key.

---

## 6. Retry boundaries

| Layer | Retry |
|-------|-------|
| User retry checkout | New session |
| Webhook retry (Stripe) | Idempotent handler |
| Provider fulfill retry | Ops-approved only after state check |

---

## 7. Circuit breaker expectations (future)

Sustained provider failure → disable product corridor; alert ops.

**Not implemented** — design expectation only.

---

## 8. Fail-closed default

When in doubt: **do not fulfill**, **do not charge** (checkout already gated), **surface pending/failed** to user.

---

## 9. Claim boundary

| Claim | Status |
|-------|--------|
| Gate specified | **YES** |
| Provider execution / provider-ready | **NOT CLAIMED** |

---

*CORE-00 provider gate — spec only*
