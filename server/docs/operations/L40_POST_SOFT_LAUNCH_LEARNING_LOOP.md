# L40 — Post-soft-launch learning loop

## L40 scope

Define the **operating cadence** after a **controlled soft launch**: how the org learns from metrics, incidents, support, money-path behavior, providers, and fraud signals—and feeds improvements into product, engineering, security, and release governance.

**Docs/spec-only status:** This package does not query production, merge PRs, deploy, or change configuration. It is templates and procedures for humans to execute with authorized tools.

## Objective

- Convert launch experience into **measurable improvements** with owners and due dates.
- Prevent “silent drift” where metrics degrade but no one owns the review.
- Bridge **operations** (SLO, incidents), **support**, **finance** (reconciliation/refunds), and **release governance** (L39 when present on branch).

## Daily / weekly learning cadence

| Cadence | Focus | Primary output |
|---------|--------|----------------|
| **Daily (first 2 weeks)** | Error spikes, stuck fulfillments, webhook backlog, support surge | Short stand-up notes + ticket links |
| **Weekly** | Trend review, corrective action burndown, provider latency | Updated metrics template + tracker rows |
| **Monthly** | Executive summary, roadmap reprioritization | `L40_CONTINUOUS_IMPROVEMENT_GOVERNANCE.md` format |

## Launch metric review

- Use `L40_SOFT_LAUNCH_METRICS_REVIEW_TEMPLATE.md` each review period.
- Compare to pre-launch assumptions in `LAUNCH_READINESS.md` and `PHASE1_OPERATOR_METRICS.md` (when applicable).

## Incident review loop

- Every production incident ≥ agreed severity triggers `L40_INCIDENT_POSTMORTEM_TEMPLATE.md` within SLA.
- Link postmortems to `L40_CORRECTIVE_ACTION_TRACKER.md` rows.

## Customer feedback loop

- Aggregate App Store / in-app / email / social per `L40_CUSTOMER_FEEDBACK_AND_SUPPORT_REVIEW.md`.
- Deduplicate against known incidents (do not double-count outage noise as UX debt without triage).

## Support ticket analysis

- Tag volume by taxonomy (billing, fulfillment, trust, UX).
- Correlate spikes with deploys, provider incidents, or marketing pushes.

## Money-path defect review

- Review failed checkouts, webhook failures, stuck `paid` states, duplicate-risk flags.
- Cross-check `FINANCE_TRUTH_AND_RECONCILIATION.md`, `PHASE1_REFUND_AND_DISPUTE.md`, `PHASE1_STATE_MACHINE.md`.

## Provider performance review

- Reloadly (or configured provider): error rates, latency, quota incidents—reference `runbooks/RELOADLY_PRODUCTION_REHEARSAL.md` when reviewing.

## Fraud / risk review

- Review abuse signals, dispute rate, velocity anomalies—`ABUSE_HARDENING_MATRIX.md`, `RATE_LIMITING.md`.

## Release governance handoff

- When L39 docs exist on branch: route structural process changes to `governance/L39_*` and release decision logs.
- Until then: capture governance decisions as corrective actions with explicit owners.

## Closure criteria

L40 “learning loop established” is **closed** when:

1. First **24h** and **7d** reviews completed per `runbooks/L40_POST_LAUNCH_REVIEW_RUNBOOK.md`.
2. At least one **metrics review** template filled for the soft-launch window.
3. **Corrective action tracker** has no open **Critical** rows past due date (or formal exception recorded).
4. **Postmortem** backlog cleared for incidents in the window (or waived with IC signoff).

## Related

- [L40_SOFT_LAUNCH_METRICS_REVIEW_TEMPLATE.md](./L40_SOFT_LAUNCH_METRICS_REVIEW_TEMPLATE.md)
- [L40_INCIDENT_POSTMORTEM_TEMPLATE.md](./L40_INCIDENT_POSTMORTEM_TEMPLATE.md)
- [L40_CUSTOMER_FEEDBACK_AND_SUPPORT_REVIEW.md](./L40_CUSTOMER_FEEDBACK_AND_SUPPORT_REVIEW.md)
- [L40_CORRECTIVE_ACTION_TRACKER.md](./L40_CORRECTIVE_ACTION_TRACKER.md)
- [L40_CONTINUOUS_IMPROVEMENT_GOVERNANCE.md](./L40_CONTINUOUS_IMPROVEMENT_GOVERNANCE.md)
- [../runbooks/L40_POST_LAUNCH_REVIEW_RUNBOOK.md](../runbooks/L40_POST_LAUNCH_REVIEW_RUNBOOK.md)
