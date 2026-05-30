# CORE-11 Compliance, Security, and Credential Approval Checklist

**Date:** 2026-05-29  
**Status:** **ALL PENDING**

---

## Compliance / legal

| ID | Check | Status |
|----|-------|--------|
| C-01 | Corridor legal review (top-up / data) | **PENDING** |
| C-02 | KYC / KYB posture documented | **PENDING** |
| C-03 | AML / sanctions screening policy | **PENDING** |
| C-04 | Privacy / data processing for payment data | **PENDING** |
| C-05 | Terms of service / refund policy aligned | **PENDING** |
| C-06 | Cross-border remittance **excluded** unless separate track | **N/A** (core only) |

Evidence: **CORE11-EV-COMPLY**

---

## Security

| ID | Check | Status |
|----|-------|--------|
| S-01 | Stripe keys live vs test separation verified | **PENDING** |
| S-02 | Reloadly sandbox vs live separation verified | **PENDING** |
| S-03 | Webhook signing secrets rotation plan | **PENDING** |
| S-04 | DB access least-privilege for money path | **PENDING** |
| S-05 | secrets:scan CI PASS on release branch | **PENDING** |
| S-06 | No secrets in Ap786 / evidence filings | **PENDING** |

Evidence: **CORE11-EV-CRED**

---

## Credential approval

| ID | Check | Status |
|----|-------|--------|
| K-01 | Production credential rotation **not** executed in CORE-11 | **CONFIRMED** |
| K-02 | Credential owners named | **PENDING** |
| K-03 | Break-glass procedure documented | **PENDING** |
| K-04 | Live credential ambiguity → automatic **NO-GO** | **CONFIRMED** (policy) |

---

## Conservative verdict

Compliance / security **NOT APPROVED** for real-money.

---

*End of checklist.*
