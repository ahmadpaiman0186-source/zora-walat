# CORE-00 Receipt / Support / User Trust Gate

**Date:** 2026-05-28
**Status:** **GATE SPEC ONLY / NOT SUPPORT-READY**

---

## 1. Receipt requirements

| Field | Required |
|-------|----------|
| Order ID | **YES** |
| Product description | **YES** |
| Amount paid | **YES** |
| Timestamp | **YES** |
| Status (pending / complete / failed) | **YES** |

Email/in-app receipt — implementation **not validated** in CORE-00.

---

## 2. Order status requirements

User must see accurate status synced with backend terminal state — not optimistic UI-only success.

---

## 3. Pending order communication

Clear copy: payment received, fulfillment in progress; SLA expectation if provider slow.

---

## 4. Failed order communication

Clear copy: what failed, whether charged, next steps; link to support.

---

## 5. Provider failure communication

Distinguish payment success vs fulfillment failure — **critical for trust**.

---

## 6. Refund / reversal communication (placeholder)

If refund issued, user notification + timeline — policy **legal/ops review**.

---

## 7. Support escalation expectations

| Tier | Scope |
|------|-------|
| L1 | Status lookup, FAQ |
| L2 | Failed order investigation |
| L3 | Stripe + provider escalation |

**Support runbook:** not filed for CORE-00.

---

## 8. User trust requirements

| Requirement | Status |
|-------------|--------|
| No false "success" on unpaid | **REQUIRED** |
| No hidden charges | **REQUIRED** |
| Accurate history | **REQUIRED** |

---

## 9. Claim boundary

| Claim | Status |
|-------|--------|
| Trust gate specified | **YES** |
| Support-ready | **NOT CLAIMED** |

---

*CORE-00 receipt/support gate — spec only*
