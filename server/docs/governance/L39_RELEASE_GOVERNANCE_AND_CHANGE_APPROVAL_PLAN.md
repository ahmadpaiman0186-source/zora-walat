# L39 — Release governance and change approval plan

## L39 scope

Define **release governance** and **change approval** for Zora-Walat: who approves what, what evidence is required before production impact, and how **normal**, **standard**, and **emergency** changes differ.

**Docs/spec-only status:** This package does not merge PRs, deploy, edit environments, or run production preflight. It is the **policy and checklist shell** operators fill with evidence.

## Release governance objective

- Reduce **unauthorized** production change and **silent** money-path drift.
- Ensure **traceability**: every production-impacting change has approvers, rollback owner, and post-review.
- Align with layered gates (L25–L38) as **readiness evidence**, not as automatic approval.

## Change approval lifecycle

1. **Intent** — change description, risk class, linked PRs/tickets.
2. **Classification** — map to `L39_CHANGE_APPROVAL_MATRIX.md`.
3. **Evidence** — CI, staging, security/money-path artifacts per matrix.
4. **Approval** — named approvers sign (see matrix).
5. **Execute** — deploy/apply via controlled pipeline (out of scope for this doc).
6. **Monitor** — monitoring window per `L39_RELEASE_DECISION_LOG_TEMPLATE.md`.
7. **Review** — post-release review; emergency changes require expedited retrospective.

## Release categories

| Category | Description | Typical path |
|----------|-------------|--------------|
| **Docs / policy** | Markdown-only; no runtime | Fast path; still PR review |
| **Application release** | Server/client code | CI + staging + approvers |
| **Infrastructure** | DNS, DB tier, hosting | Platform + security + rollback plan |
| **Launch** | Public or expanded soft launch | Executive + readiness checklist complete |

## Standard / normal / emergency changes

| Type | Definition | Approval bar |
|------|------------|--------------|
| **Standard** | Low risk, reversible, no money-path | Team lead + CI green |
| **Normal** | Most releases; includes runtime code | Approvers per matrix + staging evidence |
| **Emergency** | Active incident or critical vulnerability | `L39_EMERGENCY_CHANGE_POLICY.md` minimum bar |

## Pre-release evidence requirements

Minimum (adjust per org):

- CI green for affected projects (`CI_VERIFICATION.md`).
- Staging smoke or targeted verification for **money-path** changes.
- Linked tickets/PRs in release decision log.
- Rollback/kill-switch note for high-impact changes (`L39_RELEASE_FREEZE_AND_ROLLBACK_POLICY.md`).

Layered L25–L38 evidence is captured in `L39_RELEASE_READINESS_CHECKLIST.md` when those layers are in scope for the release train.

## Release owner roles

| Role | Responsibility |
|------|----------------|
| **Release owner** | Drives checklist, schedules window, coordinates comms |
| **Engineering owner** | Code quality, rollback steps, deploy execution |
| **Platform / SRE** | Infra capacity, health checks, monitoring |
| **Security** | High-risk change review, emergency path |
| **Finance** (money-path) | Awareness for ledger/webhook/provider changes |
| **Product** | Launch scope and customer-facing comms |

## Approval authorities

Delegated per `L39_CHANGE_APPROVAL_MATRIX.md`. **No single engineer** self-approves production money-path + env/secret + schema changes without second approver.

## Launch-blocking conditions

- Open **Critical** security or money-path finding without compensating control (see security launch policy when `server/docs/security/` exists on branch).
- Missing rollback/kill-switch narrative for public launch.
- `PRELAUNCH_LOCKDOWN` / safety gate violations intentionally bypassed to ship.

## NO-GO conditions

- Shipping with **known** unsigned webhook or idempotency regression (unmitigated).
- Production schema/data “fix” without finance + engineering signoff.
- Emergency path used for **convenience** rather than true incident (see emergency policy).
- Merging or deploying from **this documentation task** — L39 is docs only.

## Related

- [L39_CHANGE_APPROVAL_MATRIX.md](./L39_CHANGE_APPROVAL_MATRIX.md)
- [L39_RELEASE_READINESS_CHECKLIST.md](./L39_RELEASE_READINESS_CHECKLIST.md)
- [L39_RELEASE_FREEZE_AND_ROLLBACK_POLICY.md](./L39_RELEASE_FREEZE_AND_ROLLBACK_POLICY.md)
- [L39_EMERGENCY_CHANGE_POLICY.md](./L39_EMERGENCY_CHANGE_POLICY.md)
- [../runbooks/L39_PRODUCTION_CHANGE_APPROVAL_RUNBOOK.md](../runbooks/L39_PRODUCTION_CHANGE_APPROVAL_RUNBOOK.md)
