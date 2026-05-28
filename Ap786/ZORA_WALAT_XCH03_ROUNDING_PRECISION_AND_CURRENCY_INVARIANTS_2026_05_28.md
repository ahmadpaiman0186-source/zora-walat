# XCH-03 Rounding, Precision, And Currency Invariants

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY**

---

## 1. Minor unit policy

| Rule | Policy |
|------|--------|
| All amounts stored as integers in minor units | **REQUIRED** |
| No floating point in ledger | **REQUIRED** |
| Currency without minor units (e.g. JPY) | Use currency metadata table |

---

## 2. Decimal precision policy

| Stage | Precision |
|-------|-----------|
| Rate calculation | High-precision decimal (string) internally |
| Conversion to minor units | Single rounding step at boundary |
| Display | Corridor display rules — legal review |

---

## 3. Rounding mode requirements

| Context | Proposed mode | Approval |
|---------|---------------|----------|
| Customer-facing payout amount | Banker's rounding or corridor rule | **LEGAL REVIEW** |
| Fee calculation residue | Toward platform policy | **FINANCE REVIEW** |
| Ledger posting | Must reconcile to integer minor units | **REQUIRED** |

---

## 4. Currency-specific precision

| Currency | Minor units | Notes |
|----------|-------------|-------|
| USD, EUR, AFN (standard) | 2 | Default table |
| JPY | 0 | Metadata driven |
| Others | ISO 4217 | Config table — future |

---

## 5. No hidden value creation invariant

| Invariant | Rule |
|-----------|------|
| INV-R01 | Sum of disclosed components = total sender debit (within 1 minor unit tolerance policy) |
| INV-R02 | No silent rounding gain to platform |
| INV-R03 | Residue posts to designated treasury account — audited |

---

## 6. Displayed vs ledger amount invariant

| Layer | Rule |
|-------|------|
| UI display | May round for presentation |
| Ledger | Authoritative integer minor units |
| Mismatch | **REJECT** acceptance if display ≠ ledger quote snapshot |

---

## 7. Auditability requirements

| Field | Stored on quote |
|-------|-----------------|
| `sendAmountMinor` | **YES** |
| `payoutAmountMinor` | **YES** |
| `roundingMode` | **YES** |
| `roundingResidueMinor` | If non-zero |

---

*XCH-03 rounding invariants — spec only*
