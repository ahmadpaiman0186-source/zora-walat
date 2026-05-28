# XCH-02 Provider-Neutral Interface Contracts

**Date:** 2026-05-28
**Pack ID:** XCH-02
**Status:** **CONTRACT SPECIFICATION ONLY / NOT IMPLEMENTED**
**Prior packs:** [XCH-00](./ZORA_WALAT_XCH00_GLOBAL_REMITTANCE_EXCHANGE_ARCHITECTURE_2026_05_27.md) **MERGED** · [XCH-01](./ZORA_WALAT_XCH01_EXCHANGE_INFRASTRUCTURE_EXECUTION_GATE_2026_05_28.md) **MERGED**

---

## 1. Purpose

XCH-02 defines **provider-neutral interface contracts** for future exchange/remittance infrastructure. Contracts specify request/response shapes, invariants, failure behavior, and audit requirements — **without** implementing adapters or calling external APIs.

---

## 2. Scope

| In scope | Status |
|----------|--------|
| FX provider contract spec | [XCH02_FX](./ZORA_WALAT_XCH02_FX_PROVIDER_CONTRACT_2026_05_28.md) |
| Payout provider contract spec | [XCH02_PAYOUT](./ZORA_WALAT_XCH02_PAYOUT_PROVIDER_CONTRACT_2026_05_28.md) |
| Identity KYC/KYB contract spec | [XCH02_IDENTITY](./ZORA_WALAT_XCH02_IDENTITY_KYC_KYB_PROVIDER_CONTRACT_2026_05_28.md) |
| AML/sanctions contract spec | [XCH02_AML](./ZORA_WALAT_XCH02_AML_SANCTIONS_SCREENING_CONTRACT_2026_05_28.md) |
| Reconciliation/audit contract spec | [XCH02_RECON](./ZORA_WALAT_XCH02_RECONCILIATION_AND_AUDIT_CONTRACT_2026_05_28.md) |
| Failure/failover model | [XCH02_FAILOVER](./ZORA_WALAT_XCH02_PROVIDER_FAILURE_AND_FAILOVER_MODEL_2026_05_28.md) |
| Risk register + decision template | [Risk](./ZORA_WALAT_XCH02_RISK_REGISTER_2026_05_28.md) · [Decision](./ZORA_WALAT_XCH02_DECISION_RECORD_TEMPLATE_2026_05_28.md) |

---

## 3. Non-goals

| Non-goal | Status |
|----------|--------|
| Provider SDK integration | **OUT OF SCOPE** |
| Runtime adapter code | **OUT OF SCOPE** |
| Live FX execution | **OUT OF SCOPE** |
| Payout execution | **OUT OF SCOPE** |
| KYC/AML/sanctions vendor calls | **OUT OF SCOPE** |
| Real-money or wallet mutation | **OUT OF SCOPE** |
| Compliance or license approval claims | **FORBIDDEN** |

---

## 4. Contract-first architecture

```text
Domain service (future)
    → Port interface (contract)
        → Adapter (future, gated)
            → External provider API (future, gated)
```

| Rule | Status |
|------|--------|
| Domain logic depends on **ports**, not vendor SDKs | **REQUIRED** |
| Adapters map vendor payloads ↔ contract shapes | **REQUIRED** |
| Contracts versioned independently of XCH-00/XCH-01 docs | **REQUIRED** |

---

## 5. Provider-neutrality rules

| Rule | Description |
|------|-------------|
| PNN-01 | No vendor-specific field names in domain models |
| PNN-02 | All provider responses normalized to contract enums |
| PNN-03 | Provider selection via configuration — not compile-time lock-in |
| PNN-04 | Secondary provider requires explicit gate — no silent failover |
| PNN-05 | Contract tests use fixtures — no live provider in CI (future) |

---

## 6. Interface versioning policy

| Element | Policy |
|---------|--------|
| Version format | `major.minor` (e.g. `1.0`) |
| Breaking change | Increment **major**; parallel support window if approved |
| Additive fields | Increment **minor**; backward compatible |
| Deprecation | Documented sunset; minimum 90-day notice (future ops policy) |
| Implementation | Must declare supported contract version per adapter |

Current contract suite version: **`1.0-draft`** — **NOT APPROVED FOR IMPLEMENTATION**

---

## 7. Approval gates before implementation

| Gate | Requirement | Default |
|------|-------------|---------|
| **XCH2-G0** | Contract pack filed (this pack) | **COMPLETE (DOCS ONLY)** |
| **XCH2-G1** | Engineering architecture review | **BLOCKED** |
| **XCH2-G2** | Legal/compliance review of data fields | **BLOCKED** |
| **XCH2-G3** | Security/privacy review (PII boundaries) | **BLOCKED** |
| **XCH2-G4** | Sandbox adapter spike approval | **BLOCKED** |
| **XCH2-G5** | Production adapter approval per provider class | **BLOCKED** |

XCH-01 **XCH1-G1…G5** and XCH-00 **XCH-G1…G10** remain **BLOCKED** unless separately closed.

---

## 8. Explicit NO-GO default

| Item | Default |
|------|---------|
| Contract implementation | **NO-GO** |
| Provider integration | **NO-GO** |
| Exchange/remittance execution | **NO-GO** |
| Production-ready / licensed / compliant | **NOT CLAIMED** |
| Real-money / controlled pilot | **NO-GO** |

---

## 9. Conservative verdict

| Item | Verdict |
|------|---------|
| XCH-02 contract pack | **CREATED** |
| Provider adapters implemented | **NO** |
| Money movement | **NO-GO** |

---

*XCH-02 interface contracts — specification only*
