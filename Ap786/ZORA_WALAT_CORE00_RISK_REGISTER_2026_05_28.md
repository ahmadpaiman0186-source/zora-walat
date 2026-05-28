# CORE-00 Risk Register

**Date:** 2026-05-28
**Status:** **OPEN / EXECUTION GATE ONLY**

---

## Risk table

| Risk ID | Risk | Severity | Impact | Mitigation | Status |
|---------|------|----------|--------|------------|--------|
| CORE00-R01 | Provider outage | **High** | Cannot fulfill | Availability gate + circuit breaker | **OPEN** |
| CORE00-R02 | Provider catalog mismatch | **High** | Wrong product / dispute | Drift checks | **OPEN** |
| CORE00-R03 | Duplicate transaction / fulfill | **Critical** | Double delivery | Idempotency + webhook dedupe | **OPEN** |
| CORE00-R04 | Webhook missing / delayed | **High** | Stuck orders | Reconcile + user comms | **OPEN** |
| CORE00-R05 | Payment / order mismatch | **Critical** | Financial harm | State machine + audit | **OPEN** |
| CORE00-R06 | No-pay-no-service violation | **Critical** | Free service / fraud | INV-NPNS-CORE-01 | **OPEN** |
| CORE00-R07 | Failed fulfillment after pay | **High** | Trust loss | Fail-closed + support | **OPEN** |
| CORE00-R08 | Refund / support gap | **Medium** | Complaints | Trust gate + runbook | **OPEN** |
| CORE00-R09 | Premature pilot claim | **Critical** | Reputation | Pilot NO-GO default | **OPEN** |
| CORE00-R10 | Investor misinterpretation | **High** | False readiness | CORE-00 labeling | **OPEN** |
| CORE00-R11 | Distraction to parked tracks | **Medium** | Core delay | Parked boundary | **OPEN** |

---

## Conservative verdict

| Item | Status |
|------|--------|
| All CORE00 risks | **OPEN** |
| Core execution gate executed | **NO** |

---

*CORE-00 risk register — open*
