# XCH-05 Manual Review Queue And Operator Decision Model

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO AUTOMATIC APPROVAL**

**Related:** [XCH-04 operational controls](./ZORA_WALAT_XCH04_OPERATIONAL_CONTROLS_AND_MANUAL_REVIEW_QUEUE_2026_05_28.md)

---

## 1. Manual review triggers

| Trigger | Source |
|---------|--------|
| KYC `manual_review` | Identity gate |
| Sanctions `potential_match` | AML gate |
| TM rule hit | Transaction monitoring |
| High-risk corridor | Corridor gate |
| Large amount | Amount threshold |
| Provider `review_required` | Provider callback |

---

## 2. Review-required states

| State | Meaning |
|-------|---------|
| `review_pending` | In queue; transaction **HELD** |
| `review_in_progress` | Assigned to operator |
| `review_escalated` | Compliance / legal involved |
| `review_completed` | Terminal decision recorded |

---

## 3. Operator decisions

| Decision | Effect |
|----------|--------|
| **Hold** | Maintain block; request more info |
| **Release** | Approve; proceed to next gate |
| **Escalate** | Route to L2/L3 reviewer |
| **Reject** | Terminal block; audit reason required |

Default on timeout or ambiguity: **HOLD** (fail-closed).

---

## 4. Two-person approval placeholder (high-risk)

| Action | Approvers |
|--------|-----------|
| Release high-risk sanctions clear | Ops + compliance |
| Override TM block | Compliance + finance |
| Corridor exception | Legal + program lead |

Dual control → **compliance gate** before enforcement.

---

## 5. Operator evidence capture

| Item | Stored |
|------|--------|
| Review notes (no raw PII in logs) | Case record |
| Supporting documents reference | Secure store |
| Decision timestamp + actor | Audit log |
| Linked `transactionId` / `customerId` | Correlation |

---

## 6. Audit requirements

Every manual decision must append immutable record with `decision`, `reasonCode`, `actorId`, `caseId`.

---

## 7. Rollback / fail-closed boundary

| Rule | Status |
|------|--------|
| Auto-approve on SLA timeout | **FORBIDDEN** |
| Self-healing release | **FORBIDDEN without approval** |
| Spec rollback | Ap786 docs only — no production impact |

---

## 8. Automatic approval boundary

| Claim | Status |
|-------|--------|
| Manual review model specified | **YES** |
| Automatic approval | **NOT ENABLED** |
| Operator queue deployed | **NO** |

---

*XCH-05 manual review model — no auto-approval*
