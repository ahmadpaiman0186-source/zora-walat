# XCH-03 Tax And Regulatory Surcharge Placeholder

**Date:** 2026-05-28
**Status:** **PLACEHOLDER ONLY / TAX CALCULATION NO-GO**

---

## 1. Tax placeholder scope

| Item | Status |
|------|--------|
| Tax line items in quote breakdown | **PLACEHOLDER STRUCTURE ONLY** |
| Automatic tax calculation | **NOT ENABLED** |
| Withholding remittance | **NOT ENABLED** until legal rule engine approved |

---

## 2. Jurisdiction / corridor placeholder

| Field | Purpose |
|-------|---------|
| `jurisdictionId` | Origin regulatory jurisdiction |
| `corridorTaxProfileId` | Maps corridor → tax rules (future) |
| `applicableTaxCodes` | Enum list — empty until legal review |

Not all corridors require tax lines.

---

## 3. Regulatory surcharge placeholder

| Surcharge type | Example | Status |
|----------------|---------|--------|
| Government levy | Country-specific | **PLACEHOLDER** |
| Stamp duty | If applicable | **PLACEHOLDER** |
| Reporting fee | If applicable | **PLACEHOLDER** |

---

## 4. Legal review requirement

| Approval | Status |
|----------|--------|
| Tax rule engine legal sign-off | **REQUIRED / NOT OBTAINED** |
| Disclosure text for tax lines | **REQUIRED / NOT APPROVED** |
| Per-corridor tax matrix | **NOT FILED** |

---

## 5. Tax calculation NO-GO until approved

| Gate | Status |
|------|--------|
| XCH3-G3 tax legal review | **BLOCKED** |
| XCH-00 XCH-G5 tax/fee disclosure | **BLOCKED** |
| Production tax lines | **NO-GO** |

---

## 6. Claim boundaries

| Claim | Status |
|-------|--------|
| Tax advice provided | **FORBIDDEN** — not tax advisors |
| Compliance-approved tax treatment | **NOT CLAIMED** |
| Tax calculation correct | **NOT CLAIMED** |

---

*XCH-03 tax placeholder — legal review required before any calculation*
