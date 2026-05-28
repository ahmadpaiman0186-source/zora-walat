# CARD-00 Card Lifecycle And Activation Model

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO CARD ISSUANCE**

---

## 1. Lifecycle states

| State | Meaning | Terminal |
|-------|---------|----------|
| `card_application_requested` | User initiated application | NO |
| `identity_kyc_review` | KYC in progress | NO |
| `bank_activation_review` | Bank reviewing activation | NO |
| `card_approved` | Approved; not yet active | NO |
| `card_active` | Usable per limits | NO |
| `card_suspended` | Temporary hold | NO |
| `card_blocked` | Hard block (fraud/compliance) | NO |
| `card_expired` | Past validity | **YES** |
| `card_closed` | User or bank closed | **YES** |
| `card_lost_stolen` | Reported; blocked pending reissue | NO |

Illegal transitions **reject** (fail-closed).

---

## 2. Activation flow (conceptual)

```text
card_application_requested → identity_kyc_review → bank_activation_review
  → card_approved → card_active
```

Any compliance failure → `card_blocked` or application rejected.

---

## 3. Lost / stolen handling

| Step | Action |
|------|--------|
| User reports | Immediate `card_blocked` |
| Processor hotlist | Issuer/processor notification |
| Reissue | New card lifecycle — **not implemented** |

---

## 4. Issuance claim boundary

| Claim | Status |
|-------|--------|
| Lifecycle model specified | **YES** |
| Actual card issuance | **NOT OCCURRED** |
| Virtual or physical cards | **NONE EXIST** |

---

*CARD-00 card lifecycle — no issuance*
