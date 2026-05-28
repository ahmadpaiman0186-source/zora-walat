# AFG-CARD-00 Domestic Ledger, Settlement, And Reconciliation Boundary

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO RUNTIME LEDGER**

**Related:** [XCH-04](./ZORA_WALAT_XCH04_LEDGER_SETTLEMENT_RECONCILIATION_INVARIANTS_2026_05_28.md) · [CARD-00 ledger](./ZORA_WALAT_CARD00_LEDGER_SETTLEMENT_AND_RECONCILIATION_BOUNDARY_2026_05_28.md)

---

## 1. Domestic wallet ledger boundary

| Balance bucket | Meaning |
|----------------|---------|
| `available` | Spendable AFN |
| `pending` | Incoming domestic credit not cleared |
| `held` | Auth / bill-pay hold |
| `settled` | Cleared |
| `reversed` | Compensating entries |

**No balances exist** in product today.

---

## 2. Authorization hold concept

POS/online auth → `held` → capture → `settled` debit.

Bill pay: submit → `held` → biller confirm → `settled` or `reversed`.

---

## 3. Bill / top-up pending state

| Product | Pending meaning |
|---------|-----------------|
| Bill payment | Awaiting biller ACK |
| Top-up | Awaiting telecom ACK |
| Timeout | Auto-reverse hold — **no silent success** |

---

## 4. Settlement clearing concept

| Leg | Counterparty |
|-----|--------------|
| Card/POS | Switch + issuer |
| Bill pay | Biller settlement account |
| Top-up | Telecom settlement |
| Cash-in/out | Partner bank |

All **domestic AFN** — no FX leg in AFG-CARD-00.

---

## 5. Reconciliation

| Domain | Compare |
|--------|---------|
| Wallet ledger vs bank | Daily |
| vs switch files | Daily |
| vs biller files | Daily |
| vs telecom files | Daily |

---

## 6. Duplicate prevention

Idempotency keys on: cash-in, payment, bill pay, top-up, wallet transfer.

Align [XCH-04 zero-duplicate](./ZORA_WALAT_XCH04_ZERO_DUPLICATE_TRANSACTION_INVARIANTS_2026_05_28.md).

---

## 7. Runtime / schema boundary

| Claim | Status |
|-------|--------|
| Boundary specified | **YES** |
| DB schema | **NOT CREATED** |
| Runtime ledger | **NOT IMPLEMENTED** |

---

*AFG-CARD-00 ledger — spec only; domestic AFN*
