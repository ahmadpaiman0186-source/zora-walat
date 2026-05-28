# XCH-01 Risk Register

**Date:** 2026-05-28
**Status:** **OPEN / DESIGN ONLY**

---

## Risk table

| Risk ID | Risk | Severity | Impact | Mitigation | Status |
|---------|------|----------|--------|------------|--------|
| XCH01-R01 | Regulatory — operating without license | **Critical** | Enforcement, shutdown | XCH-G2 + corridor gates | **OPEN** |
| XCH01-R02 | FX rate risk — stale or wrong rate | **High** | Customer loss, disputes | Rate lock, expiry, disclosure | **OPEN** |
| XCH01-R03 | Settlement risk — partner delay/failure | **High** | Stuck funds | Holds, reconciliation | **OPEN** |
| XCH01-R04 | Provider outage — FX/payout/KYC down | **High** | Service stop | Fail-closed degradation model | **OPEN** |
| XCH01-R05 | Duplicate transaction | **Critical** | Double payout | Idempotency invariants | **OPEN** |
| XCH01-R06 | Chargeback/refund/reversal mismatch | **High** | Financial loss | Reversal workflow | **OPEN** |
| XCH01-R07 | Fraud / AML — undetected illicit flow | **Critical** | Regulatory action | Monitoring + hard stops | **OPEN** |
| XCH01-R08 | Observability gap — blind money path | **High** | Incident response failure | Audit trail + metrics plan | **OPEN** |
| XCH01-R09 | Hidden fee/tax dispute | **High** | Regulatory/customer harm | Quote engine spec | **OPEN** |
| XCH01-R10 | Ledger inconsistency | **Critical** | Financial reporting failure | Double-entry invariants | **OPEN** |
| XCH01-R11 | False exchange-ready claim | **Critical** | Reputational/legal | Conservative verdicts | **OPEN** |
| XCH01-R12 | Afghanistan payout partner risk | **High** | Non-delivery | XCH-G6 partner review | **OPEN** |

---

## Conservative verdict

| Item | Status |
|------|--------|
| All XCH01 risks | **OPEN / DESIGN ONLY** |
| Money movement enabled | **NO** |

---

*XCH-01 risk register — open until gates close*
