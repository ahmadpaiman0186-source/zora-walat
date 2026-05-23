# Zora-Walat — Stripe Webhook Implementation Risk Register

**Date:** 2026-05-23
**Status:** **PLAN ONLY**
**Parent:** [IMPLEMENTATION_APPROVAL_GATE](./ZORA_WALAT_STRIPE_WEBHOOK_FAST_ACK_IMPLEMENTATION_APPROVAL_GATE_2026_05_23.md)

---

## 1. Purpose

Track risks for future fast ACK + async webhook implementation. All risks **OPEN** until mitigated with filed evidence.

---

## 2. Risk summary

| Severity | Open | Mitigated |
|----------|------|-----------|
| Critical | 4 | 0 |
| High | 4 | 0 |
| Medium | 2 | 0 |

---

## 3. Risk register

| Risk ID | Risk | Likelihood | Impact | Money-path | Mitigation (plan) | Evidence required | Status |
|---------|------|------------|--------|------------|-------------------|-------------------|--------|
| **R-01** | **Duplicate transaction** on Stripe retry | Medium | Critical | Double PAID / credit | Idempotency keys; TM-05…08 | CI PASS + staging replay | **OPEN** |
| **R-02** | **False paid access** — fulfill without payment | Low | Critical | Unpaid service | NPS gates; TM-09 | NPS test PASS | **OPEN** |
| **R-03** | **Webhook replay side effects** (operator or Stripe) | Medium | High | Duplicate state | 200 on duplicate; no dashboard resend without G-02 | AP-06 audit | **OPEN** |
| **R-04** | **Event persistence mismatch** — ack without durable row | Low | Critical | Lost events | TX outbox before ack; TM-12 | Integration test | **OPEN** |
| **R-05** | **Partial processing** — worker crash mid-transition | Medium | High | Inconsistent order | Outbox status + retry; TM-11 | Worker failure test | **OPEN** |
| **R-06** | **Observability gaps** — cannot diagnose timeout | High | Medium | Blind RCA | TM-LOG sequence; Gate 3 dashboards | OBS PNGs filed | **OPEN** |
| **R-07** | **Timeout recurrence** on expired path | Medium | High | Missed expiry handling | Fast ACK; TM-10, TM-14 | Stripe 200 PNG | **OPEN** |
| **R-08** | **Env misconfiguration** — wrong webhook secret | Low | Critical | All events rejected or accepted wrongly | TM-04; AP-04 | Env parity checklist | **OPEN** |
| **R-09** | **Migration risk** — outbox schema deploy | Medium | High | Downtime / failed deploy | AP-05; staging-first; rollback plan | Migration attestation | **OPEN** |
| **R-10** | **Operator error** — manual resend / wrong deploy | Medium | High | Duplicate or outage | G-02; rollback drill RT-01 | Drill filed | **OPEN** |

---

## 4. Risk-to-test mapping

| Risk | Primary tests | Primary doc |
|------|---------------|-------------|
| R-01 | TM-05…08, TM-12…13 | Idempotency plan |
| R-02 | TM-09 | NPS audit |
| R-03 | TM-05, SR-* | Staging replay plan |
| R-04 | TM-01, TM-12 | Fast ACK design |
| R-05 | TM-11 | Rollback plan |
| R-06 | TM-18, SR-02 | Observability plan |
| R-07 | TM-10, TM-14, SR-01 | Remediation plan |
| R-08 | TM-04 | Gate 4 pack |
| R-09 | AP-05, RT-01 | Allowed changeset CS-09 |
| R-10 | RT-01…03 | Rollback plan |

---

## 5. Residual risk acceptance

**No residual risk accepted** for production or pilot until:

1. All Critical risks have **MITIGATED** status with evidence links.
2. [Pilot gate](./ZORA_WALAT_CONTROLLED_REAL_MONEY_PILOT_GATE_2026_05_23.md) PG-01…PG-34 pass.
3. Root cause may remain **NOT CONFIRMED** for May 19 — but **forward** behavior must be proven.

---

## 6. Verdict

| Verdict | Value |
|---------|-------|
| Risk register | **FILED** |
| Risks mitigated | **0 / 10** |
| Implementation approval | **PENDING** |
| Fix | **NOT EXECUTED** |
| Production / pilot | **NO-GO** |

---

*Implementation risk register · all risks OPEN · not a fix claim*
