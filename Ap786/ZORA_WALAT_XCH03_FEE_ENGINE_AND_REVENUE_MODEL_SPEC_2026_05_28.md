# XCH-03 Fee Engine And Revenue Model Specification

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY**

---

## 1. Fee components

| Fee type | Model | Disclosure line |
|----------|-------|-----------------|
| **Fixed fee** | Flat minor units per send | `app_fee_fixed` |
| **Percentage fee** | % of send amount (capped) | `app_fee_percent` |
| **Corridor fee** | Corridor-specific schedule | `corridor_fee` |
| **Provider pass-through** | Partner/rail cost passed through | `partner_fee` |
| **Margin / spread revenue** | FX spread (not double-counted as fee + spread) | `fx_spread` |

---

## 2. Minimum / maximum boundaries

| Boundary | Rule |
|----------|------|
| `minFeeMinor` | Floor per corridor |
| `maxFeeMinor` | Ceiling per corridor |
| `maxPercentBps` | Cap on percentage component |

Violations → **reject quote** or require compliance override (future).

---

## 3. Fee disclosure requirement

| Rule | Status |
|------|--------|
| Every fee line item labeled | **REQUIRED** |
| Total sender debit explicit | **REQUIRED** |
| Recipient receive amount explicit | **REQUIRED** |
| Hidden deduction | **FORBIDDEN** |

---

## 4. Revenue recognition placeholder

| Item | Status |
|------|--------|
| Spread revenue vs fee revenue accounting | **FUTURE GATE** with finance |
| Ledger accounts for revenue | **NOT DEFINED** in XCH-03 |

---

## 5. Audit evidence requirements

| Event | Audit fields |
|-------|--------------|
| Fee policy version | `feePolicyId`, `version` |
| Computed lines | Each component amount + currency |
| Applied caps | `minFeeMinor`, `maxFeeMinor` if bound |

Immutable append-only log.

---

*XCH-03 fee spec — no collection*
