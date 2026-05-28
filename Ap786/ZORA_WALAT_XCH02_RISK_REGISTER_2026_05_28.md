# XCH-02 Risk Register

**Date:** 2026-05-28
**Status:** **OPEN / SPECIFICATION ONLY**

---

## Risk table

| Risk ID | Risk | Severity | Impact | Mitigation | Status |
|---------|------|----------|--------|------------|--------|
| XCH02-R01 | Provider lock-in via non-neutral contracts | **High** | Cost, migration pain | PNN rules; port/adapter pattern | **OPEN** |
| XCH02-R02 | Inconsistent FX quote normalization | **High** | Customer harm, disputes | FX contract + spread fields | **OPEN** |
| XCH02-R03 | Payout settlement mismatch | **Critical** | Financial loss | Reconciliation contract | **OPEN** |
| XCH02-R04 | KYC/AML false negative | **Critical** | Regulatory action | Screening + monitoring | **OPEN** |
| XCH02-R05 | Sanctions false positive | **Medium** | Customer friction | Manual review flow | **OPEN** |
| XCH02-R06 | Duplicate transaction / payout | **Critical** | Double payout | Idempotency in all contracts | **OPEN** |
| XCH02-R07 | Audit data quality gap | **High** | Investigation failure | Immutable audit contract | **OPEN** |
| XCH02-R08 | Regulatory/compliance interpretation risk | **Critical** | Launch blocked | Legal review gate XCH2-G2 | **OPEN** |
| XCH02-R09 | Contract spec drift from implementation | **Medium** | Wrong behavior | Versioning policy | **OPEN** |
| XCH02-R10 | Auto-failover without approval | **High** | Wrong rail payout | Failover model forbids auto-switch | **OPEN** |

---

## Conservative verdict

| Item | Status |
|------|--------|
| All XCH02 risks | **OPEN** |
| Contracts implemented | **NO** |

---

*XCH-02 risk register — open*
