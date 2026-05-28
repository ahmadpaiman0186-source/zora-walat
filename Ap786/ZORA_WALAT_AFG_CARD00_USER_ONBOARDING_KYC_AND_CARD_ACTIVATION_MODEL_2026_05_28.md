# AFG-CARD-00 User Onboarding, KYC, And Card Activation Model

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO CARD ISSUANCE**

---

## 1. Afghan user onboarding

| Step | Requirement |
|------|-------------|
| Register account | Phone + identity placeholder |
| Accept domestic-only terms | Explicit **no cross-border** use |
| Device binding (future) | Fraud control |

---

## 2. Phone / account identity placeholder

| Field | Notes |
|-------|-------|
| `phoneE164` | Afghan MSISDN format — validation rules TBD |
| `nationalIdRef` | Tokenized — no raw ID in logs |
| `accountId` | Platform identifier |

---

## 3. KYC review

| State | Meaning |
|-------|---------|
| `kyc_not_started` | Registered only |
| `kyc_pending` | Documents submitted |
| `kyc_manual_review` | Ops queue |
| `kyc_verified` | Cleared for wallet eligibility |
| `kyc_rejected` | Terminal |

---

## 4. Bank activation review

| State | Meaning |
|-------|---------|
| `bank_review_pending` | Awaiting partner bank |
| `bank_approved` | Wallet may activate |
| `bank_rejected` | Terminal |

Bank owns final activation per contract.

---

## 5. Wallet / card eligibility

| Product | Gate |
|---------|------|
| Wallet only | KYC + bank approved |
| Card-linked wallet | Additional issuer approval |

---

## 6. Card states

| State | Meaning |
|-------|---------|
| `card_active` | Usable within limits |
| `card_suspended` | Temporary hold |
| `card_blocked` | Hard stop |
| `card_closed` | Terminal |

---

## 7. Lost / stolen handling

Report → immediate `card_blocked` → processor hotlist → reissue workflow (future).

---

## 8. Manual review

High-risk KYC, name mismatch, PEP/sanctions potential match → **HOLD** — no auto-approve.

---

## 9. Issuance claim boundary

| Claim | Status |
|-------|--------|
| Onboarding model specified | **YES** |
| Actual card issuance | **NOT OCCURRED** |
| Wallets exist in production | **NO** |

---

*AFG-CARD-00 onboarding — no issuance*
