# XCH-01 Ledger And Settlement Invariants

**Date:** 2026-05-28
**Status:** **DESIGN ONLY / NO LEDGER EXECUTION / NO FUNDS HELD**

---

## 1. Purpose

Define non-negotiable ledger and settlement invariants for future remittance infrastructure. Extends [XCH-00 ledger architecture](./ZORA_WALAT_XCH00_LEDGER_AND_SETTLEMENT_ARCHITECTURE_2026_05_27.md).

---

## 2. Transaction states

| State | Meaning | Allowed transitions |
|-------|---------|---------------------|
| **pending** | Created; funding not confirmed | → held, → failed |
| **held** | Funds reserved; compliance checks | → settled, → failed, → reversed |
| **settled** | Payout confirmed; ledger final | → reversed (exception only) |
| **failed** | Terminal failure; no payout | — |
| **reversed** | Compensating entries posted | — |

Illegal transitions **reject** (fail-closed).

---

## 3. Zero duplicate transaction rules

| Layer | Invariant |
|-------|-----------|
| API | Idempotency key dedupe |
| Ledger | Unique `transactionId` posting set |
| Partner | Partner reference ID uniqueness |
| Payout | One payout instruction per settled send |

Duplicate detection → **hold + ops case**; never double payout.

---

## 4. No negative balance invariant

| Account type | Rule |
|--------------|------|
| Customer available balance | **≥ 0** always |
| Segregated customer funds | Cannot fund payout from operating account |
| Hold/reserve | Explicit hold entries; no implicit overdraft |

Violation → **hard stop** + alert.

---

## 5. Reconciliation gates

| Gate | Requirement before `settled` |
|------|------------------------------|
| Funding confirmed | Bank/rail confirmation |
| Sanctions cleared | No open hard stop |
| AML score acceptable | Per policy |
| Payout partner ACK | Status = delivered or equivalent |
| Ledger balanced | Debits = credits for txn |

---

## 6. Audit trail requirements

| Event | Logged fields (redacted) |
|-------|-------------------------|
| State transition | `transactionId`, from, to, actor, timestamp |
| Quote accepted | `quoteId`, rate snapshot hash |
| Compliance decision | Case ID, outcome — no PII in public logs |
| Payout instruction | Partner ref, amount, currency |
| Reversal | Reason code, approver ID |

Immutable append-only store; no silent delete.

---

## 7. Rollback-safe settlement design

| Scenario | Design |
|----------|--------|
| Payout failed after fund | Reverse hold; refund path |
| Partner timeout | Remain **held**; manual review |
| Partial payout | **Not allowed** without new transaction |
| Compensating entry | Required audit + dual approval |

No manual SQL balance patches.

---

## 8. Conservative verdict

| Item | Status |
|------|--------|
| Invariants documented | **YES** |
| Ledger executed | **NO** |
| Customer funds held | **NO** |
| Production-ready | **NO** |

---

*XCH-01 ledger invariants — design only*
