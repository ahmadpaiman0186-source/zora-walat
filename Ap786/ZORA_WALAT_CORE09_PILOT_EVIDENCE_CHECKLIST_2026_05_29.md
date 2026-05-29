# CORE-09 Pilot Evidence Checklist

**Date:** 2026-05-29  
**Status:** All items **PENDING** — pilot **NOT EXECUTED**

---

## Acceptance rules

| Verdict per row | Meaning |
|-----------------|---------|
| **PENDING** | Not filed |
| **PASS** | Evidence ACCEPTED by program lead |
| **FAIL** | Blocks pilot |
| **N/A** | Not required for current phase |

Pilot gate **COMPLETE** only when all required rows are **PASS** and DR signed.

---

## A. Super-System tracks

| ID | Evidence | Required | Status |
|----|----------|----------|--------|
| CORE9-EV-CORE4 | CORE-04 runtime doctor local test output + doc | Yes | **PENDING** |
| CORE9-EV-CORE5 | CORE-05 idempotency kernel local test output | Yes | **PENDING** |
| CORE9-EV-CORE6 | CORE-06 NPNS local test output | Yes | **PENDING** |
| CORE9-EV-CORE7 | CORE-07 sandbox drill CORE7-EV-* (if drill executed) | Conditional | **PENDING / N/A** |
| CORE9-EV-CORE8 | CORE-08 dry-run test output; apply disabled attestation | Yes | **PENDING** |

---

## B. Money path

| ID | Evidence | Status |
|----|----------|--------|
| CORE9-EV-PAY | Payment path proof (test/staging) | **PENDING** |
| CORE9-EV-WH | Webhook signature + idempotency | **PENDING** |
| CORE9-EV-CHK | Checkout happy / decline / cancel | **PENDING** |
| CORE9-EV-NPNS | NPNS negative path proof | **PENDING** |

---

## C. Provider

| ID | Evidence | Status |
|----|----------|--------|
| CORE9-EV-PROV | Provider catalog + corridor proof | **PENDING** |
| CORE9-EV-SBX | Sandbox vs live boundary confirmation | **PENDING** |

---

## D. Operations

| ID | Evidence | Status |
|----|----------|--------|
| CORE9-EV-OBS | Observability (logs, alerts, dashboards) | **PENDING** |
| CORE9-EV-SUP | Support readiness checklist | **PENDING** |
| CORE9-EV-IR | Incident response plan acknowledged | **PENDING** |
| CORE9-EV-ROLL | Rollback / abort plan | **PENDING** |

---

## E. Governance

| ID | Evidence | Status |
|----|----------|--------|
| CORE9-EV-APPROVAL-001 | Phrase `APPROVE CORE-09 CONTROLLED PILOT GATE ONLY` captured | **PENDING** |
| CORE9-EV-STAKE | Stakeholder sign-off | **PENDING** |
| CORE9-EV-LIMITS | Exposure limits counters configured | **PENDING** |
| CORE9-EV-VERDICT | Final conservative verdict doc signed | **PENDING** |

---

## F. Post-pilot (do not pre-fill)

| ID | Evidence | Status |
|----|----------|--------|
| CORE9-EV-EXIT | Exit criteria evaluation | **PENDING** |
| CORE9-EV-INCIDENT-LOG | Incident log (empty until pilot) | **PENDING** |

---

## Conservative summary

| Metric | Value |
|--------|-------|
| Required PASS count | **0 / N** |
| Controlled pilot approved | **NO** |
| Controlled pilot executed | **NO** |

---

*End of checklist.*
