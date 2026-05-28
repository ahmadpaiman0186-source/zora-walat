# XCH-04 Reversal, Refund, Chargeback, And Adjustment Rules

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO AUTOMATIC MONEY MOVEMENT**

---

## 1. Reversal model

| Type | Trigger | Approval |
|------|---------|----------|
| Pre-settlement cancel | User cancel / timeout | Automatic (state machine) |
| Post-settlement reversal | Provider reversal event | Ops + finance review |
| System error correction | Recon mismatch | **Manual approval required** |

Reversal = **compensating ledger entries** linked to original `transactionId`.

---

## 2. Refund model

| Rule | Policy |
|------|--------|
| Refund to sender | Only for eligible settled/funded states |
| Partial refund | Corridor policy + finance approval |
| Refund idempotency | Separate idempotency key per refund request |

Existing Stripe refund path (product checkout) → **separate scope**; not remittance ledger.

---

## 3. Chargeback model

| Event | Action |
|-------|--------|
| Chargeback opened | `settlement_disputed`; **HOLD** related funds |
| Chargeback won | Close dispute; retain funds |
| Chargeback lost | Post reversal entries; ops case |

---

## 4. Provider adjustment model

| Adjustment | Handling |
|------------|----------|
| Provider fee correction | Recon exception + ledger adjustment entry |
| FX rate adjustment (post-trade) | **Manual** — never silent |
| Provider clawback | Compensating entries + audit |

---

## 5. Ledger correction policy

| Rule | Status |
|------|--------|
| Never delete ledger rows | **REQUIRED** |
| Corrections via append-only compensating entries | **REQUIRED** |
| Link `correctsEntryId` / `reversesEntryId` | **REQUIRED** |
| Auto-post correction without approval | **FORBIDDEN** |

---

## 6. Manual approval requirements

| Action | Approvers |
|--------|-----------|
| Post-settlement reversal | Ops + finance |
| Write-off | Finance + compliance |
| Chargeback resolution | Ops + legal (if material) |

---

## 7. Audit trail requirements

Every reversal/refund/chargeback/adjustment must record:

- `originalTransactionId`
- `reasonCode`
- `approverIds[]`
- `providerReference` (if any)
- Before/after balance snapshot (conceptual)

---

## 8. Automatic money movement boundary

| Claim | Status |
|-------|--------|
| Reversal rules specified | **YES** |
| Automatic money movement | **NOT ENABLED** |
| Self-healing apply | **FORBIDDEN without approval** |

---

*XCH-04 reversal/refund rules — no automatic movement*
