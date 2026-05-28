# XCH-05 Decision Record Template

**Date:** 2026-05-28
**Default status:** **NO-GO / NOT APPROVED**

---

## 1. Decision metadata

| Field | Value |
|-------|-------|
| Decision ID | _XCH05-DR-_____ |
| Decision owner | _TBD_ |
| Corridor under review | _TBD_ |
| Implementation approval state | **NOT APPROVED** (default) |

---

## 2. Review status

| Review | Owner | Status |
|--------|-------|--------|
| Legal review | External counsel | **NOT OBTAINED** |
| Compliance review | Compliance officer | **NOT OBTAINED** |
| KYC/KYB review | Compliance + eng | **NOT OBTAINED** |
| AML/sanctions review | Compliance | **NOT OBTAINED** |
| Privacy review | Legal / DPO | **NOT OBTAINED** |
| Engineering review | Eng lead | **NOT OBTAINED** |
| Operations review | Ops lead | **NOT OBTAINED** |
| Risk approval | Program + compliance | **NOT OBTAINED** |

---

## 3. Spec acceptance checklist

| Document | Accepted? |
|----------|-----------|
| [Gate matrix](./ZORA_WALAT_XCH05_COMPLIANCE_CORRIDOR_KYC_AML_GATE_MATRIX_2026_05_28.md) | ☐ NO |
| [Corridor model](./ZORA_WALAT_XCH05_CORRIDOR_READINESS_AND_JURISDICTION_GATE_MODEL_2026_05_28.md) | ☐ NO |
| [KYC/KYB model](./ZORA_WALAT_XCH05_KYC_KYB_IDENTITY_VERIFICATION_GATE_MODEL_2026_05_28.md) | ☐ NO |
| [AML/sanctions model](./ZORA_WALAT_XCH05_AML_SANCTIONS_SCREENING_AND_WATCHLIST_GATE_MODEL_2026_05_28.md) | ☐ NO |
| [Transaction monitoring](./ZORA_WALAT_XCH05_TRANSACTION_MONITORING_AND_RISK_SCORING_SPEC_2026_05_28.md) | ☐ NO |
| [Manual review](./ZORA_WALAT_XCH05_MANUAL_REVIEW_QUEUE_AND_OPERATOR_DECISION_MODEL_2026_05_28.md) | ☐ NO |
| [Privacy boundary](./ZORA_WALAT_XCH05_DATA_MINIMIZATION_PRIVACY_AND_RETENTION_BOUNDARY_2026_05_28.md) | ☐ NO |
| [Compliance audit](./ZORA_WALAT_XCH05_COMPLIANCE_OBSERVABILITY_AND_AUDIT_EVIDENCE_SPEC_2026_05_28.md) | ☐ NO |
| [Launch register](./ZORA_WALAT_XCH05_LAUNCH_APPROVAL_GATE_AND_NO_GO_REGISTER_2026_05_28.md) | ☐ NO |

---

## 4. Rollback boundary

| Trigger | Action |
|---------|--------|
| Spec rejected | Supersede version; no corridor enable |
| Compliance objection | **Immediate NO-GO** |
| Provider DD failure | Block integration |

Docs-only: git revert Ap786 XCH-05 files; **no production impact**.

---

## 5. Launch boundary

| Item | Default |
|------|---------|
| Corridor launch | **NOT AUTHORIZED** |
| Real-money transactions | **NO** |
| Controlled pilot | **NO-GO** |

---

## 6. Explicit NO-GO default

| Item | Status |
|------|--------|
| Implementation approved | **NO** |
| Licensed / compliant / remittance-ready | **NOT CLAIMED** |
| Legal advice provided | **NO** |

---

*XCH-05 decision template — no approval issued*
