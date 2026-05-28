# XCH-02 Payout Provider Contract

**Date:** 2026-05-28
**Contract version:** `1.0-draft`
**Status:** **SPECIFICATION ONLY / NO PAYOUT EXECUTION**

---

## 1. Payout request shape

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `payoutInstructionId` | string (UUID) | **YES** | Platform ID |
| `idempotencyKey` | string | **YES** | Duplicate prevention |
| `transactionId` | string | **YES** | Ledger transaction link |
| `corridorId` | string | **YES** | |
| `beneficiary` | BeneficiaryRef | **YES** | See §2 |
| `payoutAmountMinor` | integer | **YES** | |
| `payoutCurrency` | ISO 4217 | **YES** | |
| `quoteId` | string | **YES** | Must match funded quote |
| `requestedAt` | ISO-8601 UTC | **YES** | |

---

## 2. Beneficiary abstraction

| Field | Type | Required |
|-------|------|----------|
| `beneficiaryId` | string | **YES** |
| `legalName` | string | **YES** |
| `nameMatchToken` | string | NO | Normalized match hash — no raw PII in logs |
| `payoutMethod` | enum | **YES** | `bank` \| `cash_pickup` \| `wallet` (future) |
| `payoutLocation` | object | NO | Corridor-specific |
| `governmentIdRef` | string | NO | Tokenized reference only |

---

## 3. Corridor metadata

| Field | Type | Required |
|-------|------|----------|
| `originCountry` | ISO 3166-1 alpha-2 | **YES** |
| `destinationCountry` | ISO 3166-1 alpha-2 | **YES** |
| `regulatoryProfileId` | string | **YES** |
| `partnerId` | string | NO | Assigned after XCH-G6 |

---

## 4. Payout status lifecycle

| Status | Meaning | Terminal |
|--------|---------|----------|
| `submitted` | Accepted by adapter | NO |
| `processing` | Partner in flight | NO |
| `delivered` | Confirmed to beneficiary | **YES** |
| `failed` | Terminal failure | **YES** |
| `cancelled` | Cancelled before delivery | **YES** |
| `reversed` | Recall/compensation | **YES** |

Illegal transitions **reject** (fail-closed).

---

## 5. Cancellation / reversal model

| Action | Preconditions | Contract |
|--------|---------------|----------|
| Cancel | Status `submitted` only | `cancelPayout(payoutInstructionId)` |
| Reverse | Status `delivered` + compliance approval | `reversePayout(...)` with reason code |

No silent reversal.

---

## 6. Provider timeout behavior

| Scenario | Behavior |
|----------|----------|
| Submit timeout | Remain `processing`; poll — **do not** double submit |
| Poll timeout | Escalate ops; hold ledger state |
| Unknown status | **Fail closed** — manual review |

---

## 7. Idempotency and duplicate prevention

| Layer | Key | Rule |
|-------|-----|------|
| API | `idempotencyKey` | Same key → same `payoutInstructionId` |
| Partner | `partnerPayoutRef` | Unique per instruction |
| Ledger | One payout leg per `transactionId` | Invariant |

---

## 8. Execution boundary

| Claim | Status |
|-------|--------|
| Contract specified | **YES** |
| Payout executed | **NOT ENABLED** |
| Production-ready | **NOT CLAIMED** |

---

*XCH-02 payout contract — no execution*
