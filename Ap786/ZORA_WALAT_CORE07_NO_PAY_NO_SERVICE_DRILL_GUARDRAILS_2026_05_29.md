# CORE-07 No-Pay-No-Service Drill Guardrails

**Date:** 2026-05-29  
**Aligns with:** CORE-02 NPNS rules, CORE-06 delivery proof kernel  
**Drill status:** **NOT EXECUTED**

---

## 1. Kernel laws (drill session)

| # | Law |
|---|-----|
| 1 | **No delivery without provider success proof** (INV-02). |
| 2 | **No service without payment proof** where money path applies (INV-03). |
| 3 | **Ambiguous provider → pending / blocked**, never **FULFILLED** (INV-06). |

---

## 2. Mandatory behaviors during drill

| Condition | Required system / operator behavior |
|-----------|-----------------------------------|
| Provider **fails** | Service **must not** be marked delivered |
| Provider **times out** | Service **must not** be marked delivered |
| Provider status **ambiguous** | Order stays **blocked** or **pending review** |
| Sandbox / money mode **not confirmed** | **No** delivery claim; drill **abort** |
| Payment proof **absent** | Service **must not** be marked delivered |
| Payment proof **ambiguous** | Service **must not** be marked delivered |
| Provider proof **absent** | Order **blocked** / **pending review** |
| Provider proof **ambiguous** | Order **blocked** / **pending review** |

---

## 3. Forbidden without separate approval

| Action | Separate approval required |
|--------|--------------------------|
| Refund execution | Yes — L-11 / money-path DR |
| Provider retry / second attempt | Yes — CORE-07 duplicate guardrails + new phrase |
| Wallet correction | Yes — wallet DR |
| Mark order **FULFILLED** | Yes — only after CORE7-EV-011/017 PASS |
| Auto-repair apply | **Always forbidden** |

---

## 4. CORE-06 classify-only use in drill

After drill (or with exported proof bundle), operator may run **local** `evaluateNoPayNoServiceDelivery` on a **sanitized fixture** — not wired to live DB in v1.

| CORE-06 decision | Drill meaning |
|------------------|---------------|
| `ALLOW_DELIVERY` | Proof bundle satisfied **in classify-only sense** — **does not** authorize marking delivered in production |
| `BLOCK_NO_PAYMENT` | Stop drill; investigate |
| `BLOCK_NO_PROVIDER_PROOF` | Stop; no delivery |
| `BLOCK_AMBIGUOUS` | Stop; reconcile |
| `PENDING_REVIEW` | Hold; ops review |
| `FAIL_CLOSED` | Stop drill |

Evidence: **CORE7-EV-011**, **CORE7-EV-017**.

---

## 5. UX / operator messaging

During drill, user-visible copy must **not** claim:

- “Top-up delivered”  
- “Payment complete — airtime sent”  
- Any **success** implying MNO credit without provider proof  

Acceptable: “Sandbox drill — no customer impact”, “Processing — test only”.

---

## 6. Conservative verdict

No-pay-no-service enforcement in **production** is **NOT VERIFIED**. Drill guardrails are **FILED ONLY**. Sandbox drill **NOT EXECUTED**. Production / real-money / pilot / launch **NO-GO**.

---

*End of NPNS drill guardrails.*
