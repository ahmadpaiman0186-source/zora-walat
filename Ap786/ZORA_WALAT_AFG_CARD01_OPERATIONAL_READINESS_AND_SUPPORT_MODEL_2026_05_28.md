# AFG-CARD-01 Operational Readiness And Support Model

**Date:** 2026-05-28
**Status:** **MODEL ONLY / NO OPERATIONAL LAUNCH**

**Related:** [AFG-CARD-00 ops](./ZORA_WALAT_AFG_CARD00_OPERATIONAL_SUPPORT_DISPUTE_REFUND_AND_REVERSAL_MODEL_2026_05_28.md)

---

## 1. Support model

| Tier | Scope | Staffed |
|------|-------|---------|
| L1 | User inquiries, status lookup | **NO** |
| L2 | Failed txn investigation | **NO** |
| L3 | Bank / biller / telecom escalation | **NO** |

Channels: in-app (future), phone (future) — **not live**.

---

## 2. Failed transaction handling

| Product | L1 script (future) |
|---------|-------------------|
| ATM | Check switch status; escalate to bank |
| POS | Merchant + switch trace |
| Bill pay | Poll biller; reverse if unpaid |
| Top-up | Poll telecom; reverse if no credit |

---

## 3. Escalation paths

| Partner | Escalation |
|---------|------------|
| Bank | Program manager + bank ops |
| Switch | Switch NOC |
| Biller | Biller support desk |
| Telecom | Aggregator / operator NOC |

**Contacts:** not established.

---

## 4. Incident response expectations

| Severity | Response |
|----------|----------|
| SEV-1 (switch down) | Halt new auths; exec page |
| SEV-2 (biller outage) | Disable biller; user notice |
| SEV-3 (single user dispute) | Queue within 24h |

Runbooks → **not written**.

---

## 5. Claim boundary

| Claim | Status |
|-------|--------|
| Support model documented | **YES** |
| Operational launch | **NOT CLAIMED** |
| Support center operational | **NO** |

---

*AFG-CARD-01 ops readiness — not launched*
