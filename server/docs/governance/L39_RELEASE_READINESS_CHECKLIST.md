# L39 — Release readiness checklist

Use per **release train** or **launch milestone**. Check boxes when evidence exists (links/ticket ids **without secrets**). Layers L26–L38 reference documentation that may live on other branches until merged — track **PASS / NOT VERIFIED / N/A** per environment.

## Core pipeline

- [ ] **CI evidence** — `CI_VERIFICATION.md` satisfied; required jobs green for this SHA.
- [ ] **Staging evidence** — smoke or targeted scenarios executed; failures triaged or waived with signoff.
- [ ] **External readiness evidence** — Stripe/Reloadly/hosting dashboards reviewed for blockers (names only in notes).

## Layered gates (link files when present on branch)

- [ ] **L25 restore evidence** — `L25_BACKUP_RESTORE_READINESS.md`; backup/restore drill evidence where required (`runbooks/BACKUP_RESTORE_DRILL.md`).
- [ ] **L26 environment evidence** — ready/timeout and production safety posture documented and satisfied for this release (program docs / PR).
- [ ] **L27 webhook evidence** — dispute/webhook hardening reviewed for Stripe changes (program docs / PR).
- [ ] **L28 provider evidence** — fraud/payment layer checklist if in scope (program docs / PR).
- [ ] **L29 observability evidence** — logging/metrics/alert design or wiring reviewed for this change (program docs / PR).
- [ ] **L30 support evidence** — support/recovery runbooks aligned with release (program docs / PR).
- [ ] **L31 security/fraud evidence** — security/compliance/fraud package reviewed when present under `server/docs/security/`.
- [ ] **L32 soft launch evidence** — soft launch / kill-switch plan current if launching broadly (program docs / PR).
- [ ] **L33 load/chaos evidence** — load/chaos **plan** satisfied or explicitly waived for this train (program docs / PR).
- [ ] **L34 failover evidence** — failover/DR narrative reviewed if infra path changes (program docs / PR).
- [ ] **L35 infrastructure evidence** — env inventory / IaC alignment if infra touched (program docs / PR).
- [ ] **L36 SLO/on-call evidence** — SLO/error budget/on-call model reviewed if ops changes (program docs / PR).
- [ ] **L37 vendor SLA evidence** — vendor SLA / provider fallback docs and proofs when provider path changes (`server/docs/vendor/` when present).
- [ ] **L38 security audit/pentest evidence** — RoE/signoff or waiver recorded for hostile testing scope; matrix statuses for blocking controls (`server/docs/security/` when present).

## Money-path cross-checks (always when applicable)

- [ ] `PHASE1_PRODUCTION_SAFETY_GATES.md` — no disallowed flag combinations for target env.
- [ ] `PRODUCTION_MONEY_PATH_CHECKLIST.md` — items relevant to this release addressed.
- [ ] `PHASE1_IDEMPOTENCY_CONTRACT.md` — webhook/idempotency unchanged or explicitly reviewed.

## Signoff table

| Role | Name | Date | Notes (ticket ids) |
|------|------|------|---------------------|
| Release owner | | | |
| Engineering owner | | | |
| Platform / SRE | | | |
| Security | | | |
| Finance (money-path) | | | |
| Product (launch) | | | |

## Related

- [L39_CHANGE_APPROVAL_MATRIX.md](./L39_CHANGE_APPROVAL_MATRIX.md)
- [L39_RELEASE_DECISION_LOG_TEMPLATE.md](./L39_RELEASE_DECISION_LOG_TEMPLATE.md)
