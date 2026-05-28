# XCH-01 Quote / Rate / Fee / Tax Engine Specification

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO REAL-MONEY EXECUTION**

---

## 1. Purpose

Specify how a future quote engine must behave for transparent remittance pricing. This spec does **not** execute quotes, hold funds, or call live FX providers.

---

## 2. Quote creation

| Field | Required | Notes |
|-------|----------|-------|
| `quoteId` | **YES** | UUID v4 or equivalent |
| `idempotencyKey` | **YES** | Client-supplied; server dedupes |
| `corridorId` | **YES** | Must pass corridor gate |
| `sendAmount` | **YES** | Minor units integer |
| `sourceCurrency` | **YES** | ISO 4217 |
| `destinationCurrency` | **YES** | ISO 4217 (e.g. AFN) |
| `senderId` / `receiverId` | **YES** | Verified entities only (future) |
| `createdAt` | **YES** | UTC timestamp |

Output: full fee/tax/rate breakdown per [XCH-00 disclosure design](./ZORA_WALAT_XCH00_TRANSPARENT_QUOTE_RATE_FEE_TAX_ENGINE_DESIGN_2026_05_27.md).

---

## 3. Quote expiry

| Rule | Value (proposed) | Status |
|------|------------------|--------|
| Default lock window | Configurable per corridor; e.g. 60–120 seconds | **DESIGN ONLY** |
| Expired quote | **Reject** funding; require re-quote | **DESIGN ONLY** |
| Stale rate source | **Fail closed** — no silent refresh | **DESIGN ONLY** |

---

## 4. Fee calculation

| Fee type | Calculation model | Disclosure |
|----------|-------------------|------------|
| App fee | Fixed + optional % cap | Line item |
| Partner fee | Pass-through from partner schedule | Line item |
| Payment rail fee | Funding method dependent | Line item |
| FX spread | `referenceRate` vs `customerRate` delta | **Must be visible** |

---

## 5. Spread model

| Concept | Definition |
|---------|------------|
| Reference rate | External mid-market or licensed source |
| Customer rate | Rate applied to conversion |
| Spread | Difference disclosed in quote breakdown |
| Spread change during lock | **Invalidate lock** — re-quote required |

---

## 6. Tax placeholder

| Rule | Status |
|------|--------|
| Tax rules are **corridor-specific** and **legal-reviewed** | **REQUIRED** |
| Not all jurisdictions require withholding | **ACKNOWLEDGED** |
| Tax line items appear only when rule engine returns applicable charge | **DESIGN ONLY** |
| No default tax assumption | **REQUIRED** |

---

## 7. Rounding policy

| Rule | Policy |
|------|--------|
| Internal calculation | Minor units (integer) |
| Display rounding | Banker's or corridor rule — **legal review** |
| Payout amount | Must reconcile with ledger posting |
| Rounding residue | Treasury/adjustment account — **future gate** |

---

## 8. Idempotency key requirements

| Layer | Key scope | Behavior |
|-------|-----------|----------|
| API | `Idempotency-Key` header | Same key → same `quoteId` response |
| Persistence | Unique constraint on `(tenant, idempotencyKey)` | No duplicate quote rows |
| Funding | Separate key for fund capture | No double debit |

---

## 9. Execution boundary

| Claim | Status |
|-------|--------|
| Quote engine specified | **YES** |
| Real-money quote execution | **NOT ENABLED** |
| Live FX provider connected | **NO** |
| Production-ready | **NOT CLAIMED** |

---

*XCH-01 quote spec — no execution*
