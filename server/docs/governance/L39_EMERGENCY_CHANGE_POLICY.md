# L39 — Emergency change policy

## Emergency definition

An **emergency change** is a production-impacting modification made **outside** the normal change window to:

- Stop ongoing **customer financial loss** or **security breach**, or
- Restore **critical availability** of the payment/fulfillment path,

when delay would **materially worsen** outcome.

## Allowed emergency scenarios

- Confirmed **active exploit** or credential compromise.
- **Sev0/Sev1** production outage with no viable non-deploy mitigation.
- **Regulatory** or **legal** compelled action with documented instruction (General Counsel loop).

## Minimum approvers

| Scenario | Minimum approvers |
|----------|-------------------|
| Security emergency | Eng on-call + **Security** (or exec delegate if Security unreachable) |
| Money-path emergency | Eng on-call + **Finance delegate** (or exec delegate) |
| Both | Eng on-call + Security + Finance **or** two exec delegates |

**Rule:** **Two humans** minimum; no solo prod env/secret change for money-path.

## Temporary bypass constraints

- Bypass **only** what is necessary (narrowest flag/schema change).
- **PRELAUNCH_LOCKDOWN** and safety gates must return to compliant state within agreed **SLA** (e.g. 72h) unless formally excepted.
- Document **every** bypass in incident ticket + release decision log addendum.

## Forbidden emergency actions

- Using emergency path for **schedule convenience** or to skip review.
- **Bulk** production data delete or ledger rewrite without finance + written plan.
- Disabling **webhook signature verification** or **idempotency** as a “quick fix.”
- Live **provider** experiments without sandbox proof.

## Audit trail requirements

- Timestamped incident id.
- PR or hotfix reference **as soon as feasible** (same day target).
- Approver names recorded (no shared generic accounts).

## Retrospective requirement

- **Within 5 business days:** blameless post-incident review.
- Actions: tests, guardrails, matrix updates.

## Remediation follow-up

- Track **follow-up tickets** for proper fix if emergency patch was partial.
- Update `L39_RELEASE_READINESS_CHECKLIST.md` if new evidence is required for next train.

## Related

- [L39_CHANGE_APPROVAL_MATRIX.md](./L39_CHANGE_APPROVAL_MATRIX.md)
- [L39_RELEASE_FREEZE_AND_ROLLBACK_POLICY.md](./L39_RELEASE_FREEZE_AND_ROLLBACK_POLICY.md)
- [../runbooks/L39_PRODUCTION_CHANGE_APPROVAL_RUNBOOK.md](../runbooks/L39_PRODUCTION_CHANGE_APPROVAL_RUNBOOK.md)
