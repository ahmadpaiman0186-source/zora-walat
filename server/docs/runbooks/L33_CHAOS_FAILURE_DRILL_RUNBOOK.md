# L33 — Chaos and failure drill runbook (plan-only)

**Audience:** SRE / principal engineers.  
**Hard rule:** Execute **only** in **local**, **CI**, or **approved staging** — never production injection.

---

## Drill template fields

Each section: **Preconditions** | **Safe environment** | **Forbidden environment** | **Injection method (plan)** | **Expected behavior** | **Observability** | **Abort** | **Rollback/cleanup** | **Evidence** | **Owner**

---

### 1. DB unavailable

| Field | Content |
|-------|---------|
| Preconditions | Staging DB snapshot; no prod URL |
| Safe environment | Local Docker DB **stop**; or staging failover drill window |
| Forbidden | Production Neon pause without executive incident |
| Injection | Stop container / block security group **staging only** |
| Expected | 503 `/ready`; no partial commits visible; webhooks retry per Stripe (test) |
| Observability | Prisma errors, `readinessReason` |
| Abort | Any prod routing mistake |
| Cleanup | Start DB; verify migrations |
| Evidence | Timestamp, env name, log excerpt |
| Owner | DBA + Eng |

---

### 2. Redis unavailable

| Field | Content |
|-------|---------|
| Preconditions | Queue/limiter impact understood |
| Safe | Staging Redis stop or `REDIS_URL` invalid **on staging** |
| Forbidden | Prod Redis flush |
| Injection | Stop Redis container / wrong URL in **isolated** deploy |
| Expected | `queue_unavailable` degrade; API may partial-serve per design |
| Observability | `redis_unavailable`, enqueue failures |
| Abort | Money-path duplicate risk observed |
| Cleanup | Restore Redis; drain backlog |
| Evidence | Queue depth before/after |
| Owner | Eng |

---

### 3. Stripe webhook transient failure

| Field | Content |
|-------|---------|
| Preconditions | Integration harness or Stripe test endpoint |
| Safe | CI `stripeWebhookHttpChaos.integration.test.js` |
| Forbidden | Dropping prod deliveries |
| Injection | HTTP 503 injection in test middleware |
| Expected | Retry succeeds; idempotency holds |
| Observability | Stripe Dashboard test deliveries |
| Abort | Duplicate ledger mutation |
| Cleanup | N/A test env |
| Evidence | Test report |
| Owner | Eng |

---

### 4. Provider / Reloadly timeout

| Field | Content |
|-------|---------|
| Preconditions | Mock or sandbox |
| Safe | `AIRTIME_PROVIDER=mock` or sandbox latency injection |
| Forbidden | Live prod Reloadly hammer |
| Injection | toxiproxy / mock delay |
| Expected | Fulfillment retry or terminal fail; no double send |
| Observability | Fulfillment logs, circuit |
| Abort | Real money unintended |
| Cleanup | Remove proxy |
| Evidence | Latency settings |
| Owner | L28 owner |

---

### 5. Queue backlog

| Field | Content |
|-------|---------|
| Preconditions | Worker concurrency known |
| Safe | Staging: pause worker; resume |
| Forbidden | Prod worker kill without incident |
| Injection | Stop worker process |
| Expected | Depth grows; SLA signals if enabled |
| Observability | Bull Board / metrics |
| Abort | Depth > agreed cap |
| Cleanup | Start worker; verify drain |
| Evidence | Depth graph |
| Owner | Eng |

---

### 6. Vercel / serverless timeout

| Field | Content |
|-------|---------|
| Preconditions | Staging on same platform or load test timeout path |
| Safe | Synthetic slow handler **in staging branch only** — **requires authorized code change**; default: **plan-only** |
| Forbidden | Prod slow injection |
| Injection | Planned future: feature-flagged delay — **not** in this docs package |
| Expected | 504 platform; Stripe may retry |
| Observability | Platform logs |
| Abort | Customer impact |
| Cleanup | Remove delay |
| Evidence | Request id |
| Owner | Eng |

---

### 7. Duplicate webhook event

| Field | Content |
|-------|---------|
| Preconditions | CI chaos env |
| Safe | `registerChaosWebhookEnv` + signed replay |
| Forbidden | Replay to prod |
| Injection | Integration test |
| Expected | Idempotent noop / duplicate ignored |
| Observability | `webhook_duplicate_ignored` |
| Abort | Second capture |
| Cleanup | N/A |
| Evidence | L19 chaos report |
| Owner | Eng |

---

### 8. Partial fulfillment failure

| Field | Content |
|-------|---------|
| Preconditions | Mock provider |
| Safe | Integration resilience tests |
| Forbidden | Forced prod failure |
| Injection | Mock returns transient then success |
| Expected | Single terminal outcome; ledger consistent |
| Observability | Attempt history |
| Abort | Duplicate provider send |
| Cleanup | Reset mock |
| Evidence | Test logs |
| Owner | Eng |

---

### 9. Reconciliation drift

| Field | Content |
|-------|---------|
| Preconditions | Synthetic inconsistent row **in staging DB only** |
| Safe | `moneyPathReconInconsistent.integration.test.js` patterns |
| Forbidden | Manual prod row corruption |
| Injection | Test fixture |
| Expected | Recon flags; no silent fix |
| Observability | Recon metrics |
| Abort | Scope bleeds to prod data |
| Cleanup | Truncate test rows |
| Evidence | Test output |
| Owner | Eng + Finance observer |

---

### 10. Rate-limit surge

| Field | Content |
|-------|---------|
| Preconditions | Staging only |
| Safe | Scripted 429 boundary |
| Forbidden | DDoS prod |
| Injection | k6/hey against **staging** auth |
| Expected | 429 dominates; no OOM |
| Observability | Rate limit metrics |
| Abort | Collateral on shared NAT |
| Cleanup | Stop script |
| Evidence | RPS vs 429 curve |
| Owner | Security + Eng |

---

## References

- [`../L19_CHAOS_VERIFICATION.md`](../L19_CHAOS_VERIFICATION.md), [`../performance/L33_LOAD_STRESS_CHAOS_TEST_PLAN.md`](../performance/L33_LOAD_STRESS_CHAOS_TEST_PLAN.md)
