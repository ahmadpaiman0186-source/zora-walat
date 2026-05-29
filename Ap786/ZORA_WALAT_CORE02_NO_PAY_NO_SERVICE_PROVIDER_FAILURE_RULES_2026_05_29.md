# CORE-02 No-Pay / No-Service Provider Failure Rules

**Date:** 2026-05-29  
**Status:** **POLICY SPECIFICATION ONLY**  
**Does not modify runtime code.**

---

## 1. Principle

**No pay without a path to service, and no “delivered” without provider-confirmed fulfillment.**

When provider execution **fails**, **is unknown**, or **cannot be verified**, the system must **fail closed** from the customer’s perspective: do not imply successful delivery; do not leave ambiguous “success” states without ops review.

---

## 2. Definitions (planning)

| Term | Meaning |
|------|---------|
| **Charged** | Stripe payment captured or wallet debited per money-path rules |
| **Delivered** | User-visible or receipt state claiming service completed |
| **Provider confirmed** | Authoritative provider status + reference ID per acceptance criteria |
| **Fail-closed** | Prefer pending / failed / manual review over false success |

---

## 3. Rules by phase

### 3.1 Before payment

| Condition | Required behavior |
|-----------|-------------------|
| Catalog SKU invalid / disabled | **Block checkout** — no session |
| Provider circuit open (when implemented) | **Block checkout** or show unavailable |
| Price / operator mismatch | **Reject** quote |
| Data or call product not approved | **Reject** — corridor NO-GO |

### 3.2 After payment, before provider POST

| Condition | Required behavior |
|-----------|-------------------|
| Payment confirmed, fulfillment not started | Order **paid**, fulfillment **queued** — not **delivered** |
| Internal error before provider arm | **No deliver**; recovery per ops — **NOT** user success |

### 3.3 Provider execution failed

| Condition | Required behavior |
|-----------|-------------------|
| Provider 4xx (terminal) | **No deliver**; user message: failed / support path |
| Provider 5xx / timeout | **No deliver**; retry only within bounded policy — **no** duplicate send without inquiry |
| Ambiguous 200 (no transaction id) | **Pending verification** — **not delivered** |
| Provider says success, internal state mismatch | **Hold** + reconciliation — **not delivered** |

### 3.4 After provider success claim

| Condition | Required behavior |
|-----------|-------------------|
| Provider reference stored + eligibility checks pass | May transition to **delivered** per corridor spec |
| Reference missing | **NOT delivered** |
| Partial data activation (data corridor) | **Pending** until activation criteria met |

---

## 4. No-pay-no-service matrix (summary)

| Payment state | Provider state | User must NOT see | Allowed user state |
|---------------|----------------|-------------------|---------------------|
| Not paid | Any | “Delivered” | Pending checkout / cancelled |
| Paid | Failed terminal | “Delivered” | Failed + support |
| Paid | Timeout / unknown | “Delivered” | Processing / pending |
| Paid | Confirmed | N/A (if criteria met) | Delivered (when DR accepts criteria) |
| Refunded | Any | “Delivered” | Refunded / closed |

---

## 5. Stripe + provider coupling (planning)

| Scenario | Rule |
|----------|------|
| Stripe paid, provider never called | **NO deliver** — ops + recovery |
| Stripe paid, provider failed | **NO deliver** — refund or manual per playbook |
| Provider success, Stripe not paid | **Investigate** — should not happen in happy path |
| Webhook duplicate | Idempotent — **no** double deliver |

**Stripe proof and provider proof are independent evidence buckets** (CORE2-EV-PAY-03 vs CORE2-EV-SBX-04).

---

## 6. Evidence required to claim rule enforcement

| Evidence ID | Proves | Status |
|-------------|--------|--------|
| CORE2-EV-PAY-01 | Scenario matrix documented | **PENDING** |
| CORE2-EV-PAY-02 | State machine review signed | **PENDING** |
| CORE2-EV-PAY-03 | Sanitized paid→webhook→order trace | **PENDING** |
| CORE2-EV-PAY-04 | Paid-not-fulfilled playbook | **PENDING** |
| CORE2-EV-SBX-05 | Provider fail drill | **PENDING** |

**Claim “no-pay-no-service enforced in production” → FORBIDDEN until evidence **ACCEPTED**.**

---

## 7. Rollback and incident

| Trigger | Action |
|---------|--------|
| False deliver detected | Stop corridor; manual reconciliation |
| Duplicate provider send suspected | Halt auto-retry; ops verify with provider inquiry |
| User charged, no delivery | Support + refund path per IR — **not** silent success |

---

## 8. NO-GO

| Item | Status |
|------|--------|
| Policy filed | **YES** |
| Policy proven in runtime | **NOT VERIFIED** |
| Production enforcement | **NO-GO** |

---

*End of no-pay-no-service rules.*
