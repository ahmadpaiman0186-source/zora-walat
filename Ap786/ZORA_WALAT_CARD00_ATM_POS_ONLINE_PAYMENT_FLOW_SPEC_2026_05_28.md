# CARD-00 ATM / POS / Online Payment Flow Specification

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO PAYMENT ENABLEMENT**

---

## 1. ATM withdrawal concept

| Step | Actor |
|------|-------|
| Recipient presents card at ATM | Network + acquirer |
| Authorization request | Processor → issuer |
| Balance / limit check | Issuer |
| Cash dispensed | ATM operator |
| Settlement | Clearing cycle |

**Not enabled.** Depends on network ATM acceptance in Afghanistan and issuer policy.

---

## 2. POS purchase concept

| Step | Actor |
|------|-------|
| Card tap/insert/swipe at merchant | Acquirer |
| Authorization | Processor |
| Merchant capture | Settlement |
| Recipient balance debited | Issuer ledger |

Merchant must accept scheme — **not guaranteed** in all regions.

---

## 3. Online payment concept

| Step | Actor |
|------|-------|
| Card-not-present or tokenized checkout | Merchant + gateway |
| 3DS / SCA (if required) | Network rules |
| Authorization / decline | Processor |

Tokenization — **not implemented**; no tokens exist.

---

## 4. Digital wallet payment concept

| Model | Notes |
|-------|-------|
| Provisioning to Apple/Google Pay | Issuer + network approval |
| QR / local wallet rails | Corridor-specific |

---

## 5. Merchant acceptance dependency

| Dependency | Risk |
|------------|------|
| Merchant acquirer coverage | Limited acceptance |
| MCC restrictions | High-risk categories blocked |
| Cross-border e-commerce | Issuer geo controls |

---

## 6. Network acceptance dependency

| Network | ATM | POS | Online |
|---------|-----|-----|--------|
| Scheme TBD | **NOT APPROVED** | **NOT APPROVED** | **NOT APPROVED** |

---

## 7. Authorization / decline model

| Result | Behavior |
|--------|----------|
| `approved` | Hold placed; settlement pending |
| `declined_insufficient_funds` | No hold |
| `declined_limit` | Velocity/amount cap |
| `declined_fraud` | Block + case |
| `declined_compliance` | Fail-closed |

---

## 8. Reversal / refund placeholder

| Event | Handling |
|-------|----------|
| Merchant refund | Credit recipient |
| Auth reversal (unsettled) | Release hold |
| Chargeback | See [dispute model](./ZORA_WALAT_CARD00_DISPUTE_CHARGEBACK_REFUND_AND_CARD_RISK_MODEL_2026_05_28.md) |

---

## 9. Enablement claim boundary

| Claim | Status |
|-------|--------|
| Payment flows specified | **YES** |
| ATM/POS/online enabled | **NOT CLAIMED** |
| Operational card program | **NO-GO** |

---

*CARD-00 payment flows — conceptual only*
