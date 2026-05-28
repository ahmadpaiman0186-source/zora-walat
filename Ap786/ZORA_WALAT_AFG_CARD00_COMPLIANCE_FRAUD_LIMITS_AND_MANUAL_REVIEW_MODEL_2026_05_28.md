# AFG-CARD-00 Compliance, Fraud, Limits, And Manual Review Model

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO COMPLIANCE APPROVAL**

**Related:** [XCH-05](./ZORA_WALAT_XCH05_COMPLIANCE_CORRIDOR_KYC_AML_GATE_MATRIX_2026_05_28.md) (remittance corridors — **not used for cross-border in this track**)

---

## 1. KYC gate

Afghan resident KYC per bank + platform policy — **not implemented**.

---

## 2. AML gate

Domestic transaction monitoring — placeholder rules; SAR human-only — **no automation claim**.

---

## 3. Sanctions / watchlist gate

Screen on onboarding and material transactions — fail-closed on `unavailable`.

---

## 4. Fraud monitoring

| Signal | Action |
|--------|--------|
| Velocity | Hold |
| Device anomaly | Step-up |
| Bill pay to unknown biller | Review |
| Top-up structuring | Review |

---

## 5. Velocity / amount limits (placeholders)

| Limit | Scope |
|-------|-------|
| Daily spend | Tier-based |
| ATM daily | Regulatory |
| Bill pay per day | Compliance |
| Top-up per day | Compliance |
| Wallet-to-wallet | Compliance |

**Not approved.**

---

## 6. Merchant / category controls

Block high-risk MCCs; domestic gambling/crypto if prohibited by law — **legal review required**.

---

## 7. Utility / top-up limits

| Control | Example |
|---------|---------|
| Max single bill amount | Policy |
| Max top-up amount | Policy |
| Repeat top-up velocity | Fraud |

---

## 8. Manual review queue

`AFG-OPS-*` cases for KYC, sanctions, fraud, failed bill/top-up investigation.

---

## 9. Compliance claim boundary

| Claim | Status |
|-------|--------|
| Controls specified | **YES** |
| Compliance-approved | **NOT CLAIMED** |
| Legal advice | **NOT PROVIDED** |

---

*AFG-CARD-00 compliance — gates only*
