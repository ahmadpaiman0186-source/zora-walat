# CORE-11 Financial Control and Settlement Boundary

**Date:** 2026-05-29  
**Status:** **POLICY FILED** — not active (real-money **NO-GO**)

---

## 1. Principles

| # | Rule |
|---|------|
| 1 | **No real-money** without approved exposure limits (CORE-09 caps or successor DR) |
| 2 | **No wallet mutation** without reconciliation proof |
| 3 | **No provider execution** without idempotency proof (CORE-05) |
| 4 | **No refund / reversal automation** without separate money-path DR |
| 5 | **No auto-repair apply** in real-money scope (CORE-08) |
| 6 | **All money-path state transitions** require audit evidence |
| 7 | **Settlement / reconciliation** reviewed before volume expansion |

---

## 2. Exposure (reference CORE-09 defaults)

Until superseded by real-money DR:

| Cap | Default |
|-----|---------|
| Max users | 25 (pilot) or stricter for first real-money week |
| Max daily volume | Finance-approved USD equivalent |
| Max single transaction | Finance-approved |

Real-money caps must be **≤ pilot caps** unless finance DR approves increase.

---

## 3. State transition controls

| Transition | Required proof |
|------------|----------------|
| PENDING → PAID | Stripe webhook + idempotency |
| PAID → PROCESSING | Audit event |
| PROCESSING → FULFILLED | Provider success proof (INV-02) |
| Any → REFUNDED | L-11 / refund DR + audit |

**Forbidden:** FULFILLED on ambiguous provider response.

---

## 4. Reconciliation

| Check | Frequency |
|-------|-----------|
| Order vs Stripe PaymentIntent | Daily during pilot/real-money week 1 |
| Order vs provider reference | Per fulfilled order sample |
| Wallet ledger vs orders | If wallet corridor active |

Gap → **freeze** new transactions (CORE-09 abort pattern).

---

## 5. Settlement review

Before expanding corridors or volume:

- Finance sign-off on settlement path  
- Provider balance / prefund model documented  
- No unsettled charge dispute backlog  

---

## 6. Conservative verdict

Financial controls **documented only**. Real-money **NOT APPROVED**.

---

*End of financial boundary.*
