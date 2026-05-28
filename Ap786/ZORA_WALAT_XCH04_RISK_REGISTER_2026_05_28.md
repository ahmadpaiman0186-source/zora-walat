# XCH-04 Risk Register

**Date:** 2026-05-28
**Status:** **OPEN / SPECIFICATION ONLY**

---

## Risk table

| Risk ID | Risk | Severity | Impact | Mitigation | Status |
|---------|------|----------|--------|------------|--------|
| XCH04-R01 | Duplicate transaction | **Critical** | Double payout / debit | Zero-duplicate invariants | **OPEN** |
| XCH04-R02 | Settlement mismatch | **Critical** | Financial loss | Recon model + holds | **OPEN** |
| XCH04-R03 | Ledger imbalance | **Critical** | Insolvency / audit failure | Double-entry + recon | **OPEN** |
| XCH04-R04 | Provider finality ambiguity | **High** | Premature release | Finality model | **OPEN** |
| XCH04-R05 | Reversal/refund/chargeback error | **High** | Customer harm | Manual approval rules | **OPEN** |
| XCH04-R06 | Stale reconciliation | **Medium** | Undetected drift | Aging thresholds | **OPEN** |
| XCH04-R07 | Audit immutability failure | **High** | Regulatory action | Append-only spec | **OPEN** |
| XCH04-R08 | Operator error | **High** | Wrong release/hold | Dual control + audit | **OPEN** |
| XCH04-R09 | Regulatory evidence gap | **Critical** | Enforcement | Audit + retention spec | **OPEN** |
| XCH04-R10 | Spec implemented without gates | **High** | Unsafe launch | XCH4-G1..G5 blocked | **OPEN** |

---

## Conservative verdict

| Item | Status |
|------|--------|
| All XCH04 risks | **OPEN** |
| Ledger / settlement runtime | **NOT IMPLEMENTED** |

---

*XCH-04 risk register — open*
