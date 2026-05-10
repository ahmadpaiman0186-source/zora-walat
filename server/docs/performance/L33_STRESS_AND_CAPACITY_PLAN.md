# L33 — Stress and capacity plan

**Purpose:** Hypotheses and **what to prove** in staging before trusting soft-launch traffic levels. **No execution** in this document.

---

## Capacity assumptions (initial — replace with measurements)

| Component | Assumption | Risk if wrong |
|-----------|------------|---------------|
| API (serverless) | Concurrency limit per region | 503 under burst |
| Postgres (Neon) | Connection limit / pool size | Prisma P1001, timeouts |
| Redis | Single shard throughput | Rate limit + queue stalls |
| Worker | BullMQ concurrency cap | Growing `QUEUED` rows |
| Stripe | Webhook + API rate | Throttling, retries |
| Reloadly | Sandbox TPS ceiling | Provider errors |

---

## Bottleneck hypotheses

1. **DB pool exhaustion** under concurrent webhooks + checkout reads.
2. **Redis** as limiter + queue backend — hot key contention.
3. **Serverless cold start** inflating p99 on sparse traffic.
4. **Webhook handler** duration → ACK latency (L27 / SLO concern).
5. **Provider HTTP** latency >> app latency.

---

## Serverless concurrency risks

- Vercel/plan limits: concurrent executions cap throughput; **prove** with staged RPS, not guess.
- **Function timeout** must exceed p99 handler time + headroom — see platform docs.

---

## DB pool / Prisma risks

- `connection_limit` in `DATABASE_URL` vs instance count × concurrency.
- Long transactions in reconciliation — run **off-peak** or throttled in stress.

---

## Redis / queue risks

- Queue depth grows if worker < producer; **stop** test if depth unbounded.
- Redis persistence: ephemeral loss acceptable only if recon plan exists.

---

## Webhook ACK budget

- Target p95 ACK < 2s (align with L29/L32 when merged) — measure in **staging** with signed test events.
- Stripe retries on timeout — avoid **timeout** spikes.

---

## Provider timeout budget

- Reloadly client timeouts must align with serverless ceiling; mock path proves app logic only.

---

## Degradation expectations

- Under overload: **429** on limited routes preferred over **500**.
- Queue degradation: `queue_unavailable` path must not double-pay (see L19).

---

## Scaling decision points

| Signal | Action |
|--------|--------|
| DB CPU > 80% sustained | Reduce test RPS; scale DB tier |
| Redis memory high | Eviction policy review |
| Worker lag | Increase concurrency **with** finance approval |

---

## Capacity evidence required before soft launch

- Staging run: `load:sim:prod-readiness` (or equivalent) **green** with documented RPS.
- Optional: `phase1:money-path-load` on staging-shaped DB.
- Graphs: latency, error rate, pool metrics, queue depth — archived per [`L33_METRICS_THRESHOLDS_AND_EVIDENCE.md`](./L33_METRICS_THRESHOLDS_AND_EVIDENCE.md).

---

## What must be proven before soft launch (L32 handoff)

- Read path stable at **planned** cohort concurrency.
- Money path **no duplicate capture** under concurrent webhook simulation (integration proof + bounded staging).
- Rollback/kill-switch owners named (`L32` rollback doc when available on branch).

---

## References

- [`../L20_LOAD_VERIFICATION.md`](../L20_LOAD_VERIFICATION.md), [`../SCALING_AND_RESILIENCE.md`](../SCALING_AND_RESILIENCE.md), [`../SLO.md`](../runbooks/SLO.md)
