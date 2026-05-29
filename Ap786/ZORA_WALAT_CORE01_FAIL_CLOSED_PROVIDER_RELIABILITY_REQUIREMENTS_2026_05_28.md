# CORE-01 Fail-Closed Provider Reliability Requirements

**Date:** 2026-05-28
**Aligns with:** [CORE-00 provider gate](./ZORA_WALAT_CORE00_PROVIDER_RELIABILITY_AND_FAIL_CLOSED_GATE_2026_05_28.md)
**Parent:** [CORE-01 readiness review](./ZORA_WALAT_CORE01_PROVIDER_CATALOG_RELOADLY_READINESS_REVIEW_2026_05_28.md)

---

## 1. Provider unavailable behavior

| Requirement | Expected | Repo hooks | Proven? |
|-------------|----------|------------|---------|
| Do not mark order FULFILLED without provider success signal | Fail closed | Outcome registry, state machine | **NO** |
| Surface user-visible pending/failed state | Yes | Order status UX | **PARTIAL** |
| Do not auto-switch to mock in production | Kill switch / env guard | `RELOADLY_ALLOW_UNAVAILABLE_MOCK_FALLBACK`, production guard | **NOT PROVEN in prod** |

---

## 2. Provider timeout behavior

| Requirement | Expected | Repo hooks | Proven? |
|-------------|----------|------------|---------|
| Bounded HTTP timeout | Fail with classified error | `AIRTIME_PROVIDER_TIMEOUT_MS` env name | **NO** |
| Order remains reconcilable | Stuck detection | `RECONCILE_*` env names, reconciliation engine | **PARTIAL** |
| No infinite retry loop | Max attempts + backoff | Auto-retry worker/policy modules | **NOT PROVEN** |

---

## 3. Stale catalog behavior

| Requirement | Expected |
|-------------|----------|
| Operator ID no longer valid at provider | Reject fulfillment; do not charge user without service OR trigger refund/manual review |
| SKU removed from provider catalog | Checkout should fail at session create or fulfillment — **prefer fail at catalog refresh** |
| Drift between mock UI and server catalog | Block checkout or hide SKU |

**Live drift detection NOT PROVEN in CORE-01.**

---

## 4. Unsupported operator behavior

| Requirement | Expected |
|-------------|----------|
| Operator not in Reloadly map | Payload build failure (`reloadly_webtopup_*` codes) |
| Operator not in checkout allowlist | Server rejection at checkout |
| User selects unsupported combo | Clear error — no payment session |

---

## 5. Duplicate request prevention

| Layer | Mechanism observed |
|-------|-------------------|
| Stripe webhook | Idempotent handlers (referenced in tests/docs) |
| Fulfillment dispatch | `FulfillmentAttempt`, eligibility checks |
| Reloadly POST | In-flight guard, idempotency registry, custom identifier |
| Client double-submit | Rate limits / velocity (partial) |

**End-to-end duplicate prevention NOT PROVEN without sandbox replay evidence.**

---

## 6. Retry boundary

| Rule | Policy |
|------|--------|
| Retry only when classified as transient | Use `classifyProviderError` semantics |
| Inquiry before blind re-POST | `reloadlyTransactionInquiry` — env can disable |
| Max retry count | Worker policy modules — exact prod values **NOT VERIFIED** |
| No retry after terminal failure | State machine guard |

---

## 7. Circuit breaker requirement

| Requirement | Expected |
|-------------|----------|
| Open circuit on sustained failures | `reloadlyProviderCircuitBreaker.js`, durable circuit variant |
| Fail fast while open | No provider hammering |
| Half-open probe | Controlled recovery |
| Observability | Ops metrics signals referenced |

**Production circuit behavior NOT PROVEN.**

---

## 8. Manual review requirement

| Scenario | Action |
|----------|--------|
| Paid + provider outcome unknown | Hold order; manual review queue (placeholder) |
| Paid + provider failed | Refund or manual fulfill decision — **placeholder** |
| Provider success + DB write fail | Reconciliation alert; manual repair |

---

## 9. No auto-fulfillment without paid / verified state

| Invariant | Enforcement observed |
|-----------|---------------------|
| No-pay-no-service | Fulfillment eligibility, Phase 1 product gate |
| Webhook confirms payment before QUEUED | Webhook handlers + state machine |
| Kill switch | `FULFILLMENT_DISPATCH_KILL_SWITCH` env name |

**Invariant documented in CORE-00; production proof remains OPEN (STRIPE-WH blockers).**

---

## 10. No provider execution claim

CORE-01 documents requirements only. **No live provider calls were made.** Reliability mechanisms exist in code but are **NOT production-certified**.

---

*CORE-01 fail-closed requirements — spec/evidence only*
