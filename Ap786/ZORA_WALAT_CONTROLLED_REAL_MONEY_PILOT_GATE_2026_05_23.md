# Zora-Walat — Controlled Real-Money Pilot Gate (Post-Webhook Remediation)

**Date:** 2026-05-23
**Status:** **GATE DEFINITION ONLY** — pilot **NO-GO**
**Parent:** [CHECKOUT_EXPIRED_TIMEOUT_REMEDIATION_PLAN](./ZORA_WALAT_CHECKOUT_EXPIRED_TIMEOUT_REMEDIATION_PLAN_2026_05_23.md)
**Cross-ref:** [REAL_MONEY_LAUNCH_GATE](./ZORA_WALAT_REAL_MONEY_LAUNCH_GATE_CHECKLIST_2026_05_22.md) · [G-04](./ZORA_WALAT_FINAL_APPROVAL_GATE_ROADMAP_2026_05_21.md)

---

## 1. Purpose

Define **strict gates** before any controlled real-money or live-Stripe pilot — after webhook remediation is implemented and evidenced. **No broad launch claim** is permitted when only staging test-mode timeout evidence exists (PR #50).

---

## 2. Current state (pre-pilot)

| Dimension | Status |
|-----------|--------|
| Stripe timeout evidence (staging test) | **FILED** |
| Root cause | **NOT CONFIRMED** |
| Fix | **NOT EXECUTED** |
| Staging replay PASS | **NOT MET** |
| Production webhook certified | **NOT PROVEN** (STRIPE-WH-008) |
| Controlled pilot | **NO-GO** |
| Production launch | **NO-GO** |
| Real-money launch | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

## 3. Gate requirements (all must pass)

### 3.1 Governance

| Gate ID | Requirement | Evidence | Status |
|---------|-------------|----------|--------|
| PG-01 | Stakeholder approval (written) | `SIGN-APPR-PILOT-*` | **PENDING** |
| PG-02 | Credential / env approval (Gate 4) | G-01 matrix row | **NOT APPROVED** |
| PG-03 | Incident commander assigned | Role placeholder in ticket | **PENDING** |
| PG-04 | Daily review calendar for pilot window | Schedule attestation | **PENDING** |

### 3.2 Technical proof (staging)

| Gate ID | Requirement | Evidence | Status |
|---------|-------------|----------|--------|
| PG-10 | Staging replay PASS | [STAGING_REPLAY_TEST_PLAN](./ZORA_WALAT_STAGING_REPLAY_TEST_PLAN_2026_05_23.md) E-01…E-07 | **NOT MET** |
| PG-11 | `checkout.session.expired` delivery 200 | Stripe PNG | **NOT MET** |
| PG-12 | No duplicate transaction PASS | ID-T-06 filed | **NOT MET** |
| PG-13 | No-pay-no-service PASS | ID-T-09 / NPS tests | **NOT MET** |
| PG-14 | Fast ACK + idempotency deployed to staging SHA | Deploy attestation | **NOT MET** |

### 3.3 Observability and operations

| Gate ID | Requirement | Evidence | Status |
|---------|-------------|----------|--------|
| PG-20 | Monitoring + alerts live | OBS-WH-* dashboards | **NOT MET** |
| PG-21 | Rollback drill PASS | RB-01…04 | **NOT MET** |
| PG-22 | Kill switch tested | Flag attestation | **NOT MET** |
| PG-23 | Log retention ≥ pilot window + 7 days | Vendor plan | **NOT MET** |

### 3.4 Pilot scope limits

| Gate ID | Requirement | Value (TBD at approval) |
|---------|-------------|---------------------------|
| PG-30 | Max pilot users | Placeholder: ≤ 10 |
| PG-31 | Max transaction amount | Placeholder: lowest SKU |
| PG-32 | Geographic scope | Single market TBD |
| PG-33 | Duration | ≤ 7 calendar days initial |
| PG-34 | Kill switch owner | Payments + Engineering on-call |

**Rule:** Exceeding any limit requires **new** PG-01 approval — not autonomous expansion.

---

## 4. Forbidden pilot claims

| Claim | Allowed? |
|-------|----------|
| "Webhook fixed globally" | **No** |
| "Production-ready" | **No** |
| "Real-money safe for all users" | **No** |
| "Root cause confirmed" | **No** (unless EC met) |
| "QA PASS" | **No** |
| "Investor launch approved" | **No** — separate Gate 1 / board |

---

## 5. Kill switch and rollback

| Control | Requirement |
|---------|-------------|
| Kill switch | Disable webhook processing or force queue drain mode |
| Stripe | Disable live endpoint or pause pilot signups — **human only** |
| Deploy rollback | Previous SHA < 15 min runbook |
| Communication | Status page / stakeholder notify template |

---

## 6. Daily review (during pilot)

| Review item | Question |
|-------------|----------|
| Stripe deliveries | Any failures in 24h? |
| `processing_failed` | Count > 0? |
| Duplicate blocks | Unexpected spike? |
| NPS blocks | False positives? |
| Order reconcile | Sample manual match |

**Stop pilot if:** Any PG-10…14 regression or unexplained money-path anomaly.

---

## 7. Exit from pilot (not launch)

| Outcome | Next step |
|---------|-----------|
| **PASS** | File pilot report; plan prod certification (STRIPE-WH-008) — **separate gate** |
| **FAIL** | Kill switch; RCA; **NO-GO** remains |
| **INCONCLUSIVE** | Extend only with PG-01 re-approval |

**Pilot PASS does not equal production GO.**

---

## 8. Verdict

| Verdict | Value |
|---------|-------|
| Controlled pilot | **NO-GO** until PG-01…PG-34 pass |
| Production launch | **NO-GO** |
| Real-money launch | **NO-GO** |
| Root cause | **NOT CONFIRMED** |
| Fix | **NOT EXECUTED** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*Controlled pilot gate · plan only · not an approval to run pilot*

