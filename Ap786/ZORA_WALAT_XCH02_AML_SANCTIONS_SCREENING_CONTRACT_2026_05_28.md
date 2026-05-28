# XCH-02 AML / Sanctions Screening Contract

**Date:** 2026-05-28
**Contract version:** `1.0-draft`
**Status:** **SPECIFICATION ONLY / NO LEGAL SIGNOFF**

---

## 1. Sanctions screening request shape

| Field | Type | Required |
|-------|------|----------|
| `screeningRequestId` | string (UUID) | **YES** |
| `partyType` | enum | **YES** | `sender` \| `receiver` \| `beneficiary` |
| `partyId` | string | **YES** |
| `corridorId` | string | **YES** |
| `nameTokens` | object | **YES** | Normalized — not logged raw in app logs |
| `dateOfBirthRef` | string | NO | Tokenized |
| `countryCode` | ISO 3166-1 alpha-2 | **YES** |
| `requestedAt` | ISO-8601 UTC | **YES** |

---

## 2. Sanctions screening response shape

| Field | Type | Required |
|-------|------|----------|
| `screeningRequestId` | string | **YES** |
| `watchlistResult` | WatchlistResult | **YES** |
| `matchScore` | number | NO | Provider-specific — normalized 0–1 |
| `listVersion` | string | **YES** |
| `screenedAt` | ISO-8601 UTC | **YES** |
| `providerScreeningRef` | string | NO |

---

## 3. Watchlist result states

| State | Meaning | Transaction action |
|-------|---------|-------------------|
| `clear` | No match | Proceed (subject to AML score) |
| `potential_match` | Possible hit | **HOLD** — manual review |
| `confirmed_match` | Confirmed hit | **HARD STOP** |
| `provider_unavailable` | Cannot screen | **FAIL CLOSED** |

---

## 4. AML risk scoring abstraction

| Field | Type | Notes |
|-------|------|-------|
| `amlScore` | integer 0–100 | Normalized |
| `amlRiskBand` | enum | `low` \| `medium` \| `high` \| `critical` |
| `rulesTriggered` | array of rule IDs | No customer PII |

---

## 5. False-positive / manual review flow

```text
potential_match → case created → analyst review → clear | confirm
```

| Outcome | Next state |
|---------|------------|
| Analyst clears | `clear` with audit |
| Analyst confirms | `confirmed_match` — block permanently for txn |

---

## 6. Blocked transaction handling

| Condition | Action |
|-----------|--------|
| `confirmed_match` | Reject transaction; no payout |
| `provider_unavailable` | Reject new sends |
| Open case | Hold related funds in `held` ledger state |

---

## 7. Audit requirements

| Event | Required audit fields |
|-------|----------------------|
| Screen request/response | IDs, result, list version, timestamp |
| Manual review decision | Analyst ID, outcome, reason code |
| Override (if ever allowed) | Dual control + compliance approval |

Immutable storage; no delete.

---

## 8. Legal boundary

| Claim | Status |
|-------|--------|
| Contract specified | **YES** |
| Legal/compliance sign-off | **NOT OBTAINED** |
| Sanctions program certified | **NOT CLAIMED** |

---

*XCH-02 AML/sanctions contract — spec only*
