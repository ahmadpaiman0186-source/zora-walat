# CARD-00 Dispute / Chargeback / Refund And Card Risk Model

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO OPERATIONAL CARD PROGRAM**

---

## 1. Dispute intake

| Channel | Owner |
|---------|-------|
| In-app dispute form | Ops |
| Processor chargeback notice | Compliance + ops |
| Bank escalation | Compliance |

All disputes logged with `disputeId`, `transactionId`, `cardId` (future).

---

## 2. Chargeback lifecycle

| State | Meaning |
|-------|---------|
| `chargeback_received` | Network notice |
| `representment_pending` | Evidence gathering |
| `won` / `lost` | Final scheme outcome |
| `pre_arbitration` | Escalated |

Platform does not guarantee representment success.

---

## 3. Refund handling

| Type | Process |
|------|---------|
| Merchant refund | Credit card account |
| Platform-initiated refund | Approval + ledger credit |
| Partial refund | Policy + issuer rules |

---

## 4. Card fraud handling

| Event | Action |
|-------|--------|
| Confirmed fraud | `card_blocked`; case file |
| Suspected fraud | `card_suspended`; review |
| Compromised credentials | Reissue lifecycle |

---

## 5. Suspicious transaction hold

| Trigger | Effect |
|---------|--------|
| Real-time fraud score | Decline or hold |
| Post-auth review | Suspend card pending review |

Fail-closed default.

---

## 6. Card suspension / blocking

| Level | Scope |
|-------|-------|
| Suspend | Temporary; reversible |
| Block | Hard stop; compliance/fraud |

---

## 7. Operator escalation

| Severity | Escalate to |
|----------|-------------|
| Material chargeback loss | Finance + legal |
| Sanctions nexus | Compliance **immediate** |
| Systemic fraud | Exec + issuer |

---

## 8. Evidence requirements

| Case | Minimum evidence |
|------|------------------|
| Chargeback representment | Auth log, delivery proof, T&C |
| Fraud claim | Transaction trail, device data (redacted) |
| Customer dispute | Communication + resolution |

Retention per legal review — **not approved**.

---

## 9. Operational program boundary

| Claim | Status |
|-------|--------|
| Dispute model specified | **YES** |
| Operational card program | **NOT CLAIMED** |
| Chargeback ops staffed | **NO** |

---

*CARD-00 dispute model — no live program*
