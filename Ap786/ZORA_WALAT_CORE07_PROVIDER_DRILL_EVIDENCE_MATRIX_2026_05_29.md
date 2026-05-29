# CORE-07 Provider Drill Evidence Matrix

**Date:** 2026-05-29  
**Status:** All rows **PENDING** — drill **NOT EXECUTED**

---

## Evidence acceptance rules

| Rule | Detail |
|------|--------|
| Format | Sanitized markdown + redacted screenshots; **no** secrets, JWTs, raw PAN, live API keys |
| Verdict | Each row: **PASS** \| **FAIL** \| **PENDING** \| **N/A** |
| Gate | Drill may not be marked **COMPLETE** until **CORE7-EV-016** filed with conservative **NO-GO** or limited sandbox partial |

---

## Matrix

| ID | Required evidence | Captures | Status |
|----|-------------------|----------|--------|
| **CORE7-EV-001** | Operator approval | Verbatim phrase `APPROVE CORE-07 RELOADLY SANDBOX DRILL ONLY`, date, approver role, DR id | **PENDING** |
| **CORE7-EV-002** | Sandbox mode confirmation | `RELOADLY_ENV` / config label (redacted values OK) | **PENDING** |
| **CORE7-EV-003** | Provider environment | Sandbox OAuth audience, client id suffix, host URL (no secrets) | **PENDING** |
| **CORE7-EV-004** | Endpoint / provider mode | API base, deployment label (staging vs prod), corridor | **PENDING** |
| **CORE7-EV-005** | No production DB write | DB branch name or explicit “no-write drill” attestation | **PENDING** |
| **CORE7-EV-006** | No Stripe live mode | Stripe dashboard mode or “not used in drill” | **PENDING** |
| **CORE7-EV-007** | No payment/order/wallet mutation | Before/after order status enum or zero mutation attestation | **PENDING** |
| **CORE7-EV-008** | Abort criteria acknowledged | Operator initials on stop-condition doc | **PENDING** |
| **CORE7-EV-009** | Evidence capture plan | Owner + file paths for each CORE7-EV row | **PENDING** |
| **CORE7-EV-010** | Idempotency key / duplicate-safety | Canonical key used; CORE-05 classify outcome (fixture or log) | **PENDING** |
| **CORE7-EV-011** | No-pay-no-service guardrail | CORE-06 decision ≠ ALLOW_DELIVERY without payment+provider proof | **PENDING** |
| **CORE7-EV-012** | No-charge proof | Provider/billing panel showing sandbox / zero customer charge | **PENDING** |
| **CORE7-EV-013** | Request payload redaction | Sample request log with secrets stripped | **PENDING** |
| **CORE7-EV-014** | No customer impact | No production user id / MSISDN; test recipient only | **PENDING** |
| **CORE7-EV-015** | Provider response status | HTTP status, normalized outcome, latency | **PENDING** |
| **CORE7-EV-016** | Provider reference id | Sandbox transaction id / customIdentifier (if returned) | **PENDING** |
| **CORE7-EV-017** | No delivery without provider proof | Order not FULFILLED; serviceDeliveredFlag false | **PENDING** |
| **CORE7-EV-018** | Logs / audit | Correlation ids, audit events present or gap documented | **PENDING** |
| **CORE7-EV-019** | Final conservative verdict | Signed summary: provider proof **NOT VERIFIED** unless explicit partial sandbox scope | **PENDING** |

---

## Cross-reference to guardrails

| Evidence | Guardrail doc |
|----------|----------------|
| CORE7-EV-010 | [Duplicate transaction drill guardrails](./ZORA_WALAT_CORE07_DUPLICATE_TRANSACTION_DRILL_GUARDRAILS_2026_05_29.md) |
| CORE7-EV-011, CORE7-EV-017 | [No-pay-no-service drill guardrails](./ZORA_WALAT_CORE07_NO_PAY_NO_SERVICE_DRILL_GUARDRAILS_2026_05_29.md) |
| CORE7-EV-008, abort | [Abort / rollback / stop conditions](./ZORA_WALAT_CORE07_ABORT_ROLLBACK_AND_STOP_CONDITIONS_2026_05_29.md) |

---

## Conservative verdict (matrix-level)

Provider sandbox drill evidence **NOT FILED**. Provider proof **NOT VERIFIED**. Production / real-money / controlled pilot / market launch **NO-GO**.

---

*End of matrix.*
