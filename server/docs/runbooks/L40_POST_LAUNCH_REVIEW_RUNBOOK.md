# L40 — Post-launch review runbook

Operational procedures for **post-soft-launch** reviews. Does **not** authorize production queries or config changes by itself.

## First 24-hour review

**When:** T+24h from soft-launch cutover (or first paid traffic).

1. **Health:** `/ready`, error rate, deploy version matches intended SHA.
2. **Payments:** Stripe webhook delivery success (Dashboard — no secret export).
3. **Fulfillment:** stuck paid count, DLQ depth if queue enabled, provider error rate.
4. **Support:** ticket volume vs baseline; tag top themes.
5. **Incidents:** any open Sev1/Sev2 — if yes, invoke incident playbook first.
6. **Output:** Partial fill of `operations/L40_SOFT_LAUNCH_METRICS_REVIEW_TEMPLATE.md` + any new `L40_CORRECTIVE_ACTION_TRACKER.md` rows.

## First 7-day review

**When:** End of calendar week 1 (or T+7d).

1. Complete metrics template for the week.
2. Review **all** incidents with postmortem status (open postmortems are launch risk).
3. **Reconciliation:** aging buckets per `FINANCE_TRUTH_AND_RECONCILIATION.md`.
4. **Provider:** latency/error trends; compare to rehearsal expectations (`RELOADLY_PRODUCTION_REHEARSAL.md`).
5. **Fraud / abuse:** dispute velocity, velocity limits hit (`ABUSE_HARDENING_MATRIX.md`).
6. **Output:** Go/no-go continuation recommendation; exec summary draft.

## Incident review

- For each qualifying incident: complete `operations/L40_INCIDENT_POSTMORTEM_TEMPLATE.md` within org SLA.
- Link corrective actions; assign owners and due dates.

## Support backlog review

- Triage aging tickets; identify **documentation** vs **product defect** vs **policy**.
- Update macros/runbooks per `L40_CUSTOMER_FEEDBACK_AND_SUPPORT_REVIEW.md`.

## Reconciliation review

- Run or review admin reconciliation procedures documented in this repo’s runbook index.
- Escalate drift to Finance + Eng; **no** ad-hoc SQL.

## Provider performance review

- Error codes, timeout rate, quota events.
- If degradation: follow provider outage runbooks when present on branch; consider freeze per `PHASE1_LAUNCH_ROLLBACK_NOTES.md`.

## Go / no-go continuation decision

| Decision | Meaning |
|----------|---------|
| **Continue** | Expand cohort / keep current traffic |
| **Hold** | No expansion; fix Critical/High items first |
| **Rollback / freeze** | Reduce traffic, disable feature flags, or revert deploy per governance |

Document in metrics template and notify release owner (L39 governance when available).

## Escalation to rollback / freeze

1. IC or release owner declares **hold** with rationale.
2. Execute rollback/kill-switch per `PHASE1_LAUNCH_ROLLBACK_NOTES.md` and platform runbooks.
3. Customer comms via Product/Support template.

## Corrective action closure

- Each tracker row: verify closure criteria met; attach evidence (redacted).
- Move to **Done** only with owner signoff.

## Final L40 closure decision

- **Criteria:** `operations/L40_POST_SOFT_LAUNCH_LEARNING_LOOP.md` closure section satisfied.
- **Verdict:** Record in monthly exec doc + optional release decision log addendum (L39 template when on branch).
- **Handoff:** Continuous improvement cadence owned per `L40_CONTINUOUS_IMPROVEMENT_GOVERNANCE.md`.

## Related

- [../operations/L40_POST_SOFT_LAUNCH_LEARNING_LOOP.md](../operations/L40_POST_SOFT_LAUNCH_LEARNING_LOOP.md)
- [../operations/L40_SOFT_LAUNCH_METRICS_REVIEW_TEMPLATE.md](../operations/L40_SOFT_LAUNCH_METRICS_REVIEW_TEMPLATE.md)
- [../PHASE1_INCIDENT_PLAYBOOK.md](../PHASE1_INCIDENT_PLAYBOOK.md)
- [../LAUNCH_READINESS.md](../LAUNCH_READINESS.md)
