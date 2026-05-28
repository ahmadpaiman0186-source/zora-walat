# XCH-03 Risk Register

**Date:** 2026-05-28
**Status:** **OPEN / SPECIFICATION ONLY**

---

## Risk table

| Risk ID | Risk | Severity | Impact | Mitigation | Status |
|---------|------|----------|--------|------------|--------|
| XCH03-R01 | Stale quote accepted | **Critical** | Wrong rate to customer | Expiry + stale rejection | **OPEN** |
| XCH03-R02 | Rate volatility during lock | **High** | Dispute, loss | Short TTL; re-quote | **OPEN** |
| XCH03-R03 | Fee disclosure incomplete | **High** | Regulatory action | Fee line items + audit | **OPEN** |
| XCH03-R04 | Rounding discrepancy | **Medium** | Customer/ledger mismatch | Invariants INV-R01–R03 | **OPEN** |
| XCH03-R05 | Duplicate acceptance | **Critical** | Double fund/payout | Idempotency rules | **OPEN** |
| XCH03-R06 | Provider rate mismatch | **High** | Reconciliation break | Rate audit fields | **OPEN** |
| XCH03-R07 | Tax/compliance interpretation | **Critical** | Wrong withholding | Tax NO-GO until legal | **OPEN** |
| XCH03-R08 | Audit evidence gap | **High** | Cannot investigate | Audit spec + immutable log | **OPEN** |
| XCH03-R09 | Spread not disclosed | **High** | Hidden fee claim | Spread policy | **OPEN** |
| XCH03-R10 | Spec implemented without gates | **High** | Unsafe launch | XCH3-G1..G4 blocked | **OPEN** |

---

## Conservative verdict

| Item | Status |
|------|--------|
| All XCH03 risks | **OPEN** |
| Quote engine runtime | **NOT IMPLEMENTED** |

---

*XCH-03 risk register — open*
