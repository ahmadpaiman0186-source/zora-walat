# XCH-04 Reconciliation Model And Mismatch Handling

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY**

**Related:** [XCH-02 recon contract](./ZORA_WALAT_XCH02_RECONCILIATION_AND_AUDIT_CONTRACT_2026_05_28.md) · [XCH-03 quote audit](./ZORA_WALAT_XCH03_QUOTE_AUDIT_RECONCILIATION_AND_OBSERVABILITY_SPEC_2026_05_28.md)

---

## 1. Reconciliation domains

| Domain | Compare |
|--------|---------|
| Internal ledger vs provider | Ledger entries vs provider statement/API |
| Quote vs settlement | Accepted quote snapshot vs settled amounts |
| Payout vs ledger | Payout provider ref vs ledger payout entries |
| Fee / spread | Quote fee lines vs recognized revenue entries |

---

## 2. Mismatch categories

| Category | Code prefix | Severity |
|----------|-------------|----------|
| Amount mismatch | `RECON-AMT-*` | **Critical** |
| Currency mismatch | `RECON-CCY-*` | **Critical** |
| Missing provider record | `RECON-MISS-PROV-*` | **High** |
| Missing internal record | `RECON-MISS-INT-*` | **High** |
| Duplicate provider event | `RECON-DUP-*` | **Critical** |
| Timing / aging | `RECON-AGE-*` | **Medium** |
| Fee/spread drift | `RECON-FEE-*` | **High** |

---

## 3. Aging thresholds (proposed)

| Age | Action |
|-----|--------|
| 0–24h | Auto-queue for batch recon |
| 24–72h | Ops review required |
| >72h unresolved critical | **Escalate** — launch **NO-GO** for affected corridor |

Thresholds → **finance approval** before production use.

---

## 4. Manual review state

| State | Meaning |
|-------|---------|
| `recon_matched` | All domains agree within tolerance |
| `recon_exception_open` | Mismatch detected; under review |
| `recon_exception_resolved` | Corrected or explained with audit |
| `recon_exception_write_off` | Finance-approved adjustment only |

---

## 5. Unresolved mismatch NO-GO

| Condition | Gate |
|-----------|------|
| Any critical `RECON-*` open > SLA | Corridor settlement **NO-GO** |
| Aggregate imbalance ≠ 0 | Platform ledger **NO-GO** |
| Unexplained duplicate | **HOLD** + exec review |

---

*XCH-04 reconciliation model — spec only*
