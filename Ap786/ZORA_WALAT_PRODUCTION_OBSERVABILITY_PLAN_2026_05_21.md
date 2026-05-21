# Zora-Walat — Production Observability Plan

**Date:** 2026-05-21  
**Status:** **PLAN ONLY** — **NOT PROVEN YET** in production  
**Audience:** SRE, CTO, incident command, security  
**Policy:** Super-System **detect/report**; self-healing **apply** gated (G-10)

---

## 1. Executive summary

Zora-Walat has **CI-static detection** (Super-System Guard, zw-doctor) and **health/ready** endpoints. **Production APM, paging, and money-path anomaly dashboards are not proven** in this repository.

This document defines **required** observability before real-money market readiness. Implementation requires a **separate approved** ops project — not autonomous agent execution.

---

## 2. Monitoring coverage matrix

| Signal | What to monitor | Tooling (proposed) | Alert severity | Status |
|--------|-----------------|-------------------|----------------|--------|
| **Frontend uptime** | Next.js origin 200; `/` and return routes reachable | Synthetic check (Vercel/deployment URL) | SEV2 | **NOT PROVEN YET** |
| **Backend health** | `GET /api/health`, `/ready` 200 | Synthetic + Vercel function metrics | SEV1 if down | **PARTIAL** (endpoints exist) |
| **API latency** | p95/p99 per route; top-up create, topup-orders | APM / Vercel analytics | SEV2 breach SLO | **NOT PROVEN YET** |
| **API error rate** | 5xx ratio; 4xx spikes on checkout | APM + log metrics | SEV2 | **NOT PROVEN YET** |
| **Stripe webhook failures** | 5xx on webhook handlers; signature errors | Stripe Dashboard + app logs | SEV1 money | **NOT PROVEN YET** |
| **Duplicate transaction anomaly** | Duplicate PAID events; fulfillment count > 1 | DB metrics + `DUPLICATE_PAYMENT_WEBHOOK` incident | SEV1 money | **PARTIAL** (design + L-4/L-5) |
| **No-pay-no-service violation** | Fulfillment attempts without PAID | Gate denials + `UNPAID_FULFILLMENT_ATTEMPT` | SEV1 money | **PARTIAL** (code + tests) |
| **Failed fulfillment** | Stuck non-terminal fulfillment; SLA breach | Queue metrics + operator enums | SEV2 | **NOT PROVEN YET** |
| **Refund anomaly** | Double refund; REFUNDED drift | L-11 mirror + L-13 watch | SEV1 money | **PARTIAL** (L-11 only) |
| **Abuse spike** | `abuse_blocked_spike` from `webtopIncidentSignals` | In-process → export to APM | SEV3 | **PARTIAL** (code signal) |

---

## 3. Incident severity levels

| Level | Definition | Response | Auto-action |
|-------|------------|----------|-------------|
| **SEV1** | Money-path integrity risk (unpaid fulfill, duplicate PAID, webhook down) | Incident commander + stop deploy | **Detect/alert only** — no auto refund/payment |
| **SEV2** | Customer-visible degradation (API slow, frontend down) | On-call engineer | Fail-closed; no env auto-switch |
| **SEV3** | Elevated abuse blocks; non-terminal noise | Review within business hours | Rate-limit already in app |
| **SEV4** | CI/Guard failure on `main` | Fix before merge | CI blocks merge |

---

## 4. Alerting and escalation

| Step | Action |
|------|--------|
| 1 | Alert routes to on-call rotation (define in ops runbook — **not in repo**) |
| 2 | Triage with `zw-doctor incidents` (read-only) |
| 3 | Capture enum-only evidence in Ap786 |
| 4 | Escalate to payment safety owner for SEV1 money |
| 5 | Gated ops only per `GATED_OPERATIONS_REQUIRED_AFTER_GLOBAL_AUDIT.md` |

**No** automatic webhook resend, refund, DB fix, or `ZW_SELF_HEALING_APPLY` from alerts.

---

## 5. Rollback procedure (manual)

| Trigger | Rollback | Verify |
|---------|----------|--------|
| Bad API deploy | Vercel rollback to prior deployment ID | health/ready 200; zw-doctor strict |
| Bad frontend deploy | Vercel rollback Next deployment | `/` 200; no config regression |
| Schema incident | **Gated** — Prisma migrate rollback per G-07 | Staging first |

**Automatic Vercel rollback:** **NOT PROVEN YET** — manual only.

---

## 6. Self-healing and Super-System alignment

| Level | Production policy |
|-------|-------------------|
| 0–1 | Detect + alert (required baseline) |
| 2 | Contain via feature flags / traffic shed — **human approval** |
| 3+ | **Forbidden** for money/credentials/DB without G-10 |

Existing: `selfHealingRunner.js` with `selfHealingApplyRepairs` default **false**; intelligence emits `SELF_HEALING_APPLY_ALLOWED false`.

---

## 7. Frontend-specific observability

| Check | Purpose |
|-------|---------|
| Synthetic `/`, `/success`, `/cancel` | Uptime + no 504 regression |
| RUM (optional) | Core Web Vitals on top-up |
| Client error boundary (if added later) | JS crash rate — **not in scope this doc** |

Correlate with **investor-hard screenshots** only for release gates — not a substitute for APM.

---

## 8. Evidence and review cadence

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Review Guard green on `main` | Per merge | Engineering |
| zw-doctor strict on release candidate | Pre-deploy | SRE |
| Money-path truth-check | Weekly staging | Operator |
| Update this plan | When tooling chosen | SRE |

---

## 9. Non-claims

- This plan does **not** prove production observability is live.  
- Does **not** certify production-ready or real-money ready.  
- Does **not** authorize autonomous repair.

---

*Plan only · main @ `fa88b0b` · implement under separate approval*
