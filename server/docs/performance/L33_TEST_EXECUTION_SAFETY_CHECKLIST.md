# L33 — Test execution safety checklist

**Use:** Immediately before and after **any** load/stress/chaos run. Check **every** box or document waiver.

---

## Pre-test

- [ ] **Owner** named and available for duration + 1h
- [ ] **Environment** confirmed: hostname is **not** production
- [ ] **PRELAUNCH_LOCKDOWN / payments** policy reviewed for staging
- [ ] **Stripe mode** = test for money-adjacent tests
- [ ] **Reloadly** = sandbox if hitting real API
- [ ] **RPS cap** and **duration** written in ticket
- [ ] **Abort** procedure rehearsed (`Ctrl+C`, kill switch, staging isolate)

---

## Environment verification

- [ ] `DATABASE_URL` points to disposable/staging instance (name verified out-of-band, not pasted here)
- [ ] No production Stripe keys in shell `env`
- [ ] Redis isolated from prod

---

## Production-block check

- [ ] URL allowlist: only approved hosts
- [ ] DNS confirms staging region
- [ ] **Second person** verified URL for high-RPS runs (optional policy)

---

## Secrets redaction

- [ ] Logs/screenshots will mask tokens
- [ ] Test scripts do not `console.log` env

---

## Test data validation

- [ ] Orders/users synthetic or approved scrubbed set
- [ ] No GDPR-exported prod dumps without DPA

---

## Rate / traffic cap

- [ ] Script enforces max RPS / max concurrency
- [ ] Webhook generator capped (events/sec)

---

## Abort switch

- [ ] On-call can reach platform to scale down / block staging
- [ ] Stripe test clock / webhook forwarding stopped on abort

---

## Support / on-call notification

- [ ] Staging shared with support? **Notify** if yes
- [ ] Incident channel idle or tagged “test”

---

## Post-test cleanup

- [ ] Workers restarted if paused
- [ ] Queues drained or jobs purged per policy
- [ ] Feature flags restored

---

## Evidence archive

- [ ] Charts + summary in evidence folder (no secrets)
- [ ] Link from change ticket

---

## Verdict format

```
L33_EXECUTION_VERDICT: PASS | FAIL | ABORTED
REASON: <short>
FOLLOW_UPS: <tickets>
```

---

## References

- [`L33_LOAD_STRESS_CHAOS_TEST_PLAN.md`](./L33_LOAD_STRESS_CHAOS_TEST_PLAN.md), [`../runbooks/L33_CHAOS_FAILURE_DRILL_RUNBOOK.md`](../runbooks/L33_CHAOS_FAILURE_DRILL_RUNBOOK.md)
