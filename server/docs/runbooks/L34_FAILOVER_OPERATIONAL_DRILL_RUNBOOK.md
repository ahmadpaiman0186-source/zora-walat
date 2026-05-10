# L34 — Failover operational drill runbook (plan-only)

**Rule:** **No live production failover** from this document alone. Each drill requires **separate authorization**, staging or tabletop scope, and named owners.

**Companion:** [`../operations/L34_MULTI_REGION_FAILOVER_STRATEGY.md`](../operations/L34_MULTI_REGION_FAILOVER_STRATEGY.md), [`../operations/L34_DNS_AND_TRAFFIC_FAILOVER_PLAN.md`](../operations/L34_DNS_AND_TRAFFIC_FAILOVER_PLAN.md).

---

## Drill fields (each section)

**Preconditions** | **Safe environment** | **Forbidden environment** | **Injection (plan)** | **Expected behavior** | **Observability** | **Support/customer handoff** | **Data integrity checks** | **Abort** | **Rollback/cleanup** | **Evidence** | **Owner**

---

### 1. API region outage simulation

| Field | Content |
|-------|---------|
| Preconditions | Standby API URL or preview project documented |
| Safe | Staging: block primary via firewall rule **or** tabletop only |
| Forbidden | Production edge block without incident commander |
| Injection | Route test clients to standby; or discuss steps only |
| Expected | Traffic succeeds on standby when DB/Redis reachable |
| Observability | 5xx drop on standby URL |
| Support | L30 outage template when available |
| Integrity | `/ready` 200 on standby |
| Abort | Accidental prod DNS flip |
| Cleanup | Restore routing |
| Evidence | Routing diagram, timestamps |
| Owner | SRE + Eng |

---

### 2. Frontend outage simulation

| Field | Content |
|-------|---------|
| Preconditions | CDN/host documented |
| Safe | Staging static removal or tabletop |
| Forbidden | Prod CDN purge without approval |
| Injection | Simulate 404 on static bucket **staging** |
| Expected | API may still be healthy; comms clarify “app down” vs API |
| Observability | CDN status |
| Support | Status page update process |
| Integrity | N/A |
| Abort | Customer panic — pre-script message |
| Cleanup | Restore assets |
| Evidence | Screenshot |
| Owner | Eng |

---

### 3. DB restore-to-new-endpoint drill

| Field | Content |
|-------|---------|
| Preconditions | L25 staging restore procedure |
| Safe | **Dedicated staging Postgres** only |
| Forbidden | Prod restore without change record |
| Injection | Restore snapshot to new instance; update `DATABASE_URL` **on staging** |
| Expected | Migrations applied; app starts; recon read-only passes |
| Observability | Prisma connect, `/ready` |
| Support | N/A internal |
| Integrity | Full [`L34_DATA_INTEGRITY_POST_FAILOVER_CHECKLIST.md`](../operations/L34_DATA_INTEGRITY_POST_FAILOVER_CHECKLIST.md) |
| Abort | Restore corrupt or wrong snapshot |
| Cleanup | Tear down temp instance |
| Evidence | RPO actual, restore log |
| Owner | DBA + Eng |

---

### 4. Redis/queue disabled or degraded drill

| Field | Content |
|-------|---------|
| Preconditions | Staging Redis |
| Safe | Stop Redis container staging / wrong URL test |
| Forbidden | Prod `FLUSHALL` |
| Injection | Stop Redis; observe API |
| Expected | Documented degrade; enqueue failures logged |
| Observability | `queue_unavailable` patterns |
| Support | Fulfillment delay messaging if user-visible staging |
| Integrity | DB `QUEUED` vs Bull depth after recovery |
| Abort | Money-path duplicate attempt |
| Cleanup | Start Redis; drain |
| Evidence | Depth graphs |
| Owner | Eng |

---

### 5. Stripe webhook failover / endpoint decision drill

| Field | Content |
|-------|---------|
| Preconditions | Stripe **test** mode |
| Safe | Tabletop + test Dashboard change |
| Forbidden | Prod endpoint swap without dual control |
| Injection | Walk through: disable old → enable new → verify signing secret |
| Expected | Single active endpoint; deliveries succeed |
| Observability | Dashboard delivery panel |
| Support | “Payment pending” if brief gap |
| Integrity | No duplicate `evt` processing |
| Abort | Secret mismatch storm |
| Cleanup | Revert test endpoint |
| Evidence | Dashboard version ids |
| Owner | Eng + Finance |

---

### 6. Provider/Reloadly unavailable drill

| Field | Content |
|-------|---------|
| Preconditions | Sandbox |
| Safe | Sandbox outage tabletop or mock |
| Forbidden | Blocking prod Reloadly without comms |
| Injection | Kill switch outbound **staging** |
| Expected | Orders fail safe; no duplicate send |
| Observability | Circuit metrics |
| Support | Provider outage template |
| Integrity | Attempt rows terminal correctly |
| Abort | Forced retry outside admin path |
| Cleanup | Restore outbound |
| Evidence | Kill switch log |
| Owner | L28 owner |

---

### 7. DNS failover tabletop

| Field | Content |
|-------|---------|
| Preconditions | [`L34_DNS_AND_TRAFFIC_FAILOVER_PLAN.md`](../operations/L34_DNS_AND_TRAFFIC_FAILOVER_PLAN.md) |
| Safe | Conference-room walkthrough |
| Forbidden | Live TTL change during tabletop unless scheduled |
| Injection | Scenario cards: primary LB down |
| Expected | Ordered steps: health check → DB ok → DNS → Stripe webhook |
| Observability | Synthetic checks defined |
| Support | Comms tree |
| Integrity | Single writer verification |
| Abort | Skipping DB step |
| Cleanup | N/A |
| Evidence | Meeting notes |
| Owner | Infra lead |

---

### 8. Post-failover reconciliation drill

| Field | Content |
|-------|---------|
| Preconditions | Staging with synthetic stuck rows **or** read-only queries prod clone |
| Safe | Staging |
| Forbidden | Ad-hoc prod SQL fixes |
| Injection | Run recon scripts/admin views |
| Expected | REQUIRED items triaged |
| Observability | Recon output |
| Support | Escalation list |
| Integrity | Checklist PASS |
| Abort | Mass replay without review |
| Cleanup | Document open items |
| Evidence | Export hash |
| Owner | Finance + Eng |

---

### 9. Rollback-to-primary tabletop

| Field | Content |
|-------|---------|
| Preconditions | Successful **test** failover documented |
| Safe | Tabletop |
| Forbidden | Failback with two primaries |
| Injection | Stepwise failback script review |
| Expected | Freeze → verify single primary → DNS → webhooks |
| Observability | Same as cutover |
| Support | Maintenance window comms |
| Integrity | Re-run integrity checklist sample |
| Abort | Replication conflict |
| Cleanup | Document decision |
| Evidence | Signoff sheet |
| Owner | Eng lead + DBA |

---

## References

- [`../L24_MULTI_REGION_FAILOVER.md`](../L24_MULTI_REGION_FAILOVER.md), [`BACKUP_RESTORE_DRILL.md`](./BACKUP_RESTORE_DRILL.md)
