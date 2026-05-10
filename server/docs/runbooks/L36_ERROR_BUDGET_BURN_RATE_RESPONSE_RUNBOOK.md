# L36 — Error budget / burn-rate response runbook

**Use when** burn-rate alerts fire or budget consumption spikes. Pair with [`../operations/L36_ERROR_BUDGET_POLICY.md`](../operations/L36_ERROR_BUDGET_POLICY.md).

**Template fields per scenario:** Trigger | Owner | First 5 min | First 15 min | First 60 min | Customer/support handoff | Rollback/kill switch | Evidence | Closure | Post-incident

---

## 1. Fast burn — API outage

| Phase | Action |
|-------|--------|
| **Trigger** | 5xx ratio, synthetic `/health` fail |
| **Owner** | Incident Commander + Backend owner |
| **First 5 min** | Declare SEV; open bridge; check deploy |
| **First 15 min** | Rollback if deploy-correlated; scale if platform |
| **First 60 min** | Stabilize; estimate budget burn |
| **Support** | Outage template (L30 when available) |
| **Rollback** | Previous release per L32/L34 docs when present |
| **Evidence** | Deploy id, error rate graph |
| **Closure** | Synthetics green 30m; budget note |
| **Follow-up** | Postmortem if SEV0/1 |

---

## 2. `/ready` degradation

| Phase | Action |
|-------|--------|
| **Trigger** | Auth `/ready` 503, DB reason |
| **Owner** | Backend + DBA |
| **First 5 min** | Read `readinessReason`; stop deploy churn |
| **First 15 min** | DB/Redis path; Neon console read-only |
| **First 60 min** | Fix forward or failover per L34 when available |
| **Support** | “Temporarily unavailable” — no internals |
| **Rollback** | Config toggle only with dual control |
| **Evidence** | Reason enum, timeline |
| **Closure** | 200 sustained |
| **Follow-up** | L26 verification gap if recurring |

---

## 3. Stripe webhook failure spike

| Phase | Action |
|-------|--------|
| **Trigger** | Dashboard failures; 503 on route; **or** 200+log failure |
| **Owner** | Webhook owner + Money-path owner |
| **First 5 min** | Stripe status; recent deploy |
| **First 15 min** | Scale/concurrency; signature secret check plan |
| **First 60 min** | Fix handler; verify delivery success |
| **Support** | Payment pending investigation |
| **Rollback** | Revert breaking deploy **before** secret rotation |
| **Evidence** | Delivery ids suffix, trace ids |
| **Closure** | Dashboard green + log calm |
| **Follow-up** | L27/PR5 behavior review |

---

## 4. Paid-to-fulfillment gap

| Phase | Action |
|-------|--------|
| **Trigger** | SLA breach metric; recon REQUIRED |
| **Owner** | Money-path + Worker owner |
| **First 5 min** | Queue depth vs DB; worker health |
| **First 15 min** | Restart worker; fix Redis if needed |
| **First 60 min** | DLQ policy per INCIDENT_SCENARIOS |
| **Support** | Fulfillment delayed template |
| **Rollback** | Kill switch dispatch if duplicate risk |
| **Evidence** | Queue graph, order suffix sample |
| **Closure** | Backlog drained |
| **Follow-up** | L33 capacity if repeat |

---

## 5. Provider outage

| Phase | Action |
|-------|--------|
| **Trigger** | Circuit open; mass `fulfillment_failed` |
| **Owner** | L28 owner |
| **First 5 min** | Provider status page |
| **First 15 min** | Comms + internal kill switch eval |
| **First 60 min** | Partner ticket; cohort throttle |
| **Support** | Provider delay messaging |
| **Rollback** | N/A — mitigate |
| **Evidence** | Provider ticket id |
| **Closure** | Success rate normalized |
| **Follow-up** | L37 SLA proof |

---

## 6. Ledger / reconciliation drift

| Phase | Action |
|-------|--------|
| **Trigger** | P0 money-path alert; recon export |
| **Owner** | Money-path + Finance |
| **First 5 min** | Freeze risky replays |
| **First 15 min** | Read-only analysis |
| **First 60 min** | Approved remediation path only |
| **Support** | Generic investigation |
| **Rollback** | N/A — forward fix under control |
| **Evidence** | Hashed export |
| **Closure** | Finance sign-off |
| **Follow-up** | L40 learning |

---

## 7. Support incident spike

| Phase | Action |
|-------|--------|
| **Trigger** | Ticket rate vs baseline |
| **Owner** | Support lead |
| **First 5 min** | Tag theme; link to eng if systemic |
| **First 15 min** | Staff surge; macros |
| **First 60 min** | Bridge if tied to SEV |
| **Support** | Internal coordination |
| **Rollback** | Product/marketing pause |
| **Evidence** | Ticket stats |
| **Closure** | Queue normal |
| **Follow-up** | UX or reliability ticket |

---

## 8. Fraud / security spike

| Phase | Action |
|-------|--------|
| **Trigger** | Velocity blocks; auth anomaly |
| **Owner** | Security lead |
| **First 5 min** | Preserve logs; no customer accusation |
| **First 15 min** | Tighten limits **via** approved config |
| **First 60 min** | Law/counsel if needed |
| **Support** | Neutral wording |
| **Rollback** | Revert bad rule if false positive mass |
| **Evidence** | Secure vault |
| **Closure** | Contained + review |
| **Follow-up** | L31/L38 |

---

## 9. Observability blind spot

| Phase | Action |
|-------|--------|
| **Trigger** | Logs/metrics gap; “flying blind” |
| **Owner** | SRE |
| **First 5 min** | Vendor status; alternate log path |
| **First 15 min** | Enable backup sink **if** pre-approved |
| **First 60 min** | Restore pipelines |
| **Support** | Conservative external comms |
| **Rollback** | N/A |
| **Evidence** | Vendor incident id |
| **Closure** | Data flowing |
| **Follow-up** | L29 wiring priority |

---

## 10. Alert sink failure

| Phase | Action |
|-------|--------|
| **Trigger** | PagerDuty/Slack not delivering |
| **Owner** | Infra + IC |
| **First 5 min** | Switch to backup phone tree **manual** |
| **First 15 min** | Vendor case |
| **First 60 min** | Restore integration |
| **Support** | May be unaware — shorten external promises |
| **Rollback** | Revert bad routing config |
| **Evidence** | Vendor ticket |
| **Closure** | Test page succeeds |
| **Follow-up** | Redundant route |

---

## References

- [`../operations/L36_BURN_RATE_ALERTING_POLICY.md`](../operations/L36_BURN_RATE_ALERTING_POLICY.md)
