# XCH-00 Execution Gates

**Date:** 2026-05-27
**Status:** **ALL GATES BLOCKED / NOT APPROVED / NOT EXECUTED**

---

## Gate registry

| Gate | Name | Purpose | Default status |
|------|------|---------|----------------|
| **XCH-G0** | Architecture docs only | This XCH-00 pack filed | **COMPLETE (DOCS ONLY)** |
| **XCH-G1** | Legal / compliance counsel review | External legal opinion on corridors | **BLOCKED / NOT APPROVED** |
| **XCH-G2** | Licensing strategy by corridor | MTL/MSB/PI roadmap per origin | **BLOCKED / NOT APPROVED** |
| **XCH-G3** | AML / KYC / sanctions vendor review | Vendor selection and DPIA | **BLOCKED / NOT APPROVED** |
| **XCH-G4** | Ledger architecture review | Accounting and controls sign-off | **BLOCKED / NOT APPROVED** |
| **XCH-G5** | Tax / fee / disclosure review | Rule engine legal sign-off | **BLOCKED / NOT APPROVED** |
| **XCH-G6** | Afghanistan payout partner review | Licensed partner due diligence | **BLOCKED / NOT APPROVED** |
| **XCH-G7** | Sandbox-only prototype approval | No customer funds; technical spike | **BLOCKED / NOT APPROVED** |
| **XCH-G8** | Security / audit readiness | Pen test, SOC, infra review | **BLOCKED / NOT APPROVED** |
| **XCH-G9** | Controlled licensed pilot approval | Single corridor, capped volume | **BLOCKED / NOT APPROVED** |
| **XCH-G10** | Market launch approval | Public GTM per corridor | **BLOCKED / NOT APPROVED** |

---

## Gate dependency (conceptual)

```text
XCH-G0 → XCH-G1 → XCH-G2 → XCH-G3
              ↘ XCH-G4, XCH-G5, XCH-G6 (parallel reviews)
XCH-G7 (sandbox) only after G1–G6 planning acceptance
XCH-G8 → XCH-G9 → XCH-G10
```

---

## Explicit non-authorization

| Action | Status |
|--------|--------|
| Skip gates via architecture doc existence | **FORBIDDEN** |
| Real-money pilot without XCH-G9 | **FORBIDDEN** |
| Public launch without XCH-G10 | **FORBIDDEN** |

---

## Conservative verdict

| Item | Status |
|------|--------|
| XCH-G0 | **COMPLETE (DOCS ONLY)** |
| XCH-G1…G10 | **BLOCKED / NOT APPROVED / NOT EXECUTED** |
| Money movement | **NO-GO** |

---

*XCH-00 execution gates — default deny*
