# XCH-06 Sandbox Test Scenario Matrix

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NOT EXECUTED**

---

## Scenario table

| ID | Scenario | Inject | Expected (sim) | Real-money? |
|----|----------|--------|----------------|-------------|
| SIM-01 | Happy path quote | Default fixtures | Quote priced → accept → sim settled | **NO** |
| SIM-02 | Quote expired | TTL=1s; delay accept | `QUOTE_EXPIRED` | **NO** |
| SIM-03 | Duplicate quote acceptance | Same idempotency key ×2 | Single acceptance record | **NO** |
| SIM-04 | Provider unavailable | FX stub `unavailable` | Quote rejected / fail-closed | **NO** |
| SIM-05 | Fake KYC review-required | KYC stub `review_required` | Hold; no fund sim | **NO** |
| SIM-06 | Fake sanctions blocked | AML stub `confirmed_match` | Block; audit log | **NO** |
| SIM-07 | Simulated settlement failed | Payout stub `failed` | Ledger sim → `failed` | **NO** |
| SIM-08 | Reconciliation mismatch | Deliberate amount drift fixture | `RECON-AMT-*` exception | **NO** |

---

## SIM-01: Happy path quote simulation

```text
quote_request → quote_priced → quote_shown → quote_accepted
  → sim_ledger_pending → sim_settlement_completed
```

All steps log-only; UI shows `SIMULATION / NON-MONEY` banner.

---

## SIM-02: Quote expired

Wait past `expiresAt`; acceptance returns `409`. No sim ledger entries.

---

## SIM-03: Duplicate quote acceptance

Second accept with same key returns cached acceptance; no duplicate sim debit markers.

---

## SIM-04: Provider unavailable

FX stub returns `unavailable` → quote engine fail-closed; user sees unavailable message.

---

## SIM-05: Fake KYC review-required

Fund sim blocked until operator fixture sets `clear` — manual review path exercised.

---

## SIM-06: Fake sanctions blocked

Transaction sim terminated; case ID logged; no payout sim.

---

## SIM-07: Simulated settlement failed

Payout stub returns failure after accept; sim ledger → `failed`; no retry without operator.

---

## SIM-08: Reconciliation mismatch

Internal sim amount ≠ fake provider fixture → recon exception queued.

---

## Real-money path boundary

| Item | Status |
|------|--------|
| Scenarios defined | **YES** |
| Scenarios executed | **NOT EXECUTED** |
| Real-money path in matrix | **NONE** |

---

*XCH-06 scenario matrix — plan only; not run*
