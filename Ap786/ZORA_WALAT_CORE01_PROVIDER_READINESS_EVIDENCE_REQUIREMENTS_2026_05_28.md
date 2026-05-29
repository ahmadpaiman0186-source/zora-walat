# CORE-01 Provider Readiness Evidence Requirements

**Date:** 2026-05-28
**Parent:** [CORE-01 readiness review](./ZORA_WALAT_CORE01_PROVIDER_CATALOG_RELOADLY_READINESS_REVIEW_2026_05_28.md)
**Default:** **Controlled pilot NO-GO**

---

## 1. Required catalog evidence

| ID | Requirement | Owner placeholder | Status |
|----|-------------|-------------------|--------|
| CORE1-EV-CAT-01 | Redacted Reloadly operators list for AF (or provider export) | _Engineering_ | **PENDING** |
| CORE1-EV-CAT-02 | Operator map JSON validation report (keys ↔ Reloadly IDs) | _Engineering_ | **PENDING** |
| CORE1-EV-CAT-03 | Server airtime catalog vs client mock catalog diff report | _Engineering_ | **PENDING** |
| CORE1-EV-CAT-04 | Denomination / amount support matrix per operator | _Engineering + ops_ | **PENDING** |

---

## 2. Required operator support evidence

| ID | Requirement | Status |
|----|-------------|--------|
| CORE1-EV-OP-01 | Each checkout allowlist operator confirmed at provider | **PENDING** |
| CORE1-EV-OP-02 | Negative test: unsupported operator rejected pre-payment | **PENDING** |
| CORE1-EV-OP-03 | Phone validation test matrix (valid / invalid MSISDN) | **PENDING** |

---

## 3. Required product / amount evidence

| ID | Requirement | Status |
|----|-------------|--------|
| CORE1-EV-PRD-01 | Phase 1 airtime SKU list with retail + wholesale basis | **PARTIAL** (repo docs) |
| CORE1-EV-PRD-02 | Data product definition sign-off (if enabling data) | **PENDING** |
| CORE1-EV-PRD-03 | Calling product definition sign-off (if enabling calling) | **PENDING** |
| CORE1-EV-PRD-04 | Margin floor test outputs for min checkout amounts | **PENDING** |

---

## 4. Required sandbox provider evidence (if later approved)

**Not executed in CORE-01. Required only after explicit sandbox execution approval.**

| ID | Requirement | Status |
|----|-------------|--------|
| CORE1-EV-SBX-01 | `reloadly-sandbox-readiness` or equivalent output (redacted) | **NOT EXECUTED** |
| CORE1-EV-SBX-02 | Single AF airtime sandbox dispatch — order correlated | **NOT EXECUTED** |
| CORE1-EV-SBX-03 | Provider timeout simulation — fail-closed capture | **NOT EXECUTED** |
| CORE1-EV-SBX-04 | Duplicate POST / inquiry-before-retry capture | **NOT EXECUTED** |

---

## 5. Required payment / webhook evidence

| ID | Requirement | Status |
|----|-------------|--------|
| CORE1-EV-PAY-01 | Stripe sandbox checkout.session.completed → PAID | **PENDING** (STR staging gaps) |
| CORE1-EV-PAY-02 | Webhook signature rejection test (400) | **PARTIAL** (STR-08 probe) |
| CORE1-EV-PAY-03 | Unpaid / expired checkout — zero fulfillment | **PARTIAL** (L-9/L-10 history) |
| CORE1-EV-PAY-04 | Amount mismatch rejection | **PENDING** |

---

## 6. Required order-state evidence

| ID | Requirement | Status |
|----|-------------|--------|
| CORE1-EV-ORD-01 | State machine transition log: PENDING → PAID → QUEUED → terminal | **PENDING** |
| CORE1-EV-ORD-02 | Stuck order reconcile alert fired | **PENDING** |
| CORE1-EV-ORD-03 | Kill switch prevents dispatch when enabled | **PENDING** |

---

## 7. Required fulfillment confirmation evidence

| ID | Requirement | Status |
|----|-------------|--------|
| CORE1-EV-FUL-01 | Provider reference stored on success | **PENDING** |
| CORE1-EV-FUL-02 | Inquiry confirms provider truth matches order | **PENDING** |
| CORE1-EV-FUL-03 | Failed provider → terminal failed state | **PENDING** |

---

## 8. Required receipt / support evidence

| ID | Requirement | Status |
|----|-------------|--------|
| CORE1-EV-RCPT-01 | Order success screen with operator, amount, status | **PENDING** |
| CORE1-EV-RCPT-02 | Pending / failed user messaging samples | **PENDING** |
| CORE1-EV-SUP-01 | Support runbook for provider failure | **PENDING** |

---

## 9. Required rollback / fail-closed evidence

| ID | Requirement | Status |
|----|-------------|--------|
| CORE1-EV-RB-01 | Fulfillment kill switch drill | **PENDING** |
| CORE1-EV-RB-02 | Rollback plan for bad catalog deploy | **PENDING** |
| CORE1-EV-FC-01 | Mock fallback disabled in prod config attestation | **PENDING** |

---

## 10. Controlled pilot NO-GO default

| Gate | Status |
|------|--------|
| All CORE1-EV-* minimum set filed | **NO** |
| Sandbox provider execution approved | **NO** |
| Stakeholder pilot sign-off | **NO** |
| **Controlled pilot** | **NO-GO** |
| **Production / real-money** | **NO-GO** |

---

*CORE-01 evidence requirements — filing checklist only*
