# XCH-05 Data Minimization, Privacy, And Retention Boundary

**Date:** 2026-05-28
**Status:** **SPECIFICATION ONLY / NO PRIVACY COMPLIANCE CLAIM**

---

## 1. Data minimization principle

| Rule | Policy |
|------|--------|
| Collect only fields required for gate | **REQUIRED** |
| No excess PII in application logs | **REQUIRED** |
| Tokenize identifiers in observability | **REQUIRED** |
| Purpose limitation | Use data only for stated gate purpose |

---

## 2. PII handling boundary

| Data class | Storage | Logs |
|------------|---------|------|
| Government ID images | Encrypted vault (future) | **FORBIDDEN** |
| Full name | Secure DB (future) | Token only |
| DOB | Secure DB (future) | **FORBIDDEN** |
| Bank account details | Encrypted; PCI/partner rules | **FORBIDDEN** |

**No production data processing** in current Zora-Walat remittance scope.

---

## 3. Provider data-sharing boundary

| Rule | Status |
|------|--------|
| DPA with each KYC/AML provider | **NOT EXECUTED** |
| Minimum necessary fields to provider | **REQUIRED** when integrated |
| Cross-border transfer assessment | **LEGAL REVIEW REQUIRED** |
| Sub-processor disclosure | Privacy policy update required |

---

## 4. Evidence retention placeholder

| Record type | Proposed retention | Approval |
|-------------|-------------------|----------|
| KYC documents | Legal-defined period | **NOT APPROVED** |
| AML screening results | Legal-defined period | **NOT APPROVED** |
| Manual review cases | Legal-defined period | **NOT APPROVED** |
| Debug logs with PII | **Minimize / exclude** | Engineering |

---

## 5. Deletion / retention review boundary

| Action | Gate |
|--------|------|
| Customer deletion request | Legal + compliance workflow |
| Retention override | Legal approval only |
| Provider data purge | Contract + audit trail |

---

## 6. Legal / privacy review required

| Deliverable | Status |
|-------------|--------|
| Privacy policy (remittance scope) | **NOT REVIEWED** |
| DPIA / PIA (if applicable) | **NOT FILED** |
| Cookie / consent (if applicable) | **NOT REVIEWED** |

---

## 7. Claim boundaries

| Claim | Status |
|-------|--------|
| Privacy boundary specified | **YES** |
| GDPR / privacy compliance | **NOT CLAIMED** |
| Production data processing | **NOT ENABLED** for remittance |

---

*XCH-05 privacy boundary — not legal advice; no compliance claim*
