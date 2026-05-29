# L34 — RPO/RTO evidence requirements

**Purpose:** What operators must **record** to claim a rehearsed recovery posture. Numbers are **organization-defined** — this doc defines **evidence shape**.

---

## Definitions

- **RPO (Recovery Point Objective):** Maximum acceptable **data loss window** (e.g. replication lag bound or last backup time).
- **RTO (Recovery Time Objective):** Wall-clock from **decision** to **validated service** (e.g. `/ready` green + smoke transaction in test mode).

---

## Evidence required — DB restore

| Artifact | Notes |
|----------|--------|
| Backup id / snapshot timestamp | From Neon/provider console |
| Restore start/end UTC | |
| `prisma migrate deploy` result | Forward-only |
| Connection string **name** only in ticket | Never paste URL with password in git |
| Post-restore read-only recon summary | Link to secure store |

---

## Evidence required — app recovery

| Artifact | Notes |
|----------|--------|
| Deploy revision / image digest | API + worker match |
| Env version ids (not values) | Vercel deployment ids |
| `/health` + authenticated `/ready` | Redacted JSON |

---

## Evidence required — queue / Redis recovery

| Artifact | Notes |
|----------|--------|
| Queue depth vs DB `QUEUED` comparison | Before/after |
| Worker restart time | |
| DLQ count snapshot | If applicable |

---

## Evidence required — Stripe / webhook recovery

| Artifact | Notes |
|----------|--------|
| Webhook endpoint id + version | Dashboard |
| Delivery success rate post-cutover | Aggregate |
| Signing secret rotation ticket | Dual approver names |

---

## Evidence required — provider recovery

| Artifact | Notes |
|----------|--------|
| Provider incident id | |
| Outbound restored timestamp | |
| Sample fulfillment success (sandbox/staging) | Redacted |

---

## Evidence required — ledger / reconciliation integrity

| Artifact | Notes |
|----------|--------|
| Checklist export from [`L34_DATA_INTEGRITY_POST_FAILOVER_CHECKLIST.md`](./L34_DATA_INTEGRITY_POST_FAILOVER_CHECKLIST.md) | |
| Finance sign-off for anomalies | |

---

## Acceptable redaction

- Strip PII, full Stripe ids (suffix ok), secrets, connection passwords.

---

## Failed-drill evidence rules

- Store **what failed**, **why**, **remediation ticket** — still valuable.
- Do not delete raw logs with compliance retention policy.

---

## Closure criteria

- RPO/RTO **actuals** ≤ targets **or** documented gap + compensating control + dated re-drill.
- Integrity checklist: no open P0 items.

---

## References

- [`../runbooks/BACKUP_RESTORE_DRILL.md`](../runbooks/BACKUP_RESTORE_DRILL.md), [`../L25_BACKUP_RESTORE_READINESS.md`](../L25_BACKUP_RESTORE_READINESS.md)
