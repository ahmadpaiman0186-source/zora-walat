# CORE-09 Support and Operator Readiness

**Date:** 2026-05-29  
**Status:** **READINESS PENDING** — pilot **NOT EXECUTED**

---

## 1. Support readiness checklist

| ID | Item | Status |
|----|------|--------|
| SUP-01 | Support contact path published for pilot cohort | **PENDING** |
| SUP-02 | Runbook: paid-not-delivered | **PENDING** |
| SUP-03 | Runbook: provider timeout / ambiguous | **PENDING** |
| SUP-04 | Runbook: duplicate charge concern | **PENDING** |
| SUP-05 | Escalation path to engineering on-call | **PENDING** |
| SUP-06 | Response SLA defined (e.g. 4h business) | **PENDING** |
| SUP-07 | Refund language — **no** promise without L-11 DR | **PENDING** |
| SUP-08 | User-facing copy matches NPNS (no false “delivered”) | **PENDING** |

Evidence: **CORE9-EV-SUP**.

---

## 2. Operator readiness

| ID | Item | Status |
|----|------|--------|
| OPS-01 | Operator auth / desk access verified | **PENDING** |
| OPS-02 | `zw-doctor` summary mode trained (read-only) | **PENDING** |
| OPS-03 | Order status-check procedure documented | **PENDING** |
| OPS-04 | Abort phrase trained: `CORE-09 PILOT ABORT` | **PENDING** |
| OPS-05 | Exposure counter dashboard access | **PENDING** |
| OPS-06 | Incident record template (CORE9-INC-*) | **PENDING** |
| OPS-07 | No provider retry without engineering ack | **PENDING** |

---

## 3. Forbidden operator actions (pilot)

| Action | Rule |
|--------|------|
| Mark order FULFILLED without provider proof | **Forbidden** |
| Trigger provider retry after ambiguous | **Forbidden** |
| Execute refund without money-path DR | **Forbidden** |
| Run `zw-doctor --apply` | **Forbidden** (exit 2) |
| Broad webhook replay | **Forbidden** |

---

## 4. Relationship to CORE-08

Support may **request** CORE-08 dry-run plans for ops review — **never** apply repairs from CLI.

---

## 5. Conservative verdict

Support / operator readiness **NOT VERIFIED**. Pilot **NOT APPROVED**.

---

*End of support readiness.*
