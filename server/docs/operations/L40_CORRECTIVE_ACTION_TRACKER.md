# L40 — Corrective action tracker

Living table for actions stemming from soft launch, incidents, audits, and reviews. Copy rows into your issue tracker; keep this doc as **rollup** or export snapshot.

| Action id | Source | Category | Severity | Owner | Due date | Status | Linked PR/issue | Evidence | Closure criteria |
|-----------|--------|----------|----------|-------|----------|--------|------------------|----------|------------------|
| CA-L40-001 | Postmortem / metrics | **Runtime reliability** | | | | Open / Done | | Redacted metrics slice | Error rate ≤ target for 7d |
| CA-L40-002 | Incident / review | **Payment / webhook** | | | | Open / Done | | Webhook delivery stats | No unsigned replay; idempotency tests pass |
| CA-L40-003 | Provider review | **Provider / fulfillment** | | | | Open / Done | | Sandbox or prod metrics (redacted) | p95 latency / error within SLA |
| CA-L40-004 | Support surge | **Support / recovery** | | | | Open / Done | | Ticket export (redacted) | Contact rate below threshold |
| CA-L40-005 | Feedback themes | **UX** | | | | Open / Done | | User research summary | Shipped + measured improvement |
| CA-L40-006 | Audit / incident | **Fraud / security** | | | | Open / Done | | Security ticket id | Control verified / retested |
| CA-L40-007 | Observability gap | **Observability** | | | | Open / Done | | Dashboard name + alert id | Alert fires in drill |
| CA-L40-008 | Governance finding | **Release governance** | | | | Open / Done | | Decision log ref | Matrix / checklist updated |
| CA-L40-009 | Backup drill gap | **Backup / restore** | | | | Open / Done | | Drill record | RPO/RTO evidence current |
| CA-L40-010 | Finance review | **Cost / margin** | | | | Open / Done | | Margin report (redacted) | Unit economics within guardrails |

**Status:** Open | In progress | Blocked | Done  
**Severity:** Critical | High | Medium | Low  

## Related

- [L40_INCIDENT_POSTMORTEM_TEMPLATE.md](./L40_INCIDENT_POSTMORTEM_TEMPLATE.md)
- [L40_CONTINUOUS_IMPROVEMENT_GOVERNANCE.md](./L40_CONTINUOUS_IMPROVEMENT_GOVERNANCE.md)
