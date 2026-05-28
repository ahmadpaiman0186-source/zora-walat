# XCH-05 KYC / KYB Identity Verification Gate Model

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO KYC PROVIDER INTEGRATION**

**Related:** [XCH-02 identity contract](./ZORA_WALAT_XCH02_IDENTITY_KYC_KYB_PROVIDER_CONTRACT_2026_05_28.md)

---

## 1. Customer identity gate (KYC)

| Stage | Requirement | Default |
|-------|-------------|---------|
| `kyc_not_started` | User registered | N/A |
| `kyc_pending` | Documents submitted | **NOT IMPLEMENTED** |
| `kyc_manual_review` | Ops queue | **NOT DEPLOYED** |
| `kyc_verified` | Provider + policy pass | **NOT ISSUED** |
| `kyc_rejected` | Fail closed | Spec only |
| `kyc_expired` | Re-verification required | Spec only |

Quote / fund / payout **blocked** until `kyc_verified` (future gate).

---

## 2. Business identity gate (KYB)

| Stage | Requirement | Default |
|-------|-------------|---------|
| Entity registration proof | Document upload | **PLACEHOLDER** |
| Authorized signatory | Identity match | **PLACEHOLDER** |
| Business risk tier | Manual + rules | **NOT DEPLOYED** |

---

## 3. Document verification gate

| Document class | Verification | Provider |
|----------------|--------------|----------|
| Government ID | Authenticity + expiry | Future KYC port |
| Proof of address | Match policy | Future KYC port |
| Business registration | Registry check | Future KYB port |

**No provider integrated.**

---

## 4. Beneficial ownership placeholder

| Field | Status |
|-------|--------|
| UBO identification | **PLACEHOLDER STRUCTURE** |
| Ownership percentage threshold | Legal review required |
| PEP / sanctions cross-check on UBO | Links to AML gate |

---

## 5. Risk tier assignment

| Tier | Triggers (proposed) | Controls |
|------|---------------------|----------|
| **Low** | Standard KYC pass | Normal limits |
| **Medium** | Corridor / amount flags | Enhanced monitoring |
| **High** | Manual review required | Hold + dual approval |

Tier assignment → **compliance approval** before enforcement.

---

## 6. Manual review requirement

| Trigger | Action |
|---------|--------|
| Document quality failure | Ops review queue |
| Name mismatch | Ops review queue |
| High-risk jurisdiction | Compliance review |
| Provider `review_required` result | **HOLD** |

---

## 7. Provider-neutral verification boundary

| Rule | Status |
|------|--------|
| Use [XCH-02 identity port](./ZORA_WALAT_XCH02_IDENTITY_KYC_KYB_PROVIDER_CONTRACT_2026_05_28.md) | **DESIGN ONLY** |
| No provider-specific logic in core | **REQUIRED** |
| Provider adapter | **NOT IMPLEMENTED** |

---

## 8. Integration claim boundary

| Claim | Status |
|-------|--------|
| KYC/KYB gate model specified | **YES** |
| KYC provider integration | **NOT IMPLEMENTED** |
| Production identity verification | **NO-GO** |

---

*XCH-05 KYC/KYB gates — no provider integration*
