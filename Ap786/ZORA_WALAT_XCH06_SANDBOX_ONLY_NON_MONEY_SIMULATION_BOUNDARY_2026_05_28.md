# XCH-06 Sandbox-Only Non-Money Simulation Boundary

**Date:** 2026-05-28
**Pack ID:** XCH-06
**Status:** **SIMULATION BOUNDARY SPEC ONLY / NOT IMPLEMENTED**
**Prior packs:** [XCH-00](./ZORA_WALAT_XCH00_GLOBAL_REMITTANCE_EXCHANGE_ARCHITECTURE_2026_05_27.md) **MERGED** · [XCH-01](./ZORA_WALAT_XCH01_EXCHANGE_INFRASTRUCTURE_EXECUTION_GATE_2026_05_28.md) **MERGED** · [XCH-02](./ZORA_WALAT_XCH02_PROVIDER_NEUTRAL_INTERFACE_CONTRACTS_2026_05_28.md) **MERGED** · [XCH-03](./ZORA_WALAT_XCH03_QUOTE_RATE_FEE_TAX_ENGINE_EXECUTION_SPEC_2026_05_28.md) **MERGED** · [XCH-04](./ZORA_WALAT_XCH04_LEDGER_SETTLEMENT_RECONCILIATION_INVARIANTS_2026_05_28.md) **MERGED** · [XCH-05](./ZORA_WALAT_XCH05_COMPLIANCE_CORRIDOR_KYC_AML_GATE_MATRIX_2026_05_28.md) **MERGED**

---

## 1. Purpose

XCH-06 defines the **sandbox-only, non-money simulation boundary** for future exchange/remittance infrastructure prototyping — fake quotes, fake ledger markers, fake providers, and test scenarios — **without** implementing runtime code, external API calls, or any value movement.

---

## 2. Scope

| Component | Document | Status |
|-----------|----------|--------|
| Simulated quote/rate flow | [Quote sim](./ZORA_WALAT_XCH06_SIMULATED_QUOTE_AND_RATE_FLOW_SPEC_2026_05_28.md) | **SPEC ONLY** |
| Simulated ledger/settlement | [Ledger sim](./ZORA_WALAT_XCH06_SIMULATED_LEDGER_AND_SETTLEMENT_FLOW_SPEC_2026_05_28.md) | **SPEC ONLY** |
| Fake provider adapters | [Fake providers](./ZORA_WALAT_XCH06_FAKE_PROVIDER_ADAPTER_BOUNDARY_2026_05_28.md) | **SPEC ONLY** |
| Test scenario matrix | [Scenarios](./ZORA_WALAT_XCH06_SANDBOX_TEST_SCENARIO_MATRIX_2026_05_28.md) | **SPEC ONLY** |
| Fail-closed rules | [Fail-closed](./ZORA_WALAT_XCH06_FAIL_CLOSED_AND_NO_PAY_NO_SERVICE_RULES_2026_05_28.md) | **SPEC ONLY** |
| Observability / evidence | [Evidence plan](./ZORA_WALAT_XCH06_OBSERVABILITY_AND_EVIDENCE_CAPTURE_PLAN_2026_05_28.md) | **SPEC ONLY** |

---

## 3. Non-goals

| Non-goal | Status |
|----------|--------|
| Runtime simulation code | **OUT OF SCOPE** |
| Live FX / payout / KYC / AML execution | **OUT OF SCOPE** |
| DB schema, migrations, wallet mutation | **OUT OF SCOPE** |
| Real provider API calls | **OUT OF SCOPE** |
| Production data processing | **OUT OF SCOPE** |
| Pilot or real-money paths | **FORBIDDEN** |

---

## 4. Sandbox-only boundary

| Rule | Policy |
|------|--------|
| SIM-BND-01 | All XCH-06 flows run in **designated sandbox** environment only |
| SIM-BND-02 | Sandbox must be **visually and logically labeled** `SIMULATION / NON-MONEY` |
| SIM-BND-03 | No shared credentials with production remittance rails |
| SIM-BND-04 | No routing from production checkout/payment paths into simulation |

**Current status:** Boundary **documented only** — no sandbox runtime deployed.

---

## 5. Non-money simulation definition

**Non-money simulation** = exercise of quote, ledger, compliance, and provider **interfaces** using **in-memory or fixture data** with **zero** net value movement, **zero** external money APIs, and **zero** persistent ledger writes to production stores.

Outputs are **educational / engineering preview only** — not evidence of production capability.

---

## 6. Fake quote / fake ledger / fake provider boundary

| Layer | Simulation | Prohibited |
|-------|------------|------------|
| Quote | Fixture rates, fake spread/fee | Live FX API |
| Ledger | In-memory markers, log-only events | DB writes, wallet debit |
| Provider | Stub adapters returning canned JSON | HTTP to real provider endpoints |
| Compliance | Canned gate outcomes | Real sanctions/KYC API |

See [fake providers](./ZORA_WALAT_XCH06_FAKE_PROVIDER_ADAPTER_BOUNDARY_2026_05_28.md).

---

## 7. Prohibited operations

| Operation | Status |
|-----------|--------|
| Real-money fund capture | **FORBIDDEN** |
| Wallet / order / payment mutation | **FORBIDDEN** |
| Stripe remittance integration | **FORBIDDEN** |
| Payout execution | **FORBIDDEN** |
| Settlement execution | **FORBIDDEN** |
| KYC/AML/sanctions live screening | **FORBIDDEN** |
| DB migration for remittance ledger | **FORBIDDEN** |
| Deploy simulation to production URL without gate | **FORBIDDEN** |
| Present simulation as production proof | **FORBIDDEN** |

---

## 8. Approval gates (XCH-06 layer)

| Gate | Default |
|------|---------|
| **XCH6-G0** | Spec pack filed — **COMPLETE (DOCS ONLY)** |
| **XCH6-G1** | Engineering sandbox design review — **BLOCKED** |
| **XCH6-G2** | Compliance review (simulation labeling) — **BLOCKED** |
| **XCH6-G3** | Fake provider adapter spike — **BLOCKED** |
| **XCH6-G4** | Sandbox environment provisioning — **BLOCKED** |

---

## 9. Explicit NO-GO default

| Item | Default |
|------|---------|
| Simulation runtime | **NO-GO** |
| Real-money / pilot / production | **NO-GO** |
| Exchange-ready / remittance-ready | **NOT CLAIMED** |
| Licensed / compliant / fix-proven | **NOT CLAIMED** |

---

## 10. Conservative verdict

| Item | Verdict |
|------|---------|
| XCH-06 simulation boundary | **CREATED** |
| Sandbox runtime | **NOT IMPLEMENTED** |

---

*XCH-06 sandbox boundary — documentation only; not production evidence*
