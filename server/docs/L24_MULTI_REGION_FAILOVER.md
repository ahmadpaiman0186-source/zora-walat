# L24 — Multi-region readiness & failover (honest assessment)

**This document does not claim global active-active production** for PostgreSQL, Redis, or BullMQ. Those components are **typically single-primary per environment** unless your platform team deploys **explicit** multi-region databases and replicated Redis (not part of the application repo).

## What the codebase actually assumes

| Component | Multi-region “active-active”? | Notes |
|-----------|------------------------------|--------|
| **PostgreSQL** | **No** by default | Single writer; `pg_advisory_xact_lock` and idempotent rows assume **one authoritative DB** at a time. **Failover = promote a replica or restore backup** — not two live writers. |
| **Redis / BullMQ** | **No** by default | Queue state is **not** magically cross-region. Losing Redis without backup can **lose in-flight queue jobs**; DB truth + reconciliation + DLQ trails remain for recovery. |
| **API + worker** | **Scale out in-region** (L23) | Separate processes; horizontal pods **in the same region** sharing one DB + one Redis. |
| **Stripe webhooks** | **Idempotent at application layer** | `StripeWebhookEvent` + ledger idempotency; Stripe **retries** events — designed for safe replay. **DR:** update webhook endpoint URL in Stripe Dashboard to the healthy region when cutting over. |
| **Provider (Reloadly)** | **Idempotent + L21 policy** | No second live top-up on ambiguous/pending; see `L21_PROVIDER_FALLBACK.md`. |

## Recommended production model (until global data plane exists)

**Active-primary region + warm-standby region (not data active-active).**

1. **Primary region** runs production **API**, **workers**, **Postgres** (primary), **Redis** (queue + shared rate limits + optional metrics aggregation).
2. **Standby region** keeps **replicated Postgres** (logical/physical per your cloud) and, if desired, **idle or scaled-to-zero** API/worker images ready to start; **Redis in standby** is a **separate** instance — **not** a split-brain pair with primary Redis without vendor clustering.
3. **Failover:** traffic switch (DNS / load balancer) **after** database availability is restored in the target region (promotion or restore). **Do not** run two primary Postgres instances against the same logical dataset.

## PostgreSQL — failover strategy (operator-defined)

- **RPO (recovery point objective):** bound by **replication lag** or **backup frequency** (e.g. **≤ 5 min** with streaming replica; **≤ 24 h** with daily backups only — **your** Infra team sets the number).
- **RTO (recovery time objective):** time to **promote replica** or **restore** + run migrations + validate `DATABASE_URL` + app restart (e.g. **15–60 min** for rehearsed promotion; **hours** for cold restore — **your** runbook).
- **Rollback / failback:** re-point `DATABASE_URL` (or connection pooler) to the old primary only after **split-brain risk** is ruled out; use the same **migration** discipline (forward-only in production).

## Redis / BullMQ — failover risk

- **In-flight jobs** may be **lost** if the Redis data volume is not recoverable; **BullMQ** will not recreate arbitrary HTTP work.
- **Mitigation:** Postgres remains source of truth for paid orders; **reconciliation**, **self-healing**, and **DLQ** visibility (`phase1FulfillmentDlqService`) support operator replay — **not** automatic duplicate sends.
- **Cross-region Redis replication** for queues is **non-standard**; treat queue state as **regional**.

## Stripe — webhook delivery during region outage

- Stripe retries failed webhook deliveries for a period; events remain **replayable**.
- After DNS cutover, ensure **one** active endpoint receives events; **duplicate delivery** of the same `evt_*` remains **idempotent** in this codebase.
- **Webhook signing secret** must match the endpoint configuration after rotation.

## Workers — restart / region migration without duplicate fulfillment

- Fulfillment uses **DB locks**, **single-flight claims**, and **attempt rows** (`fulfillmentProcessingService.js`, L23 advisory lock).
- Starting workers in a new region against the **same** promoted Postgres does **not** bypass idempotency — **provided** Redis queue is either **rebuilt** (jobs re-enqueued from DB) or workers drain from a **restored** Redis; validate queue depth vs DB `QUEUED` rows after failover.

## Provider outbound — no duplicate top-up on failover

- Follow **L21**: ambiguous/pending outcomes do **not** chain to mock or alternate provider blindly.
- After region failover, **provider correlation IDs** (`providerExecutionCorrelation`) remain tied to **attempt rows** — do not manually “replay” provider POSTs without admin tooling.

## DNS / traffic routing

- Use **health-checked** load balancing or DNS failover (e.g. primary LB → standby) **after** backend readiness (`GET /ready` semantics — adjust for `PRELAUNCH_LOCKDOWN` token rules).
- Clients must tolerate **brief** DNS TTL switches.

## Safe rollback / failback runbook (outline)

1. **Freeze** writes at old region if split-brain suspected (maintenance mode / edge deny).
2. **Verify** single Postgres primary; **reconcile** money-path rows (`reconciliation` scripts / admin views).
3. **Re-point** Stripe webhook URL and app `DATABASE_URL` / `REDIS_URL` consistently.
4. **Drain** queues or **reconcile** orphaned `PROCESSING` rows using existing ops flows (`PHASE1_INCIDENT_PLAYBOOK.md`, self-healing reports).
5. **Metrics:** confirm **cluster** counters if using Redis aggregation (`METRICS_REDIS_AGGREGATION`).

## Related documents

- `SCALING_AND_RESILIENCE.md` — not multi-region sharded by default.
- `L23_AUTO_SCALING.md` — API/worker split, Redis requirements.
- `L21_PROVIDER_FALLBACK.md` — provider safety.
- `PHASE1_INCIDENT_PLAYBOOK.md` — duplicate webhook, stuck paid.
- `DEPLOYMENT_READINESS.md` — infra checklist.

---

## Explicit warning

**Do not market “multi-region active-active”** for this stack until **you** operate **globally consistent** Postgres + Redis (or equivalent) with proven RPO/RTO tests. Until then, document **primary + standby** and rehearse failover twice yearly.

*No live infrastructure was deployed or modified for this document.*
