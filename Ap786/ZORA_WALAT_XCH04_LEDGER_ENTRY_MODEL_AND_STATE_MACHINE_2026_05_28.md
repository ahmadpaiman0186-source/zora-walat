# XCH-04 Ledger Entry Model And State Machine

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO RUNTIME LEDGER**

---

## 1. Ledger entry abstraction

| Field (conceptual) | Purpose |
|--------------------|---------|
| `ledgerEntryId` | Unique immutable identifier |
| `transactionId` | Business transaction correlation |
| `accountId` | Ledger account (customer, treasury, fee, suspense) |
| `direction` | `debit` \| `credit` |
| `amountMinor` | Integer minor units |
| `currency` | ISO 4217 |
| `state` | See state machine below |
| `idempotencyKey` | Duplicate prevention |
| `createdAt` | Server timestamp |

Entries are **append-only**. Corrections use compensating entries — never in-place mutation.

---

## 2. Debit / credit conceptual model

| Rule | Policy |
|------|--------|
| Double-entry | Every transaction balances debits and credits |
| Customer send | Debit customer liability / credit suspense (conceptual) |
| Payout complete | Debit suspense / credit payout rail (conceptual) |
| Fee revenue | Debit customer / credit fee revenue account (conceptual) |

Exact chart of accounts → **finance gate XCH4-G2** (not defined in XCH-04).

---

## 3. State machine

| State | Meaning | Terminal |
|-------|---------|----------|
| `pending` | Entry recorded; funding/settlement not confirmed | NO |
| `authorized` | Funds reserved or provider pre-accepted | NO |
| `settled` | Finality achieved per settlement model | **YES** |
| `failed` | Terminal failure; no value moved or fully reversed | **YES** |
| `reversed` | Compensating entries posted | **YES** |
| `cancelled` | Voided before authorization | **YES** |

Illegal transitions **reject** (fail-closed).

```text
pending → authorized → settled
   ↓          ↓
cancelled   failed
              ↓
           reversed (from settled only, via approval)
```

---

## 4. Immutable event expectations

| Event | Requirement |
|-------|-------------|
| Entry created | Append-only log row |
| State transition | New event row with `fromState`, `toState`, `actor`, `reason` |
| Correction | New compensating entry; link `reversesEntryId` |

Historical rows **must not** be updated or deleted.

---

## 5. Runtime boundary

| Claim | Status |
|-------|--------|
| Ledger entry model specified | **YES** |
| Runtime ledger implementation | **NOT IMPLEMENTED** |
| DB schema | **NOT CREATED** |

---

*XCH-04 ledger entry model — spec only*
