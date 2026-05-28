# XCH-00 Ledger And Settlement Architecture

**Date:** 2026-05-27
**Status:** **DESIGN ONLY / NO FUNDS HELD / NO LEDGER EXECUTION**

---

## 1. Ledger design principles

| Principle | Description | Status |
|-----------|-------------|--------|
| Double-entry ledger | Every movement has balanced debit/credit | **DESIGN ONLY** |
| Customer funds segregation | Safeguarded balances separate from operating funds | **DESIGN ONLY** |
| Pending / held / settled / reversed | Explicit lifecycle states | **DESIGN ONLY** |
| No negative balance invariant | Customer available balance ≥ 0 unless explicit credit line (future) | **DESIGN ONLY** |
| Idempotent transaction posting | Same idempotency key cannot post twice | **DESIGN ONLY** |
| Immutable event log | Append-only business events | **DESIGN ONLY** |
| No manual DB mutation | Policy — corrections via compensating entries only | **DESIGN ONLY** |

---

## 2. Settlement and reconciliation

| Area | Future role | Status |
|------|-------------|--------|
| Payout settlement reconciliation | Match partner confirmations to ledger | **DESIGN ONLY** |
| Partner settlement reconciliation | Net positions with rails/partners | **DESIGN ONLY** |
| FX gain/loss accounting | Placeholder for treasury function | **DESIGN ONLY** |
| Tax/fee accounting | Placeholder per corridor rules | **DESIGN ONLY** |
| Audit trail | Compliance export and investigation support | **DESIGN ONLY** |

---

## 3. Rollback and reversal boundaries

| Action | Policy | Status |
|--------|--------|--------|
| Compensating entry | Allowed under compliance-approved reversal workflow | **DESIGN ONLY** |
| Silent row delete | **FORBIDDEN** | **POLICY** |
| Payout recall after release | Partner-dependent; manual compliance gate | **DESIGN ONLY** |

---

## 4. Relationship to current Zora-Walat ledger

Current product ledger/wallet scope (if any) is **not** extended or certified for remittance by this document.

---

## 5. Conservative verdict

| Item | Status |
|------|--------|
| Ledger architecture documented | **YES** |
| Funds held | **NO** |
| Ledger execution | **NO** |
| Production-ready | **NO** |

---

*XCH-00 ledger — design only; no funds movement*
