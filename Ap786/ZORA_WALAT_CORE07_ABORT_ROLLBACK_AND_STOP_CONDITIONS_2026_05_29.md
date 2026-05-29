# CORE-07 Abort, Rollback, and Stop Conditions

**Date:** 2026-05-29  
**Drill status:** **NOT EXECUTED**

---

## 1. Immediate stop triggers (operator: “CORE-07 ABORT”)

| # | Condition | Severity | Default action |
|---|-----------|----------|----------------|
| S1 | **Mode ambiguity** — cannot confirm sandbox | Critical | Abort; no provider call |
| S2 | **Live credential suspicion** — prod host/secret | Critical | Abort; rotate review |
| S3 | **Provider timeout** | High | Abort; no retry |
| S4 | **Ambiguous provider response** | High | Abort; pending only |
| S5 | **Duplicate idempotency key conflict** | Critical | Abort; no second POST |
| S6 | **Missing audit evidence** when money path touched | High | Abort or fail-closed hold |
| S7 | **Payment or wallet mutation risk** detected | Critical | Abort; reconcile |
| S8 | **Unexpected provider charge** (non-sandbox) | Critical | Abort; finance review |
| S9 | **Repeated attempt risk** (auto-retry, double-click) | Critical | Abort |
| S10 | **Operator uncertainty** | High | Abort |

---

## 2. Rollback posture (drill)

| Asset | Rollback expectation |
|-------|---------------------|
| Order status | Must not advance to FULFILLED; revert to pre-drill snapshot if any test row created |
| Wallet | **No** balance change |
| Stripe | **No** live charge; void test intents if accidentally created (separate approval) |
| Provider | No compensating top-up; document reference id only |
| Config / env | **No** change in drill — if changed, restore from git + secret rotation DR |

**Note:** Preferred drill path = **no DB write**. If write occurred, rollback requires **separate** data DR — not in CORE-07 scope.

---

## 3. Fail-closed defaults

| Uncertainty | Outcome |
|-------------|---------|
| Payment proof unknown | **BLOCK** delivery |
| Provider proof unknown | **PENDING_REVIEW** / **BLOCK** |
| Sandbox mode unknown | **ABORT** |
| Audit incomplete on money path | **FAIL_CLOSED** |

---

## 4. Post-abort evidence

| Required | ID |
|----------|-----|
| Abort reason code (S1..S10) | CORE7-EV-019 |
| Timestamp UTC | CORE7-EV-019 |
| Last safe system state | CORE7-EV-007 |
| No delivery without proof attestation | CORE7-EV-017 |

---

## 5. Conservative verdict

Abort/stop policy **FILED ONLY**. No drill executed. Provider proof **NOT VERIFIED**. Production / real-money / pilot / launch **NO-GO**.

---

*End of abort / stop conditions.*
