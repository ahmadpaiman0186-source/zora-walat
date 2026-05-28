# AFG-CARD-00 POS And Online Payment Flow Specification

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / AFGHANISTAN DOMESTIC**

---

## 1. POS purchase concept

| Step | Notes |
|------|-------|
| Card/wallet presented at domestic merchant | Acquirer in Afghanistan |
| Authorization via domestic switch | APS/AfPay placeholder |
| Settlement batch | T+ scheme rules |
| AFN debit | Issuer ledger |

**International merchant acquiring:** **OUT OF SCOPE**.

---

## 2. Online payment concept

| Step | Notes |
|------|-------|
| Checkout on domestic merchant site | Domestic gateway |
| Card-not-present or wallet token | Future tokenization — **not implemented** |
| Authentication (3DS/local) | Per switch rules |
| Capture / settle | Gateway + switch |

---

## 3. Digital wallet payment concept

| Model | Notes |
|-------|-------|
| QR pay (domestic) | Switch standard TBD |
| In-app wallet debit | Platform ledger view |
| AfPay interoperability (placeholder) | Partner rail |

---

## 4. Merchant acceptance dependency

| Risk | Mitigation |
|------|------------|
| Limited merchant coverage | Disclosure to users |
| MCC restrictions | Block list |
| Fraudulent merchants | Acquirer DD |

---

## 5. Domestic switch / gateway dependency

No authorization without switch/gateway contract — **fail closed**.

---

## 6. Authorization / decline model

| Result | Behavior |
|--------|----------|
| `approved` | Hold → capture |
| `declined_insufficient_funds` | No hold |
| `declined_limit` | Velocity/amount |
| `declined_fraud` | Case + possible block |
| `declined_compliance` | Fail-closed |

---

## 7. Reversal / refund placeholder

| Event | Handling |
|-------|----------|
| Merchant refund | Credit wallet |
| Auth reversal | Release hold |
| Partial capture adjust | Issuer rules |

---

## 8. Enablement claim boundary

| Claim | Status |
|-------|--------|
| POS/online flows specified | **YES** |
| POS/online enabled | **NOT CLAIMED** |
| International e-commerce | **EXCLUDED** |

---

*AFG-CARD-00 POS/online — domestic Afghanistan only*
