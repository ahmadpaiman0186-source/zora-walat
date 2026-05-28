# CORE-01 Risk Register

**Date:** 2026-05-28
**Parent:** [CORE-01 readiness review](./ZORA_WALAT_CORE01_PROVIDER_CATALOG_RELOADLY_READINESS_REVIEW_2026_05_28.md)
**Default:** All risks **OPEN** unless noted

---

## 1. Risk summary

| ID | Risk | Severity | Likelihood | Mitigation (planned) | Status |
|----|------|----------|------------|----------------------|--------|
| CORE01-R01 | Provider catalog drift | **High** | Medium | Operator map validation + periodic catalog compare | **OPEN** |
| CORE01-R02 | Unsupported operator sold | **High** | Medium | Allowlist + payload build fail-closed | **OPEN** |
| CORE01-R03 | Stale price / margin loss | **High** | Medium | Server-side pricing engine + margin floor | **OPEN** |
| CORE01-R04 | Data package mismatch | **Critical** | High (if enabled prematurely) | Keep checkout disabled until provider SKUs proven | **OPEN** |
| CORE01-R05 | International call ambiguity | **High** | High | Define product boundary before UX/marketing alignment | **OPEN** |
| CORE01-R06 | Provider outage | **High** | Medium | Circuit breaker + user comms + no mock prod fallback | **OPEN** |
| CORE01-R07 | Duplicate fulfillment | **Critical** | Low–Medium | Idempotency + webhook dedupe + inquiry | **OPEN** |
| CORE01-R08 | Payment / order / provider mismatch | **Critical** | Medium | State machine + amount verify + reconciliation | **OPEN** |
| CORE01-R09 | No-pay-no-service violation | **Critical** | Low | Eligibility gates + webhook-first PAID | **OPEN** |
| CORE01-R10 | Premature pilot claim | **High** | Medium | CORE-01 blocker + NO-GO default | **OPEN** |

---

## 2. Risk detail

### CORE01-R01 — Provider catalog drift

Mock client catalog, server SKUs, and live Reloadly operators can diverge. Users may see products that cannot be fulfilled or are mispriced.

### CORE01-R02 — Unsupported operator

Operator key present in UI but missing from Reloadly map causes fulfillment failure after payment.

### CORE01-R03 — Stale price

Wholesale bps estimates may not match Reloadly quotes; margin floor may reject checkout unexpectedly or allow thin margins.

### CORE01-R04 — Data package mismatch

Enabling data UI without provider-backed SKUs risks paid orders with no fulfillment path.

### CORE01-R05 — International call ambiguity

Multiple mock representations (minutes bundle vs weekly vs marketing "calling") create investor and user misinterpretation.

### CORE01-R06 — Provider outage

Reloadly downtime during paid fulfillment window increases stuck orders and support load.

### CORE01-R07 — Duplicate fulfillment

Webhook retry + fulfillment retry without idempotency could double-charge provider and double-credit recipient.

### CORE01-R08 — Payment / order / provider mismatch

Stripe amount, order record, and provider POST amount must align — mismatch is financial incident.

### CORE01-R09 — No-pay-no-service violation

Any path that dispatches provider on unpaid or unverified state is critical safety failure.

### CORE01-R10 — Premature pilot claim

Announcing top-up or provider readiness without CORE1-EV-* evidence damages trust and violates Super-System policy.

---

## 3. Risk acceptance

**No risks accepted in CORE-01.** Pilot and production remain **NO-GO**.

---

*CORE-01 risk register — read-only review basis*
