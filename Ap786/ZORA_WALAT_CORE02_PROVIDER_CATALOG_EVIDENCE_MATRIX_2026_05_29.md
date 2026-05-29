# CORE-02 Provider Catalog Evidence Matrix

**Date:** 2026-05-29  
**Status:** **PLANNING ONLY — NO EVIDENCE FILED IN THIS PACK**  
**Default:** All rows **PENDING**

---

## 1. How to use this matrix

| Column | Meaning |
|--------|---------|
| **Evidence ID** | Stable ID for manifests and decision records |
| **Required artifact** | What must exist before acceptance |
| **Redaction** | No secrets, keys, PII, raw webhooks, full phone numbers |
| **Status** | **PENDING** until operator files under `Ap786/evidence/core02-*` with manifest |

**Acceptance authority:** Engineering + ops sign-off on DR — **NOT** auto-granted by filing PNGs alone.

---

## 2. Catalog and product definition

| Evidence ID | Required artifact | Corridor | Status |
|-------------|-------------------|----------|--------|
| CORE2-EV-CAT-01 | Signed product scope: airtime vs data vs intl call **excluded** | All | **PENDING** |
| CORE2-EV-CAT-02 | Operator × country matrix (planning table, no live API dump) | Top-up | **PENDING** |
| CORE2-EV-CAT-03 | Data SKU list with validity/expiry fields defined | Data | **PENDING** |
| CORE2-EV-CAT-04 | Intl call boundary decision (**IN / OUT**) | Call | **PENDING** |
| CORE2-EV-CAT-05 | UI/catalog parity review: no purchasable row without server-trusted SKU | All | **PENDING** |

---

## 3. Reloadly sandbox boundary proof

| Evidence ID | Required artifact | Status |
|-------------|-------------------|--------|
| CORE2-EV-SBX-01 | Written attestation: `RELOADLY_SANDBOX=true` (or equivalent) for drill environment — **env names only**, no values | **PENDING** |
| CORE2-EV-SBX-02 | Sandbox vs production host boundary checklist completed | **PENDING** |
| CORE2-EV-SBX-03 | Operator runbook acknowledgment: sandbox credits are **not** production delivery proof | **PENDING** |
| CORE2-EV-SBX-04 | Sanitized trace: one sandbox top-up attempt **or** documented abort with reason | **PENDING** |
| CORE2-EV-SBX-05 | Sanitized trace: provider timeout / 5xx drill — fail-closed behavior observed | **PENDING** |
| CORE2-EV-SBX-06 | Sanitized trace: duplicate idempotency replay — no double delivery claim | **PENDING** |

---

## 4. Payment and no-pay-no-service

| Evidence ID | Required artifact | Status |
|-------------|-------------------|--------|
| CORE2-EV-PAY-01 | Scenario matrix: provider fail **before** pay / **after** pay / ambiguous | **PENDING** |
| CORE2-EV-PAY-02 | Order state diagram review signed — no **DELIVERED** without provider confirm | **PENDING** |
| CORE2-EV-PAY-03 | Stripe sandbox path correlation (session → webhook → order) — **sanitized** | **PENDING** |
| CORE2-EV-PAY-04 | Refund / manual review path when paid but not fulfilled | **PENDING** |

---

## 5. Fulfillment and receipt

| Evidence ID | Required artifact | Status |
|-------------|-------------------|--------|
| CORE2-EV-FUL-01 | Fulfillment success criteria per corridor (top-up / data) | **PENDING** |
| CORE2-EV-FUL-02 | Provider reference ID on receipt template (redacted sample) | **PENDING** |
| CORE2-EV-FUL-03 | Pending / manual_required escalation trace (tabletop or sanitized log) | **PENDING** |

---

## 6. Operations and support

| Evidence ID | Required artifact | Status |
|-------------|-------------------|--------|
| CORE2-EV-OPS-01 | Support script: “paid, not delivered” | **PENDING** |
| CORE2-EV-OPS-02 | Reconciliation playbook cross-ref (no duplicate settlement) | **PENDING** |
| CORE2-EV-OPS-03 | Rollback / abort attestation after sandbox drill | **PENDING** |

---

## 7. Minimum evidence before sandbox provider execution (L2 gate)

All of the following must be **FILED + ACCEPTED** before any **approved** sandbox provider API execution:

| Bucket | Minimum IDs |
|--------|-------------|
| Catalog | CORE2-EV-CAT-01, CORE2-EV-CAT-02 (top-up) or CORE2-EV-CAT-03 (data) |
| Sandbox boundary | CORE2-EV-SBX-01, CORE2-EV-SBX-02, CORE2-EV-SBX-03 |
| No-pay-no-service | CORE2-EV-PAY-01, CORE2-EV-PAY-02 |
| Governance | Signed [CORE02 decision record](./ZORA_WALAT_CORE02_DECISION_RECORD_TEMPLATE_2026_05_29.md) — sandbox scope only |

**Missing any minimum → sandbox execution remains **NO-GO**.**

---

## 8. Minimum evidence before controlled pilot (reference only)

Controlled pilot requires **L4** gates outside CORE-02 (Stripe, webhook, staging routing, etc.). CORE-02 does **not** certify pilot readiness.

| Requirement | Status |
|-------------|--------|
| All CORE2-EV-SBX-* for intended corridors **ACCEPTED** | **PENDING** |
| All CORE2-EV-PAY-* **ACCEPTED** | **PENDING** |
| Production Reloadly credentials governance | **NOT VERIFIED** |
| Controlled pilot DR (separate program) | **NOT APPROVED** |

**Controlled pilot: NO-GO.**

---

## 9. Claim boundary

| Claim | Allowed? |
|-------|----------|
| Evidence matrix **DEFINED** | **YES** |
| Evidence **SATISFIED** | **NO** (default) |
| Provider sandbox proof **COMPLETE** | **NO** |

---

*End of evidence matrix.*
