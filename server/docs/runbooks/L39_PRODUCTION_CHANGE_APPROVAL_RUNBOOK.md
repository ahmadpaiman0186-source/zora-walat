# L39 — Production change approval runbook

**Policy execution** for approving production changes. This document does **not** grant access to consoles or secrets.

## 1. Normal release approval

1. Classify change in `L39_CHANGE_APPROVAL_MATRIX.md`.
2. Complete applicable rows in `L39_RELEASE_READINESS_CHECKLIST.md`.
3. Fill `L39_RELEASE_DECISION_LOG_TEMPLATE.md` with **GO**.
4. Obtain approvers listed in matrix; **no** self-approval for money-path + env + schema.
5. Schedule deploy in agreed window; assign rollback owner.

## 2. Emergency hotfix approval

1. Confirm incident meets `L39_EMERGENCY_CHANGE_POLICY.md` **definition**.
2. Assemble **minimum approvers** (two humans; Security/Finance as required).
3. Document **minimal** change and immediate rollback/forward-fix.
4. Execute mitigation; open PR same day when possible.
5. Schedule **mandatory retrospective** within 5 business days.

## 3. Env / secret change approval

1. Ticket with **names** of variables/secret keys only — **no values** in Slack/email.
2. Approvers: Platform + Security per matrix.
3. Plan rotation: old key revocation deadline.
4. Post-change: verify app health, webhook deliveries, provider auth (non-destructive checks).

## 4. Webhook / provider change approval

1. Stripe: verify signing secret rotation process, Dashboard endpoint, idempotency tests.
2. Reloadly: confirm sandbox proof or waived with exec signoff; operator map governance.
3. Approvers: Eng + Finance; Security for webhook integrity changes.

## 5. DB / schema change approval

1. Migration review: backward compatibility, lock risk, duration.
2. Backup confirmation pointer (job name / timestamp).
3. Approvers: Eng + Platform; **Finance** if ledger-adjacent.
4. **No** ad-hoc prod SQL — forward migration or governed restore only.

## 6. Rollback decision

1. Trigger: failed health checks, error rate SLO breach, or IC call.
2. Engineering + Release owner decide: **deploy rollback** vs **forward fix**.
3. Data path: follow `L39_RELEASE_FREEZE_AND_ROLLBACK_POLICY.md` — no ledger hacks.
4. Record decision in incident ticket + decision log addendum.

## 7. Failed deploy response

1. Stop promotion; isolate bad revision if blue/green.
2. Communicate to on-call and support leads.
3. Restore last known good or hotfix; capture logs (redacted).

## 8. Post-change evidence capture

- CI/staging links, canary metrics snapshots (no PII).
- Store in evidence index lineage when applicable.

## 9. Post-release review

- Compare expected vs actual metrics; open tickets for drift.
- Update readiness checklist if new gaps found.

## Closure criteria

- Monitoring window complete without unresolved **Critical** regressions.
- Retrospective scheduled for emergencies.
- Decision log **final verdict** recorded.

## Related

- [../governance/L39_RELEASE_GOVERNANCE_AND_CHANGE_APPROVAL_PLAN.md](../governance/L39_RELEASE_GOVERNANCE_AND_CHANGE_APPROVAL_PLAN.md)
- [../governance/L39_CHANGE_APPROVAL_MATRIX.md](../governance/L39_CHANGE_APPROVAL_MATRIX.md)
- [../PHASE1_PRODUCTION_SAFETY_GATES.md](../PHASE1_PRODUCTION_SAFETY_GATES.md)
