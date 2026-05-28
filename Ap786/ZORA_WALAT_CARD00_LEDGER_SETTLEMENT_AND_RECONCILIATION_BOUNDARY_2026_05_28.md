# CARD-00 Ledger / Settlement / Reconciliation Boundary

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO RUNTIME LEDGER**

**Related:** [XCH-04 invariants](./ZORA_WALAT_XCH04_LEDGER_SETTLEMENT_RECONCILIATION_INVARIANTS_2026_05_28.md)

---

## 1. Card wallet ledger boundary

| Account (conceptual) | Purpose |
|----------------------|---------|
| `available` | Spendable balance |
| `pending` | Incoming transfer not settled |
| `held` | Authorization hold |
| `settled` | Cleared transactions |
| `reversed` | Reversed auth/capture |

Issuer may be system of record — platform ledger must **reconcile**, not assume ownership without contract.

---

## 2. Balance states

| State | Meaning |
|-------|---------|
| Available | `settled − held` |
| Pending credit | Awaiting settlement |
| Held | Auth hold active |

**No wallet balances exist** in product today.

---

## 3. Authorization hold concept

| Rule | Policy |
|------|--------|
| Auth approved | Move amount to `held` |
| Capture | `held` → debit `settled` |
| Auth expiry | Release `held` |
| Partial capture | Adjust hold |

---

## 4. Settlement clearing concept

| Phase | Timing |
|-------|--------|
| Authorization | Real-time |
| Clearing | Scheme batch |
| Settlement | Issuer/processor settlement account |

Mismatch → recon exception per XCH-04 patterns.

---

## 5. Reconciliation

| Compare | Frequency |
|---------|-----------|
| Platform ledger vs processor file | Daily |
| Processor vs issuer | Daily |
| Issuer vs settlement bank | Daily |

---

## 6. Duplicate prevention

| Layer | Key |
|-------|-----|
| Transfer | `idempotencyKey` |
| Auth | `retrievalReferenceNumber` |
| Capture | Link to auth |

Align with [XCH-04 zero-duplicate](./ZORA_WALAT_XCH04_ZERO_DUPLICATE_TRANSACTION_INVARIANTS_2026_05_28.md).

---

## 7. Chargeback / refund / reversal boundary

| Event | Ledger effect |
|-------|---------------|
| Refund | Credit available |
| Chargeback | Debit + dispute case |
| Auth reversal | Release hold |

Manual approval for material adjustments — see [dispute model](./ZORA_WALAT_CARD00_DISPUTE_CHARGEBACK_REFUND_AND_CARD_RISK_MODEL_2026_05_28.md).

---

## 8. Runtime / schema boundary

| Claim | Status |
|-------|--------|
| Ledger boundary specified | **YES** |
| DB schema | **NOT CREATED** |
| Runtime card ledger | **NOT IMPLEMENTED** |

---

*CARD-00 ledger boundary — spec only*
