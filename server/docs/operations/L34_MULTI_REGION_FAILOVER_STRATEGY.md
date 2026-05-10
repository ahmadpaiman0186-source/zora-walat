# L34 — Multi-region and failover strategy

**Gate:** L34 = **operational** planning for region loss, platform outage, and recovery — **not** a claim of active-active global data.  
**Status:** Documentation/spec only — **no infrastructure or failover executed** in this package.

---

## L34 scope

| In scope | Out of scope |
|----------|----------------|
| Strategy, decision matrix, drill **plans**, RPO/RTO evidence | Creating regions, replicas, DNS records, or vendor resources |
| Alignment with [`../L24_MULTI_REGION_FAILOVER.md`](../L24_MULTI_REGION_FAILOVER.md) (L24) | Marketing “active-active” without proven data plane |
| Handoff to L35 IaC | Implementing IaC in this repo |

---

## Current known topology assumptions (honest baseline)

Per **L24** and deployment docs:

- **PostgreSQL:** single primary writer per environment; failover = **promote replica** or **restore backup** — never two live writers on same logical data.
- **Redis / BullMQ:** regional; queue state **not** cross-region magic; job loss possible if Redis volume lost.
- **API + worker:** scale **in-region** sharing one DB + one Redis.
- **Stripe webhooks:** application idempotency (`StripeWebhookEvent`); Dashboard endpoint must point to **one** healthy surface after cutover.
- **Reloadly:** outbound from app region; follow L21 duplicate-send policy.

---

## Target multi-region model options

| Model | Fit | Notes |
|-------|-----|--------|
| **Single-region baseline** | Default early production | Accept regional risk; maximize backup/RPO |
| **Active / passive (warm standby)** | **Recommended** pre–full MR | Standby region: images ready; DB replica; traffic **off** until failover |
| **Warm standby** | Same family as A/P | DB replicated; Redis **separate** in standby — rebuild or restore queue |
| **Active / active (global)** | **Future-only** | Requires proven globally consistent Postgres + Redis (or redesign) — **not** claimed by app repo |

---

## Recommended pre-soft-launch posture

- Document **primary region** + **RPO/RTO** placeholders with Infra.
- Rehearse **restore** on staging (L25) before promising failover time.
- Keep webhook URL and `DATABASE_URL` / `REDIS_URL` **consistent** per environment; no undocumented shadow primaries.

---

## Hard dependencies

| Dependency | Failover implication |
|------------|---------------------|
| **Vercel (or host)** | Redeploy / alternate project in standby; env secrets replicated via vault |
| **Neon / Postgres** | Promotion or restore; then `prisma migrate deploy` + validation |
| **Redis** | Reconnect workers; reconcile DB `QUEUED` vs queue depth |
| **Stripe** | Update webhook endpoint + signing secret coordination |
| **Reloadly** | OAuth from new egress IPs if allowlisted; same credentials policy |

---

## Data consistency model

- **Source of truth:** Postgres for money-path rows.
- **Ledger:** append-only journal — **no** `UPDATE`/`DELETE` “fixes” post-restore (`BACKUP_RESTORE_DRILL.md`).
- **Stripe:** eventual consistency via webhooks + Dashboard reconciliation.

---

## Ledger / audit immutability

- Post-failover validation must confirm **no** duplicate capture and journal integrity — see [`L34_DATA_INTEGRITY_POST_FAILOVER_CHECKLIST.md`](./L34_DATA_INTEGRITY_POST_FAILOVER_CHECKLIST.md).

---

## RPO / RTO targets (draft — Infra owns numbers)

| Metric | Draft placeholder | Binding owner |
|--------|-------------------|---------------|
| **RPO** | e.g. ≤ 5 min (replica) or ≤ 24 h (backup-only) | Infra |
| **RTO** | e.g. 15–60 min rehearsed promote; hours cold restore | Infra |

Record actuals in [`L34_RPO_RTO_EVIDENCE_REQUIREMENTS.md`](./L34_RPO_RTO_EVIDENCE_REQUIREMENTS.md).

---

## L25–L33 dependencies

| Gate | L34 uses |
|------|----------|
| **L25** | Backup/restore credibility, worksheet |
| **L26** | `/ready`, timeouts (PR #4 when merged) |
| **L27** | Webhook behavior, dispute path |
| **L28** | Provider rehearsal |
| **L29** | Alerts during cutover |
| **L30** | Customer comms |
| **L31** | Fraud during chaos |
| **L32** | Kill switches, soft launch freeze |
| **L33** | Load proof before accepting failover traffic |

---

## L35 IaC handoff

- L35 should codify: regions, env per region, secrets references, DNS modules, run order for “standby up.”
- L34 defines **what** must be true; L35 defines **how** it is reproduced.

---

## NO-GO conditions (real failover)

- Unrehearsed **production** cutover without incident commander.
- Two primaries or split-brain Postgres suspected.
- Webhook secret / URL mismatch during cutover.
- No finance + engineering joint sign-off when ledger anomaly risk.

---

## References

- [`L34_FAILOVER_DECISION_MATRIX.md`](./L34_FAILOVER_DECISION_MATRIX.md), [`../runbooks/L34_FAILOVER_OPERATIONAL_DRILL_RUNBOOK.md`](../runbooks/L34_FAILOVER_OPERATIONAL_DRILL_RUNBOOK.md)
- [`../L24_MULTI_REGION_FAILOVER.md`](../L24_MULTI_REGION_FAILOVER.md), [`../runbooks/BACKUP_RESTORE_DRILL.md`](../runbooks/BACKUP_RESTORE_DRILL.md)
