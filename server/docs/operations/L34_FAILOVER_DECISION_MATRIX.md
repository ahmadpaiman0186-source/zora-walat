# L34 — Failover decision matrix

**Use:** Triage during incident; pair with [`L34_MULTI_REGION_FAILOVER_STRATEGY.md`](./L34_MULTI_REGION_FAILOVER_STRATEGY.md).  
Columns: **Trigger** | **Severity** | **Detection** | **First responder** | **Allowed action** | **Forbidden action** | **Data integrity risk** | **Customer impact** | **Rollback path** | **Evidence** | **Launch-blocking if unresolved**

---

| Trigger | Severity | Detection source | First responder | Allowed action | Forbidden action | Data integrity risk | Customer impact | Rollback path | Evidence required | Launch-blocking? |
|---------|----------|------------------|-----------------|----------------|------------------|---------------------|-----------------|---------------|-------------------|------------------|
| Vercel region / platform outage | P0 | Status page, 5xx spike | On-call | Failover DNS to standby **if** DB healthy there | Random redeploy without DB plan | Split-brain if two writers | Full outage | Fail back when platform green | Status screenshots, time range | Y |
| API deployment outage | P0/P1 | Synthetics, deploy logs | Eng | Roll back release **or** shift traffic | Hot patch prod schema ad hoc | Low if single bad deploy | Errors / timeouts | Redeploy previous tag | Deploy id | Y if money path |
| Frontend deployment outage | P1 | CDN errors | Eng | Roll back static / redeploy | N/A | Low | UX only | Previous build | Build id | N |
| Neon/Postgres unavailable | P0 | `/ready`, Prisma errors | On-call + DBA | Promote replica / restore per L25 | `UPDATE` ledger rows to “fix” | **High** — restore discipline | Full write stop | Fail back after single-primary proof | Backup id, promote log | Y |
| DB degraded but writable | P1 | Latency, Neon metrics | DBA | Throttle traffic; scale tier | Ignore growing replication lag | Medium | Slow checkout | After stabilizing | Metrics export | Y if sustained |
| DB read-only or restored replica | P0 | Read-only errors | DBA | Route writes only to primary | Writes to replica | **High** if misrouted | Failed payments | Fix routing | Routing diagram | Y |
| Redis/queue unavailable | P1 | Enqueue failures, `/ready` | Eng | Enable degrade path; restore Redis | Flush prod Redis without recon | Job loss; stuck PAID | Delayed fulfillment | Restore + reconcile queue | Queue depth vs DB | Y if unbounded backlog |
| Stripe webhook delivery failure | P0/P1 | Stripe Dashboard | Eng | Fix endpoint/503; scale handlers | Disable signature verification | Missed lifecycle updates | Stuck orders | Restore endpoint | Delivery ids | Y |
| Stripe API degradation | P1 | Stripe status | Eng+Finance | Pause new checkouts if needed | Retry storm without backoff | Low | Checkout errors | Feature flag / lockdown | Status page | Y if prolonged |
| Reloadly/provider outage | P1 | Provider status, circuits | L28 owner | Kill switch dispatch per L21 | Manual resend without tooling | Duplicate send risk | Failed top-ups | Provider restore | Provider ticket | Y if mass |
| DNS/domain failure | P0 | Resolver errors | Infra | Failover record / TTL | Ad-hoc CNAME chains untested | MITM if misconfigured | Total unreachable | Revert DNS | DNS diff export | Y |
| High error rate after release | P1 | Logs, SLO | Eng | Roll back | Silence alerts only | Unknown | Poor UX | Redeploy | Error budget note | Y |
| Ledger/reconciliation drift | P0 | Recon alerts | Finance+Eng | Read-only analysis; freeze risky replay | SQL journal delete | **Critical** | Wrong balances | Forward fix via approved tools | Recon export hash | Y |
| Support incident spike | P2 | Ticket volume | Support | Bridge to eng | Promise refunds without process | Indirect | Trust hit | N/A | Ticket stats | N |
| Fraud/security during failover | P0 | L31 signals | Security | Tighten limits; possible lockdown | Disable all auth | Account risk | Blocks / friction | Post-incident review | Secure evidence | Y |

---

## References

- [`../runbooks/INCIDENT_SCENARIOS.md`](../runbooks/INCIDENT_SCENARIOS.md); L32 rollback/kill-switch doc when present on your branch
