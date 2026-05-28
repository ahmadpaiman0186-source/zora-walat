# AFG-CARD-00 Operational Support, Dispute, Refund, And Reversal Model

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO OPERATIONAL LAUNCH**

---

## 1. Customer support model

| Channel | Scope |
|---------|-------|
| In-app ticket | Domestic users |
| Phone (future) | Local language support |
| SLA tiers | Ops gate — **not staffed** |

---

## 2. Failed transaction handling

| Failure type | Process |
|--------------|---------|
| Failed ATM withdrawal | Investigate switch log; refund hold if debited |
| Failed POS | Merchant + issuer trace |
| Failed bill payment | Biller status poll; reverse if unpaid |
| Failed top-up | Telecom status; reverse if no credit |

Fail-closed: user sees **pending** until confirmed or reversed.

---

## 3. Refund handling

| Source | Approval |
|--------|----------|
| Merchant refund | Auto credit when confirmed |
| Ops goodwill refund | Dual control |
| Bill pay duplicate | Reversal + recon case |

---

## 4. Reversal handling

Auth reversal, bill pay timeout reversal, top-up failure reversal — append-only audit.

---

## 5. Dispute intake

`disputeId`, product type, `transactionId`, user narrative, evidence attachments (redacted storage).

---

## 6. Operator escalation

| Severity | Escalate |
|----------|----------|
| Mass biller outage | SRE + ops + partner |
| Switch down | **HOLD** new authorizations |
| Suspected fraud ring | Compliance |

---

## 7. Evidence requirements

Auth logs, switch refs, biller ACK, telecom ACK, user comms — retention per legal review (**not approved**).

---

## 8. Launch claim boundary

| Claim | Status |
|-------|--------|
| Ops model specified | **YES** |
| Operational launch | **NOT CLAIMED** |
| Support center live | **NO** |

---

*AFG-CARD-00 operations — not launched*
