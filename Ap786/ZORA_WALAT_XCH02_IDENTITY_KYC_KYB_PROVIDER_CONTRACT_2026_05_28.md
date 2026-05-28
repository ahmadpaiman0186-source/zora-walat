# XCH-02 Identity / KYC / KYB Provider Contract

**Date:** 2026-05-28
**Contract version:** `1.0-draft`
**Status:** **SPECIFICATION ONLY / NOT INTEGRATED**

---

## 1. Identity verification request shape

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `verificationRequestId` | string (UUID) | **YES** | |
| `entityType` | enum | **YES** | `individual` \| `business` |
| `entityId` | string | **YES** | Platform entity ID |
| `corridorId` | string | **YES** | |
| `documentRefs` | array | NO | Tokenized document handles |
| `requestedAt` | ISO-8601 UTC | **YES** | |

---

## 2. Identity verification response shape

| Field | Type | Required |
|-------|------|----------|
| `verificationRequestId` | string | **YES** |
| `providerVerificationRef` | string | NO |
| `status` | KycStatus | **YES** |
| `riskTier` | RiskTier | **YES** |
| `completedAt` | ISO-8601 UTC | NO |
| `reviewRequired` | boolean | **YES** |
| `failureReasonCode` | string | NO |

---

## 3. KYC / KYB status states

| Status | Meaning | Can send? |
|--------|---------|-----------|
| `pending` | In progress | **NO** |
| `approved` | Verified | **YES** (subject to AML) |
| `rejected` | Failed verification | **NO** |
| `expired` | Re-verification required | **NO** |
| `review_required` | Manual queue | **NO** |

---

## 4. Document verification abstraction

| Field | Type | Notes |
|-------|------|-------|
| `documentType` | enum | `passport` \| `national_id` \| `drivers_license` \| `business_registration` |
| `documentCountry` | ISO 3166-1 alpha-2 | |
| `verificationResult` | enum | `pass` \| `fail` \| `inconclusive` |
| `documentExpiry` | date | NO |

Raw document images **never** stored in application logs.

---

## 5. Risk tier abstraction

| Tier | Label | Typical controls |
|------|-------|------------------|
| `low` | Low risk | Standard limits |
| `medium` | Medium | Enhanced monitoring |
| `high` | High | EDD, lower limits, manual approval |

---

## 6. Review-required state

| Trigger | Action |
|---------|--------|
| Provider returns `review_required` | Block send/payout |
| Ops approves | Transition to `approved` with audit record |
| Ops rejects | Transition to `rejected` |

---

## 7. Data minimization requirements

| Rule | Status |
|------|--------|
| Collect minimum fields per corridor policy | **REQUIRED** |
| Tokenize government ID — no raw ID in domain logs | **REQUIRED** |
| Retention per legal review — not defined here | **PENDING** |
| Cross-border transfer legal basis documented | **REQUIRED** before integration |

---

## 8. Compliance boundary

| Claim | Status |
|-------|--------|
| Contract specified | **YES** |
| KYC/KYB integrated | **NO** |
| Compliance approved | **NOT CLAIMED** |

---

*XCH-02 identity contract — not integrated*
