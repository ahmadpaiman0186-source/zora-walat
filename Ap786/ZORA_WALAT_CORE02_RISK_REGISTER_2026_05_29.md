# CORE-02 Risk Register

**Date:** 2026-05-29  
**Status:** All risks **OPEN** unless noted  
**No risk acceptance without signed decision record**

---

## 1. Risk summary

| ID | Risk | Severity | Likelihood | Status |
|----|------|----------|------------|--------|
| CORE2-R-01 | Sandbox success mistaken for production readiness | **Critical** | Medium | **OPEN** |
| CORE2-R-02 | User charged, provider fails, UI shows delivered | **Critical** | Medium | **OPEN** |
| CORE2-R-03 | Catalog UI shows data/call products without backend support | **High** | Medium | **OPEN** |
| CORE2-R-04 | Operator ID map drift (wrong MNO) | **High** | Medium | **OPEN** |
| CORE2-R-05 | Duplicate provider POST on timeout retry | **High** | Low | **OPEN** |
| CORE2-R-06 | Ambiguous provider 200 without transaction id | **High** | Medium | **OPEN** |
| CORE2-R-07 | Sandbox credentials used against production host | **Critical** | Low | **OPEN** |
| CORE2-R-08 | Evidence filed without redaction (secrets/PII) | **High** | Medium | **OPEN** |
| CORE2-R-09 | Intl call scope creep without legal review | **High** | Low | **OPEN** |
| CORE2-R-10 | Pilot approved on sandbox-only proof | **Critical** | Low | **OPEN** |
| CORE2-R-11 | `.env.local` overrides wrong Reloadly mode | **High** | Medium | **OPEN** |
| CORE2-R-12 | Governance pack bypassed — direct API drill | **Critical** | Low | **OPEN** |

---

## 2. Mitigations (planning — not proven)

| ID | Mitigation | Verification |
|----|------------|--------------|
| CORE2-R-01 | Mandatory labels on all sandbox artifacts; NO-GO table in master doc | CORE2-EV-SBX-03 |
| CORE2-R-02 | No-pay-no-service rules + state review | CORE2-EV-PAY-02 |
| CORE2-R-03 | CORE2-EV-CAT-05 UI parity review | **PENDING** |
| CORE2-R-04 | Operator matrix + per-operator sandbox proof | CORE2-EV-CAT-02, SBX-04 |
| CORE2-R-05 | Idempotency drill | CORE2-EV-SBX-06 |
| CORE2-R-06 | Pending verification policy | PAY-02, SBX-05 |
| CORE2-R-07 | Pre-drill checklist SBX-01/02 | **PENDING** |
| CORE2-R-08 | Redaction rules in evidence matrix | Ops review |
| CORE2-R-09 | CORE2-GATE-IC closed until DR | CAT-04 |
| CORE2-R-10 | Separate pilot DR; CORE-02 does not approve pilot | DR template |
| CORE2-R-11 | Env precedence attestation (names only) | SBX-01 |
| CORE2-R-12 | Execution NOT AUTHORIZED without DR phrase | DR template §6 |

---

## 3. Residual acceptance

| Item | Status |
|------|--------|
| Any risk accepted for production | **NOT ACCEPTED** |
| Any risk accepted for sandbox drill | **PENDING DR** |

---

## 4. Claim boundary

| Claim | Allowed? |
|-------|----------|
| Risks **IDENTIFIED** | **YES** |
| Risks **MITIGATED** | **NO** (default) |

---

*End of risk register.*
