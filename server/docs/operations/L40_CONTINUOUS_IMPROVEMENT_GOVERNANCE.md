# L40 — Continuous improvement governance

## Learning loop owner

| Role | Accountability |
|------|------------------|
| **Primary owner** | Director Engineering or delegated **Launch lead** |
| **Deputy** | SRE / on-call lead for metrics and incident linkage |
| **Product counterpart** | PM for customer feedback and roadmap intake |
| **Finance counterpart** | For money-path and margin reviews |

## Operating cadence

| Cadence | Participants | Output |
|---------|--------------|--------|
| **Weekly ops review** | Eng, SRE, Support lead | Metrics template delta + new tracker rows |
| **Biweekly product** | PM, Eng, Design | Prioritized UX / friction backlog |
| **Monthly exec** | Exec sponsor + leads | One-page summary (format below) |

## SLO / error budget handoff

- When L36-style SLO docs exist on branch: feed burn-rate and incident counts into monthly exec review.
- Until then: use `PHASE1_OBSERVABILITY_BASELINE.md`, `PHASE1_OPERATOR_METRICS.md`, and `/metrics` practices described in runbooks.

## Release governance handoff

- When `server/docs/governance/L39_*` exists: route process changes (freeze, approval matrix) through L39 owners.
- Until merged: record interim decisions in corrective actions and incident postmortems.

## Product roadmap handoff

- Each monthly review produces **3–5** engineering-ready initiatives with success metrics.
- Decline list: items explicitly **deferred** with reason (capacity, risk).

## Security / compliance handoff

- Open security items from reviews/postmortems → security backlog; link to `SECRETS_MANAGEMENT.md` and future L38 artifacts when on branch.

## Support operations handoff

- Update macros, runbooks, and FAQ from recurring themes (`L40_CUSTOMER_FEEDBACK_AND_SUPPORT_REVIEW.md`).
- Train tier-1 on new failure modes after each Sev2+ incident.

## Market growth handoff

- If marketing scales traffic: require **readiness checklist** pass and error-budget headroom (when SLO program exists).
- Coordinate cohort expansion with Product + Finance.

## Monthly executive review format

1. **Headline** — soft launch on track / at risk / hold  
2. **Metrics** — 5 bullets from latest `L40_SOFT_LAUNCH_METRICS_REVIEW_TEMPLATE.md`  
3. **Incidents** — count by severity; top RCAs (one line each)  
4. **Customers** — top 3 feedback themes  
5. **Money** — reconciliation health, refund/dispute trend  
6. **Risks** — open Critical/High corrective actions  
7. **Asks** — headcount, vendor, budget decisions  

## Related

- [L40_POST_SOFT_LAUNCH_LEARNING_LOOP.md](./L40_POST_SOFT_LAUNCH_LEARNING_LOOP.md)
- [../runbooks/L40_POST_LAUNCH_REVIEW_RUNBOOK.md](../runbooks/L40_POST_LAUNCH_REVIEW_RUNBOOK.md)
