# CARD-00 Risk Register

**Date:** 2026-05-28
**Status:** **OPEN / ARCHITECTURE ONLY**

---

## Risk table

| Risk ID | Risk | Severity | Impact | Mitigation | Status |
|---------|------|----------|--------|------------|--------|
| CARD00-R01 | Regulatory licensing gap | **Critical** | Unlicensed card activity | Approval gates | **OPEN** |
| CARD00-R02 | Bank partner dependency | **Critical** | Program cannot launch | Bank contract gate | **OPEN** |
| CARD00-R03 | Card issuer dependency | **Critical** | No issuance | Issuer DD + contract | **OPEN** |
| CARD00-R04 | Payment network rules | **High** | Scheme fines / termination | Network compliance | **OPEN** |
| CARD00-R05 | Sanctions failure | **Critical** | Regulatory action | Fail-closed screening | **OPEN** |
| CARD00-R06 | AML / fraud gap | **Critical** | Illicit use | TM + limits model | **OPEN** |
| CARD00-R07 | Chargeback / dispute loss | **High** | Financial loss | Dispute model + reserves | **OPEN** |
| CARD00-R08 | Settlement mismatch | **High** | Ledger drift | Recon boundary | **OPEN** |
| CARD00-R09 | ATM/POS acceptance limited | **Medium** | Poor UX / failed txs | Network + merchant DD | **OPEN** |
| CARD00-R10 | Customer support gap | **Medium** | Complaints, regulatory | Ops staffing gate | **OPEN** |
| CARD00-R11 | Investor misinterpretation | **High** | Overstated readiness | NO-GO defaults | **OPEN** |
| CARD00-R12 | Premature launch claim | **Critical** | Enforcement | Launch register | **OPEN** |

---

## Conservative verdict

| Item | Status |
|------|--------|
| All CARD00 risks | **OPEN** |
| Card program runtime | **NOT IMPLEMENTED** |

---

*CARD-00 risk register — open*
