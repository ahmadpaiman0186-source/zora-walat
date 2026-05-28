# XCH-06 Simulated Ledger And Settlement Flow Specification

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO REAL LEDGER WRITES**

**Related:** [XCH-04 entry model](./ZORA_WALAT_XCH04_LEDGER_ENTRY_MODEL_AND_STATE_MACHINE_2026_05_28.md) · [XCH-04 settlement](./ZORA_WALAT_XCH04_SETTLEMENT_LIFECYCLE_AND_FINALITY_MODEL_2026_05_28.md)

---

## 1. Simulated ledger entry

| Field | Simulation |
|-------|------------|
| `ledgerEntryId` | `sim-ledger-{uuid}` |
| `transactionId` | Links to sim quote acceptance |
| `amountMinor` | From quote fixture |
| `direction` | `debit` \| `credit` |
| `storage` | In-memory / log-only — **no DB** |

---

## 2. Simulated debit/credit markers

Proposed log marker: `ZW_SIMULATION_LEDGER`

| Event | Payload |
|-------|---------|
| `sim_debit_posted` | account, amount, transactionId |
| `sim_credit_posted` | account, amount, transactionId |
| `sim_balance_check` | sum debits = sum credits (in-memory) |

**Not deployed.**

---

## 3. Simulated states

| State | Simulation behavior |
|-------|---------------------|
| `pending` | Entry logged; no external action |
| `settled` | Fixture provider callback simulated |
| `failed` | Fixture error injected |
| `reversed` | Compensating sim entries logged |

---

## 4. No wallet mutation

| Rule | Status |
|------|--------|
| Customer wallet balance updated | **FORBIDDEN** |
| Treasury account touched | **FORBIDDEN** |
| Stripe balance affected | **FORBIDDEN** |

Simulation logs intent only.

---

## 5. No real ledger write

| Store | Status |
|-------|--------|
| Production DB | **NO WRITES** |
| Staging remittance tables | **DO NOT EXIST** |
| Neon / Postgres migration | **NOT CREATED** |

---

## 6. No DB migration

XCH-06 explicitly **does not** authorize any schema change. Future implementation requires **XCH4-G4** + **XCH6-G3** gates.

---

## 7. Settlement execution boundary

| Claim | Status |
|-------|--------|
| Simulated ledger flow specified | **YES** |
| Settlement execution | **NOT ENABLED** |
| Real ledger | **NOT IMPLEMENTED** |

---

*XCH-06 simulated ledger — log-only; no writes*
