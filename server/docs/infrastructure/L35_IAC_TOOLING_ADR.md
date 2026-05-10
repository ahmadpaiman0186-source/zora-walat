# ADR: L35 — IaC tooling choice

**Status:** Proposed — **not** implementing Terraform/Pulumi in this commit.

---

## Context

The stack uses **Vercel** (two projects), **Neon Postgres**, optional **Redis**, **Stripe**, **Reloadly**, and **DNS**. Today much config lives in **vendor consoles**. L35 needs **reproducibility** without blocking soft launch on a full IaC program.

---

## Options

| # | Option | Summary |
|---|--------|---------|
| 1 | **Terraform** | Broad provider support; HCL learning curve; state backend required |
| 2 | **Pulumi** | Real code (TS/Go); good for app teams; state via Pulumi Service or self-host |
| 3 | **Vendor-native + runbooks** | Vercel/Neon UIs + documented checklists — **lowest** upfront cost |
| 4 | **Hybrid staged** | Runbooks **now**; Terraform/Pulumi for DNS + IAM **first**; Vercel later via API/modules |

---

## Evaluation criteria

| Criterion | Weight note |
|-----------|-------------|
| Reproducibility | Can another engineer recreate staging? |
| Secret safety | No secrets in state; remote state encryption |
| State management | Team lock, versioning |
| Team skill | HCL vs TS |
| Vendor coverage | Vercel resources maturity in provider |
| Rollback | Revert TF / redeploy |
| Compliance / audit | Change logs, PRs for infra |
| Implementation cost | Time to first value |

---

## Decision (recommended for **current stage**)

**Option 4 — Hybrid staged:**

1. **Immediate:** Complete [`L35_PROVISIONING_RUNBOOK_DRY_RUN.md`](./L35_PROVISIONING_RUNBOOK_DRY_RUN.md) + inventory + drift cadence.
2. **Next:** Introduce Terraform or Pulumi for **DNS** and **cloud IAM** (if AWS/GCP used beside Vercel).
3. **Later:** Evaluate **Vercel** provider modules or **OpenTF** ecosystem for env/project parity.

**Rationale:** Soft launch needs **discipline** and **evidence** faster than full IaC coverage of Vercel’s surface area.

---

## Migration path to full IaC

- Export env **key list** → generate `.tf` or Pulumi **placeholder** resources (no values).
- Import DNS records first.
- Neon: use provider **if** supported; else document **manual** Neon + track in drift.

---

## Consequences

- **Positive:** Faster operational readiness; clear ADR for future TF hire.
- **Negative:** **Console drift** risk until automated; mitigated by monthly checks.

---

## NO-GO conditions

- Running `terraform apply` **without** remote state backend agreed
- Storing raw `DATABASE_URL` in tfvars in git
- **Single engineer** only with production state **delete** permission

---

## References

- [`L35_IAC_REPRODUCIBLE_INFRASTRUCTURE_STRATEGY.md`](./L35_IAC_REPRODUCIBLE_INFRASTRUCTURE_STRATEGY.md)
