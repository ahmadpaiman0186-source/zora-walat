# XCH-05 Compliance / Corridor / KYC-AML Gate Matrix

**Date:** 2026-05-28
**Pack ID:** XCH-05
**Status:** **GOVERNANCE SPECIFICATION ONLY / NOT IMPLEMENTED**
**Prior packs:** [XCH-00](./ZORA_WALAT_XCH00_GLOBAL_REMITTANCE_EXCHANGE_ARCHITECTURE_2026_05_27.md) **MERGED** · [XCH-01](./ZORA_WALAT_XCH01_EXCHANGE_INFRASTRUCTURE_EXECUTION_GATE_2026_05_28.md) **MERGED** · [XCH-02](./ZORA_WALAT_XCH02_PROVIDER_NEUTRAL_INTERFACE_CONTRACTS_2026_05_28.md) **MERGED** · [XCH-03](./ZORA_WALAT_XCH03_QUOTE_RATE_FEE_TAX_ENGINE_EXECUTION_SPEC_2026_05_28.md) **MERGED** · [XCH-04](./ZORA_WALAT_XCH04_LEDGER_SETTLEMENT_RECONCILIATION_INVARIANTS_2026_05_28.md) **MERGED**

---

## 1. Purpose

XCH-05 defines governance gates for future exchange/remittance infrastructure — corridor readiness, KYC/KYB, AML/sanctions, transaction monitoring, manual review, privacy boundaries, and launch approval — **without** implementing runtime compliance code or obtaining legal approval.

---

## 2. Scope

| Component | Document | Status |
|-----------|----------|--------|
| Corridor / jurisdiction gates | [Corridor model](./ZORA_WALAT_XCH05_CORRIDOR_READINESS_AND_JURISDICTION_GATE_MODEL_2026_05_28.md) | **SPEC ONLY** |
| KYC/KYB identity gates | [KYC/KYB model](./ZORA_WALAT_XCH05_KYC_KYB_IDENTITY_VERIFICATION_GATE_MODEL_2026_05_28.md) | **SPEC ONLY** |
| AML / sanctions gates | [AML/sanctions model](./ZORA_WALAT_XCH05_AML_SANCTIONS_SCREENING_AND_WATCHLIST_GATE_MODEL_2026_05_28.md) | **SPEC ONLY** |
| Transaction monitoring | [TM spec](./ZORA_WALAT_XCH05_TRANSACTION_MONITORING_AND_RISK_SCORING_SPEC_2026_05_28.md) | **SPEC ONLY** |
| Manual review | [Operator model](./ZORA_WALAT_XCH05_MANUAL_REVIEW_QUEUE_AND_OPERATOR_DECISION_MODEL_2026_05_28.md) | **SPEC ONLY** |
| Privacy / retention | [Privacy boundary](./ZORA_WALAT_XCH05_DATA_MINIMIZATION_PRIVACY_AND_RETENTION_BOUNDARY_2026_05_28.md) | **SPEC ONLY** |
| Audit / observability | [Compliance audit](./ZORA_WALAT_XCH05_COMPLIANCE_OBSERVABILITY_AND_AUDIT_EVIDENCE_SPEC_2026_05_28.md) | **SPEC ONLY** |
| Launch gates | [Launch register](./ZORA_WALAT_XCH05_LAUNCH_APPROVAL_GATE_AND_NO_GO_REGISTER_2026_05_28.md) | **SPEC ONLY** |

---

## 3. Non-goals

| Non-goal | Status |
|----------|--------|
| KYC/AML runtime code | **OUT OF SCOPE** |
| Sanctions screening execution | **OUT OF SCOPE** |
| Provider integrations | **OUT OF SCOPE** |
| Legal or compliance approval | **OUT OF SCOPE** |
| Real-money exchange / payout / remittance | **OUT OF SCOPE** |
| Legal advice | **FORBIDDEN CLAIM** |

---

## 4. Compliance gate matrix overview

| Gate ID | Domain | Default | Document |
|---------|--------|---------|----------|
| **XCH5-COR** | Corridor readiness | **BLOCKED** | [Corridor](./ZORA_WALAT_XCH05_CORRIDOR_READINESS_AND_JURISDICTION_GATE_MODEL_2026_05_28.md) |
| **XCH5-KYC** | Customer/business identity | **BLOCKED** | [KYC/KYB](./ZORA_WALAT_XCH05_KYC_KYB_IDENTITY_VERIFICATION_GATE_MODEL_2026_05_28.md) |
| **XCH5-AML** | AML / sanctions screening | **BLOCKED** | [AML](./ZORA_WALAT_XCH05_AML_SANCTIONS_SCREENING_AND_WATCHLIST_GATE_MODEL_2026_05_28.md) |
| **XCH5-TM** | Transaction monitoring | **BLOCKED** | [TM](./ZORA_WALAT_XCH05_TRANSACTION_MONITORING_AND_RISK_SCORING_SPEC_2026_05_28.md) |
| **XCH5-OPS** | Manual review / operator | **BLOCKED** | [Manual review](./ZORA_WALAT_XCH05_MANUAL_REVIEW_QUEUE_AND_OPERATOR_DECISION_MODEL_2026_05_28.md) |
| **XCH5-PRIV** | Privacy / retention | **BLOCKED** | [Privacy](./ZORA_WALAT_XCH05_DATA_MINIMIZATION_PRIVACY_AND_RETENTION_BOUNDARY_2026_05_28.md) |
| **XCH5-LAUNCH** | Launch approval | **NO-GO** | [Launch](./ZORA_WALAT_XCH05_LAUNCH_APPROVAL_GATE_AND_NO_GO_REGISTER_2026_05_28.md) |

All gates must pass before any corridor launch — **none pass today**.

---

## 5. Corridor gate model

Corridor = `{sendJurisdiction, receiveJurisdiction, sendCurrency, receiveCurrency, payoutMethod}`.

| Check | Default |
|-------|---------|
| Sending jurisdiction legal review | **NOT OBTAINED** |
| Receiving jurisdiction legal review | **NOT OBTAINED** |
| Licensing / registration review | **NOT OBTAINED** |
| Corridor enabled in product | **NO** |

See [corridor model](./ZORA_WALAT_XCH05_CORRIDOR_READINESS_AND_JURISDICTION_GATE_MODEL_2026_05_28.md).

---

## 6. KYC/KYB gate model

| Tier | Requirement | Default |
|------|-------------|---------|
| Customer identity | Document + liveness (future) | **NOT INTEGRATED** |
| Business identity | KYB docs + UBO placeholder | **NOT INTEGRATED** |
| Risk tier assignment | Low / medium / high | **NOT DEPLOYED** |

See [KYC/KYB model](./ZORA_WALAT_XCH05_KYC_KYB_IDENTITY_VERIFICATION_GATE_MODEL_2026_05_28.md) · [XCH-02 identity contract](./ZORA_WALAT_XCH02_IDENTITY_KYC_KYB_PROVIDER_CONTRACT_2026_05_28.md).

---

## 7. AML / sanctions gate model

| Check | Default |
|-------|---------|
| Sanctions screening | **NOT RUN** |
| Watchlist screening | **NOT RUN** |
| PEP screening (future) | **NOT RUN** |
| Blocked match handling | Spec only — fail closed |

See [AML model](./ZORA_WALAT_XCH05_AML_SANCTIONS_SCREENING_AND_WATCHLIST_GATE_MODEL_2026_05_28.md) · [XCH-02 AML contract](./ZORA_WALAT_XCH02_AML_SANCTIONS_SCREENING_CONTRACT_2026_05_28.md).

---

## 8. Transaction monitoring gate model

| Control | Default |
|---------|---------|
| Velocity rules | **PLACEHOLDER** |
| Amount thresholds | **PLACEHOLDER** |
| Unusual activity queue | **NOT DEPLOYED** |
| SAR / legal filing automation | **FORBIDDEN** |

See [TM spec](./ZORA_WALAT_XCH05_TRANSACTION_MONITORING_AND_RISK_SCORING_SPEC_2026_05_28.md).

---

## 9. Legal / compliance review boundary

| Item | Status |
|------|--------|
| This pack is governance documentation | **YES** |
| Legal advice provided | **NO — NOT LEGAL ADVISORS** |
| Compliance program approved | **NOT OBTAINED** |
| Licensed / compliant status | **NOT CLAIMED** |

All corridor, KYC, AML, privacy, and launch decisions require **external counsel and compliance officer signoff** — not issued in XCH-05.

---

## 10. Approval gates (XCH-05 layer)

| Gate | Default |
|------|---------|
| **XCH5-G0** | Spec pack filed — **COMPLETE (DOCS ONLY)** |
| **XCH5-G1** | Legal corridor review — **BLOCKED** |
| **XCH5-G2** | Compliance program review — **BLOCKED** |
| **XCH5-G3** | Privacy / DPA review — **BLOCKED** |
| **XCH5-G4** | Provider due diligence — **BLOCKED** |
| **XCH5-G5** | Sandbox compliance spike — **BLOCKED** |

---

## 11. Explicit NO-GO default

| Item | Default |
|------|---------|
| KYC/AML runtime | **NO-GO** |
| Corridor launch | **NO-GO** |
| Real-money remittance | **NO-GO** |
| Controlled pilot | **NO-GO** |
| Licensed / compliant / production-ready | **NOT CLAIMED** |

---

## 12. Conservative verdict

| Item | Verdict |
|------|---------|
| XCH-05 gate matrix | **CREATED** |
| Compliance runtime | **NOT IMPLEMENTED** |

---

*XCH-05 compliance gate matrix — documentation only; not legal advice*
