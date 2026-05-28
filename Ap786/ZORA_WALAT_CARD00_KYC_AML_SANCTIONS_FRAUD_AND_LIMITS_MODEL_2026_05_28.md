# CARD-00 KYC / AML / Sanctions / Fraud And Limits Model

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO COMPLIANCE APPROVAL**

**Related:** [XCH-05 compliance](./ZORA_WALAT_XCH05_COMPLIANCE_CORRIDOR_KYC_AML_GATE_MATRIX_2026_05_28.md)

---

## 1. KYC / KYB gate

| Party | Requirement | Status |
|-------|-------------|--------|
| Sender | Full KYC per send jurisdiction | **NOT IMPLEMENTED** |
| Recipient | Bank KYC + platform KYC | **NOT IMPLEMENTED** |
| Business senders | KYB + UBO | **PLACEHOLDER** |

---

## 2. AML gate

| Control | Status |
|---------|--------|
| Transaction monitoring | **PLACEHOLDER** |
| SAR workflow | Human compliance only — **no automation claim** |
| Periodic review | Policy TBD |

---

## 3. Sanctions gate

| Screen | When | Status |
|--------|------|--------|
| Sender | Onboarding + each transfer | **NOT RUN** |
| Recipient | Onboarding + activation | **NOT RUN** |
| Beneficiary bank | If applicable | **NOT RUN** |

Fail-closed on `unavailable`.

---

## 4. Fraud monitoring

| Signal | Action |
|--------|--------|
| Velocity anomaly | Hold |
| Device / geo mismatch | Step-up or block |
| Merchant category risk | Decline or review |
| Card-not-present fraud pattern | Block |

---

## 5. Limits (placeholders)

| Limit type | Example | Approval |
|------------|---------|----------|
| Per-transaction | Tier-based | Compliance + issuer |
| Daily / monthly velocity | Tier-based | Compliance + issuer |
| ATM daily withdrawal | Regulatory cap | Legal + issuer |
| Corridor aggregate | Per corridor | Compliance |

All limits **not approved** for CARD-00.

---

## 6. Merchant / category risk controls

| MCC class | Default |
|-----------|---------|
| Gambling, crypto, adult | **BLOCK** (proposed) |
| High-risk jurisdictions | **BLOCK** |

Issuer scheme rules may override.

---

## 7. Manual review

| Trigger | Queue |
|---------|-------|
| Sanctions potential match | Compliance |
| Fraud score threshold | Ops + compliance |
| Limit override request | Dual approval |

---

## 8. Compliance claim boundary

| Claim | Status |
|-------|--------|
| Controls specified | **YES** |
| Compliance-approved program | **NOT CLAIMED** |
| Legal advice | **NOT PROVIDED** |

---

*CARD-00 compliance model — gates only*
