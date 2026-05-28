# XCH-06 Risk Register

**Date:** 2026-05-28
**Status:** **OPEN / SPECIFICATION ONLY**

---

## Risk table

| Risk ID | Risk | Severity | Impact | Mitigation | Status |
|---------|------|----------|--------|------------|--------|
| XCH06-R01 | Simulation mistaken as production | **Critical** | Investor/regulatory harm | Mandatory SIM labels; claim boundary | **OPEN** |
| XCH06-R02 | Accidental provider call | **Critical** | Real money / data leak | Fake adapter boundary; no prod keys | **OPEN** |
| XCH06-R03 | Accidental wallet mutation | **Critical** | Financial loss | No-pay invariant; no DB writes | **OPEN** |
| XCH06-R04 | Accidental DB migration | **High** | Irreversible schema | XCH-06 forbids migrations | **OPEN** |
| XCH06-R05 | Fake compliance evidence misuse | **High** | False compliance claim | Evidence plan disclaimers | **OPEN** |
| XCH06-R06 | Operator confusion | **Medium** | Wrong environment action | Sandbox labeling + runbook | **OPEN** |
| XCH06-R07 | Investor misinterpretation | **High** | Overstated readiness | NO-GO defaults in all docs | **OPEN** |
| XCH06-R08 | Launch claim from sim success | **Critical** | Unauthorized launch | Launch NO-GO register | **OPEN** |
| XCH06-R09 | Sim code deployed to production | **Critical** | Live non-compliant product | Deploy gate XCH6-G4 | **OPEN** |
| XCH06-R10 | Spec implemented without gates | **High** | Unsafe prototype | XCH6-G1..G4 blocked | **OPEN** |

---

## Conservative verdict

| Item | Status |
|------|--------|
| All XCH06 risks | **OPEN** |
| Sandbox simulation runtime | **NOT IMPLEMENTED** |

---

*XCH-06 risk register — open*
