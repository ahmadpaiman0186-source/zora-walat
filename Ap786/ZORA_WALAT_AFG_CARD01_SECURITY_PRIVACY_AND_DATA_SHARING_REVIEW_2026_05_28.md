# AFG-CARD-01 Security, Privacy, And Data Sharing Review

**Date:** 2026-05-28
**Status:** **REVIEW CHECKLIST ONLY**

---

## 1. PII boundary

| Data | Handling |
|------|----------|
| National ID | Encrypted vault — future |
| Phone / MSISDN | Minimize in logs |
| Name | Secure store; token in observability |
| Bill account refs | Purpose-limited |

---

## 2. Partner data sharing

| Partner | Share minimum | DPA required |
|---------|---------------|--------------|
| Bank | KYC subset | **YES — not signed** |
| Switch | Transaction metadata | **YES — not signed** |
| Biller | Account ref + payment | **YES — not signed** |
| Telecom | MSISDN + amount | **YES — not signed** |

---

## 3. Card data boundary

| Rule | Status |
|------|--------|
| No PAN storage on platform (target) | **DESIGN GOAL** |
| No CVV storage | **REQUIRED** |
| Tokenization via issuer/processor | **NOT IMPLEMENTED** |

**No PAN/token handling in current product** — **not claimed as PCI compliant**.

---

## 4. Access control requirements

| Control | Requirement |
|---------|-------------|
| Role-based access | Ops / finance / compliance separation |
| MFA for admin | **REQUIRED** |
| Break-glass audited | **REQUIRED** |

---

## 5. Audit logging requirements

Append-only audit for: KYC decisions, payment submits, manual overrides, partner API calls (metadata only).

---

## 6. Data retention review

Retention periods → **legal gate** — not approved in AFG-CARD-01.

---

## 7. Claim boundary

| Claim | Status |
|-------|--------|
| Review requirements filed | **YES** |
| Privacy compliance (GDPR etc.) | **NOT CLAIMED** |
| PCI DSS certified | **NOT CLAIMED** |

---

*AFG-CARD-01 security/privacy — review only*
