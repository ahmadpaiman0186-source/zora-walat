# XCH-03 Quote / Rate / Fee / Tax Engine Execution Specification

**Date:** 2026-05-28
**Pack ID:** XCH-03
**Status:** **EXECUTION SPECIFICATION ONLY / NOT IMPLEMENTED**
**Prior packs:** [XCH-00](./ZORA_WALAT_XCH00_GLOBAL_REMITTANCE_EXCHANGE_ARCHITECTURE_2026_05_27.md) **MERGED** · [XCH-01](./ZORA_WALAT_XCH01_EXCHANGE_INFRASTRUCTURE_EXECUTION_GATE_2026_05_28.md) **MERGED** · [XCH-02](./ZORA_WALAT_XCH02_PROVIDER_NEUTRAL_INTERFACE_CONTRACTS_2026_05_28.md) **MERGED**

---

## 1. Purpose

XCH-03 defines how a **future** quote/rate/fee/tax engine must behave at execution time — lifecycle, expiry, rounding, idempotency, audit, and observability — **without** implementing runtime code or calling providers.

---

## 2. Scope

| Component | Document | Status |
|-----------|----------|--------|
| Quote lifecycle | [Lifecycle](./ZORA_WALAT_XCH03_QUOTE_LIFECYCLE_AND_EXPIRY_MODEL_2026_05_28.md) | **SPEC ONLY** |
| Rate source / spread | [Rate policy](./ZORA_WALAT_XCH03_RATE_SOURCE_AND_SPREAD_POLICY_2026_05_28.md) | **SPEC ONLY** |
| Fee / revenue | [Fee engine](./ZORA_WALAT_XCH03_FEE_ENGINE_AND_REVENUE_MODEL_SPEC_2026_05_28.md) | **SPEC ONLY** |
| Tax placeholder | [Tax placeholder](./ZORA_WALAT_XCH03_TAX_AND_REGULATORY_SURCHARGE_PLACEHOLDER_2026_05_28.md) | **SPEC ONLY** |
| Rounding / currency | [Rounding](./ZORA_WALAT_XCH03_ROUNDING_PRECISION_AND_CURRENCY_INVARIANTS_2026_05_28.md) | **SPEC ONLY** |
| Idempotency | [Idempotency](./ZORA_WALAT_XCH03_IDEMPOTENCY_DUPLICATE_QUOTE_AND_ACCEPTANCE_RULES_2026_05_28.md) | **SPEC ONLY** |
| Audit / observability | [Audit](./ZORA_WALAT_XCH03_QUOTE_AUDIT_RECONCILIATION_AND_OBSERVABILITY_SPEC_2026_05_28.md) | **SPEC ONLY** |

---

## 3. Non-goals

| Non-goal | Status |
|----------|--------|
| Runtime quote engine code | **OUT OF SCOPE** |
| Live FX provider calls | **OUT OF SCOPE** |
| Fee collection or wallet debit | **OUT OF SCOPE** |
| Tax calculation in production | **OUT OF SCOPE** |
| Guaranteed rate or payout | **FORBIDDEN CLAIM** |

---

## 4. Engine roles (conceptual)

| Engine | Responsibility | Implementation |
|--------|----------------|----------------|
| **Quote engine** | Orchestrates lifecycle; binds rate + fee + tax lines into `Quote` | **NOT IMPLEMENTED** |
| **Rate engine** | Resolves reference/customer rate via [FX contract](./ZORA_WALAT_XCH02_FX_PROVIDER_CONTRACT_2026_05_28.md) port | **NOT IMPLEMENTED** |
| **Fee engine** | Computes app/partner/rail fees per corridor policy | **NOT IMPLEMENTED** |
| **Tax placeholder** | Applies rule-engine tax lines when legally approved | **NOT IMPLEMENTED** |

---

## 5. Execution boundaries

| Boundary | Rule |
|----------|------|
| Quote without corridor gate pass | **REJECT** |
| Quote without KYC/sanctions clear (future) | **REJECT** |
| Accept expired quote | **REJECT** |
| Accept without idempotency key | **REJECT** |
| Mutate ledger on quote-only request | **FORBIDDEN** |

---

## 6. Approval gates (XCH-03 layer)

| Gate | Default |
|------|---------|
| **XCH3-G0** | Spec pack filed — **COMPLETE (DOCS ONLY)** |
| **XCH3-G1** | Engineering spec review — **BLOCKED** |
| **XCH3-G2** | Legal/fee disclosure review — **BLOCKED** |
| **XCH3-G3** | Tax rule legal review — **BLOCKED** |
| **XCH3-G4** | Sandbox quote engine spike — **BLOCKED** |

---

## 7. Explicit NO-GO default

| Item | Default |
|------|---------|
| Quote engine runtime | **NO-GO** |
| Real-money quote execution | **NO-GO** |
| Production / exchange / remittance / pilot | **NO-GO** |
| Licensed / compliant / fix-proven | **NOT CLAIMED** |

---

## 8. Conservative verdict

| Item | Verdict |
|------|---------|
| XCH-03 execution spec | **CREATED** |
| Engine implemented | **NO** |

---

*XCH-03 execution spec — documentation only*
