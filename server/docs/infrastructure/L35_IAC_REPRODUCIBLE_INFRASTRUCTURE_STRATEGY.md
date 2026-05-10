# L35 — IaC and reproducible infrastructure strategy

**Gate:** L35 = **documented** reproducibility of environments — not necessarily full Terraform on day one.  
**Status:** Specification only — **no infrastructure created or mutated** in this package.

---

## L35 scope

| In scope | Out of scope |
|----------|----------------|
| Strategy, ADR, inventory schema, dry-run runbooks | `terraform apply`, Pulumi up, Vercel project creation in this task |
| Secret **names** and ownership | Secret **values** in git |
| Drift detection **process** | Live drift scans against production without approval |

---

## Current non-IaC posture (typical)

- **Vercel:** two-project model described in root `README.md` (frontend root vs `server/` API) — **console-driven** env and linking.
- **Neon/Postgres + Redis:** provisioned via vendor dashboards; connection strings in Vercel env.
- **Stripe / Reloadly:** external dashboards; webhook URL points at API host.
- **DNS:** registrar / Vercel domains — manual or vendor UI.

---

## Recommended target posture

1. **Short term (pre-soft launch):** **Vendor-native + runbooks** — every resource has an **owner**, **checklist**, and **evidence folder** (`L35_PROVISIONING_RUNBOOK_DRY_RUN.md`).
2. **Medium term:** **Hybrid** — Terraform or Pulumi for **DNS**, **supporting** cloud IAM, **not** necessarily full Vercel API coverage if immature.
3. **Long term:** **IaC-first** for all durable infra + **automated** drift detection (`L35_DRIFT_DETECTION_AND_RECONCILIATION.md`).

---

## IaC tool options (summary)

See [`L35_IAC_TOOLING_ADR.md`](./L35_IAC_TOOLING_ADR.md): Terraform, Pulumi, vendor-native first, hybrid.

---

## Source-of-truth model

| Layer | Source of truth |
|-------|-----------------|
| **Application** | Git repo (commits, `vercel.json`, Prisma schema) |
| **Runtime config** | Vercel env + Neon/Redis dashboards (until exported to IaC) |
| **Secrets** | Vault / Vercel encrypted env — **never** git |
| **Drift** | Periodic human or script **read-only** diff vs inventory |

---

## Environment boundaries

| Env | Purpose | Parity rule |
|-----|---------|-------------|
| **Local** | Dev | Synthetic keys; optional Docker DB |
| **Preview** | PR branches | Non-prod secrets; no live money |
| **Staging** | Pre-prod validation | Mirrors prod **topology**; test Stripe/Reloadly sandbox |
| **Production** | Live | Change window + dual control for money-path env |

---

## Dependency map

```text
GitHub Actions (CI) ──► build/test (synthetic env)
Vercel (frontend) ──► NEXT_PUBLIC_* → API URL
Vercel (server API) ──► DATABASE_URL, REDIS_URL, STRIPE_*, RELOADLY_*, JWT_*, lockdown flags
Neon Postgres ──► migrations (prisma)
Redis ──► queue + limiters + optional metrics aggregation
Stripe ──► webhooks → API URL
Reloadly ──► OAuth outbound from API
DNS ──► apex + API hostnames
Observability ──► log drain / metrics (when wired, L29)
```

---

## Secret handling policy

- **Names only** in docs; **values** only in Vercel/dashboard/vault.
- Align with [`../SECRETS_MANAGEMENT.md`](../SECRETS_MANAGEMENT.md).

---

## State backend policy (when IaC adopted)

- Remote state: **S3 + DynamoDB lock**, Terraform Cloud, or Pulumi Service — **not** local-only state for team work.
- **Least privilege** on state bucket; encryption at rest; no public read.

---

## Drift management

- Monthly **read-only** inventory vs reality; severity in drift doc.
- **Launch-blocking** drift: wrong Stripe mode, prod DB URL in preview, missing webhook secret.

---

## L25–L34 dependencies

| Gate | L35 uses |
|------|----------|
| **L25** | Backup/restore ties to **same** Neon project/account discipline |
| **L26** | Readiness env consistency |
| **L27–L28** | Webhook URL + provider creds in inventory |
| **L29** | Log drain env names when added |
| **L34** | Failover implies **second** Vercel project or region — document in inventory |

---

## L36–L40 handoff

- **L36:** SLO monitors need **stable** resource names from inventory.
- **L37:** Provider SLA proof references **documented** prod Reloadly project.
- **L38:** Pen test scope needs **environment list** and **data classification**.
- **L39:** Change approval references **this** inventory row for each prod change.
- **L40:** Postmortems update **drift** and inventory **last verified**.

---

## NO-GO conditions (applying IaC or changing prod)

- No **state backend** agreed for team Terraform/Pulumi.
- Applying changes **without** inventory row + change ticket.
- Storing tfstate or Pulumi state **in git** with secrets.
- **Single-person** production DB destroy.

---

## References

- [`L35_ENVIRONMENT_INVENTORY_SCHEMA.md`](./L35_ENVIRONMENT_INVENTORY_SCHEMA.md), [`L35_IAC_TOOLING_ADR.md`](./L35_IAC_TOOLING_ADR.md), [`../runbooks/L35_RECREATE_ENVIRONMENT_FROM_SCRATCH_RUNBOOK.md`](../runbooks/L35_RECREATE_ENVIRONMENT_FROM_SCRATCH_RUNBOOK.md)
