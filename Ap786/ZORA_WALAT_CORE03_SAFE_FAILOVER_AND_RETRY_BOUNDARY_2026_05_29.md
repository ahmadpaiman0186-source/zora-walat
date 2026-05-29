# CORE-03 Safe Failover And Retry Boundary

**Date:** 2026-05-29  
**Status:** **BOUNDARY SPEC — NOT VERIFIED under load**

---

## 1. Failover principles

| # | Principle |
|---|-----------|
| 1 | **Fail closed** — prefer pending/failed over false success |
| 2 | **Failover is not silent mock** in production without DR |
| 3 | **Retries are bounded** — no unbounded provider POST loops |
| 4 | **Inquiry before retry** when outcome unknown (Reloadly policy env) |
| 5 | **Circuit breaker** may open — checkout/fulfill must degrade safely |

---

## 2. Stripe layer

| Event | Retry actor | Boundary |
|-------|-------------|----------|
| Webhook delivery | Stripe | Handler idempotent; fast ack policy (program) |
| API call | `orchestrateStripeCall` | Network retry capped; no double capture |

**Failover:** None to alternate PSP in CORE-03 scope — **NOT PLANNED**.

---

## 3. Provider layer (Reloadly / mock)

| Condition | Allowed action | Forbidden |
|-----------|----------------|-----------|
| Reloadly 5xx / timeout | Bounded retry after inquiry (if enabled) | Immediate second POST without key |
| Reloadly circuit open | Block new fulfills; queue manual | Mock fallback in prod without DR |
| Reloadly auth fail | Terminal; no retry storm | Rotate creds in logs |
| Outbound disabled | UNAVAILABLE or explicit mock fallback env | Hidden success |
| Mock primary (`AIRTIME_PROVIDER=mock`) | Dev/test only | Production launch |

Source: `deliveryAdapter.js`, `reloadlyClient.js`, circuit env names.

---

## 4. Queue / worker failover

| Component | Failover |
|-----------|----------|
| BullMQ worker down | Jobs remain queued; API still accepts paid — **stale PROCESSING** risk (FM-07) |
| API worker down | No webhook processing — Stripe retries |
| Redis down | Rate limits / shadow ack degrade; DB idempotency remains |

**Multi-region failover: NOT IN SCOPE.**

---

## 5. Retry budget table (planning)

| Layer | Max attempts | Backoff | Idempotency |
|-------|--------------|---------|-------------|
| Stripe webhook handler | Stripe-controlled | N/A | event.id |
| Stripe API read | Orchestrator policy | Yes | N/A |
| Provider POST | `FULFILLMENT_JOB_MAX_ATTEMPTS` (env) | Job backoff ms | attempt id |
| Processing recovery | `PROCESSING_RECOVERY_MAX_ATTEMPTS` | Poll interval | order-scoped |
| Admin incident retry | Manual | Per runbook | `incident_retry:*` keys |

---

## 6. Operator-safe boundary

| Action | Requires |
|--------|----------|
| Force re-fulfill | Admin secret + reason + DR |
| Sandbox drill | CORE02-DR phrase |
| Disable corridor | Feature flag / env + audit |

---

## 7. NO-GO

| Claim | Status |
|-------|--------|
| Failover **tested** | **NOT VERIFIED** |
| Boundaries **defined** | **YES** |

---

*End of failover boundary.*
