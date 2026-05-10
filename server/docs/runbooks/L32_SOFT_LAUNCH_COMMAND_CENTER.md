# L32 — Soft launch command center runbook

**Use:** Single place for **timing**, **comms**, and **stop** criteria during a controlled soft launch window.  
**Pair with:** [`../launch/L32_GO_NO_GO_CHECKLIST.md`](../launch/L32_GO_NO_GO_CHECKLIST.md), [`../launch/L32_ROLLBACK_KILL_SWITCH_PLAN.md`](../launch/L32_ROLLBACK_KILL_SWITCH_PLAN.md).

---

## Communication channels (fill per org)

| Channel | Purpose |
|---------|---------|
| **Incident** | P0/P1 technical |
| **Launch** | Read-only updates to stakeholders |
| **Support** | Customer-facing queue bridge |

---

## Launch window preparation

- [ ] Go/no-go **GO** recorded with cohort id (C0–C3)
- [ ] On-call names in calendar
- [ ] Rollback owner + deputy named
- [ ] Stripe Dashboard + provider console logged in (secured workstations only)
- [ ] Evidence folder path created (`L32_EVIDENCE_PACK_TEMPLATE`)

---

## T-24h

- Re-run `preflight:production` (or release checklist) on **staging** parity where possible
- Confirm deploy artifact and migration plan
- Support macro/templates loaded (L30 docs when available)

## T-4h

- Freeze non-critical merges (policy)
- Verify synthetics / `/health` on target env
- Confirm allowlist entries for C1 (redacted list)

## T-1h

- War room link open; incident commander designated
- Double-check `PRELAUNCH_LOCKDOWN` / `PAYMENTS_LOCKDOWN_MODE` vs intended state (**no change** without go/no-go)

## T-0

- Deploy or enable cohort per plan only
- Post “launch started” to launch channel (no customer promises)

---

## First 15 minutes

| Action | Owner |
|--------|-------|
| Watch error rate, 5xx, webhook signature invalid rate | On-call |
| Spot-check first transaction (if any) end-to-end | Eng + support |
| Confirm no mass `/ready` 503 | On-call |

**Stop-launch:** Any **launch-blocking** item from go/no-go flips to FAIL, or P0 money-path alert fires — see [`../launch/L32_SOFT_LAUNCH_METRICS_GUARDRAILS.md`](../launch/L32_SOFT_LAUNCH_METRICS_GUARDRAILS.md).

---

## First 1 hour

- Review fulfillment queue depth vs baseline
- Support ticket volume vs threshold
- Decision: **continue**, **hold** (no new users), or **rollback**

---

## First 24 hours

- Error budget burn (handoff L29/L36 when defined)
- Post-launch brief: what worked, what to tune
- Update evidence pack with timelines (no secrets)

---

## Support handoff

- L30 templates when present; otherwise neutral scripts only
- Fraud suspicion → security queue (L31) without accusing customers in writing

---

## Incident severity (launch window)

| Level | Meaning |
|-------|---------|
| **Sev-1** | Money-path integrity or total checkout failure |
| **Sev-2** | Elevated failures or SLA breach trend |
| **Sev-3** | Single-user, non-systemic |

---

## Rollback trigger criteria

- Sustained violation of stop thresholds in metrics doc
- Duplicate capture / ledger mismatch suspected
- Engineering lead declares rollback
- Use [`../launch/L32_ROLLBACK_KILL_SWITCH_PLAN.md`](../launch/L32_ROLLBACK_KILL_SWITCH_PLAN.md) — **two-person** for money-path toggles

---

## Evidence capture

- Timestamps (UTC), deploy id, synthetic screenshots, **redacted** Dashboard snippets
- No webhook secrets, JWTs, or full PAN

---

## Closure criteria

- Observation window complete OR rollback complete
- Evidence pack has verdict + signoff line
- Tickets/incidents closed or linked

---

## References

- `PHASE1_LAUNCH_ROLLBACK_NOTES.md`, `DEPLOYMENT_READINESS.md`
