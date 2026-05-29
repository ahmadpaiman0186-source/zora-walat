# L39 — Release freeze and rollback policy

## Release freeze triggers

| Trigger | Effect |
|---------|--------|
| **Active Sev0/Sev1** money-path or security incident | **Freeze** non-essential production changes until IC contains |
| **Error budget exhausted** (when SLO program active) | Freeze discretionary releases; only fixes |
| **Holiday / blackout** window | No optional launches; emergency only |
| **Vendor incident** (Stripe, Reloadly, hosting) | Freeze provider-impacting changes until vendor clears |

## Soft launch freeze

- No expansion of traffic, marketing, or feature flags that increase money-path volume without **checklist** signoff (`L39_RELEASE_READINESS_CHECKLIST.md`).
- Soft launch may still accept **fix-forward** patches for launch blockers with approval matrix path.

## Public launch freeze

- **Hard freeze** on unrelated refactors during final launch window (define hours/days per org).
- Only launch-critical fixes with **dual approval** per `L39_CHANGE_APPROVAL_MATRIX.md`.

## Change window rules

- Prefer **business-hours** deploys for high-risk changes unless emergency.
- Communicate **maintenance** to support if customer-visible degradation is possible.
- No parallel **competing** production changes to same subsystem without coordination.

## Rollback authority

| Context | Authority |
|---------|-----------|
| Standard app deploy rollback | Engineering owner + Release owner |
| Infra/DNS rollback | Platform owner + Security (if security-sensitive) |
| **Data** rollback | **Forbidden** ad-hoc — forward-fix or governed restore only |

## Kill-switch authority

- Product + Engineering for **checkout freeze** / **feature flags** affecting new money acceptance.
- Executive delegate for **public comms** + **full service** denial decisions.

## Database rollback constraints

- **No** “down” migration on ledger-adjacent tables without finance + engineering written plan.
- Prefer **forward** migrations and compensating transactions.

## Immutable ledger constraints

- Production `UPDATE`/`DELETE` on financial truth tables is **out of band** — only via governed procedures and audit trail.
- Post-restore checks must respect ledger invariants (see backup/restore runbooks).

## Provider fallback constraints

- Do **not** enable mock/sandbox substitution for paying customers without explicit approval (`L21_PROVIDER_FALLBACK.md`, production safety gates).
- Provider-impacting rollback follows vendor outage runbooks when present on branch.

## Customer communication handoff

- Support/Product own customer-facing language.
- Engineering provides **technical facts** only (no promises on provider/Stripe timelines).

## NO-GO conditions

- “Rollback” that mutates historical ledger to **hide** errors.
- Disabling monitoring/alerts to reduce noise during launch.
- Bypassing change approval matrix **without** emergency policy path.

## Related

- [L39_RELEASE_GOVERNANCE_AND_CHANGE_APPROVAL_PLAN.md](./L39_RELEASE_GOVERNANCE_AND_CHANGE_APPROVAL_PLAN.md)
- [../PHASE1_LAUNCH_ROLLBACK_NOTES.md](../PHASE1_LAUNCH_ROLLBACK_NOTES.md)
- [../L25_BACKUP_RESTORE_READINESS.md](../L25_BACKUP_RESTORE_READINESS.md)
