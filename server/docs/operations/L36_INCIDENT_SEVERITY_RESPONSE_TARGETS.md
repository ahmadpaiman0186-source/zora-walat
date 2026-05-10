# L36 — Incident severity and response targets

Map to paging policy when alert sink exists (L29). **SEV** here is **internal**; may differ from vendor “priority.”

---

## SEV0 — existential / systemic money or safety crisis

| Field | Definition |
|-------|------------|
| **Customer impact** | Broad outage or inability to complete core flows |
| **Money-path impact** | Duplicate capture risk, ledger integrity threatened, or mass stuck paid |
| **Security impact** | Active exploit or confirmed data breach vector |
| **Provider impact** | Mass failure causing systemic non-delivery |
| **Detection source** | Synthetics, P0 alerts, finance hotline |
| **Page policy** | Page all critical roles + Incident Commander |
| **Response target** | Bridge live **≤ 15 min** |
| **Update cadence** | **≤ 30 min** until contained |
| **Required owner** | Incident Commander |
| **Allowed actions** | Lockdown, rollback, freeze cohort per policy |
| **Forbidden actions** | Silent SQL ledger edits, disabling webhook verification |
| **Evidence required** | Timeline, deploy ids, recon hash |
| **Closure criteria** | Containment + finance sign-off if money + postmortem scheduled |

---

## SEV1 — major degradation / partial money path

| Field | Definition |
|-------|------------|
| **Customer impact** | Significant subset affected |
| **Money-path impact** | Webhook failures, fulfillment SLA breach trend |
| **Security impact** | Elevated fraud ring |
| **Provider impact** | Regional/provider degradation |
| **Detection source** | Dashboards, logs, support spike |
| **Page policy** | Primary on-call + money-path owner |
| **Response target** | Ack **≤ 15 min** |
| **Update cadence** | **≤ 1 h** |
| **Required owner** | Backend or money-path owner |
| **Allowed actions** | Rollback, throttle, kill switches with approval |
| **Forbidden actions** | Unapproved prod schema rewind |
| **Evidence required** | Metric snapshots, Stripe delivery panel |
| **Closure criteria** | SLO trending to green + backlog cleared |

---

## SEV2 — elevated / localized

| Field | Definition |
|-------|------------|
| **Customer impact** | Isolated clusters |
| **Money-path impact** | Single-order class failures |
| **Security impact** | Suspicious pattern not yet systemic |
| **Provider impact** | Intermittent errors |
| **Detection source** | Alerts, support tickets |
| **Page policy** | Business hours page or Slack urgent |
| **Response target** | **≤ 30 min** ack |
| **Update cadence** | **≤ 4 h** |
| **Required owner** | L1 on-call |
| **Allowed actions** | Ticket, scale, minor config |
| **Forbidden actions** | Full lockdown without IC |
| **Evidence required** | Ticket id, log window |
| **Closure criteria** | Customer-visible fix or documented workaround |

---

## SEV3 — minor / single user

| Field | Definition |
|-------|------------|
| **Customer impact** | One or few users |
| **Money-path impact** | None systemic |
| **Security impact** | Low |
| **Provider impact** | N/A |
| **Detection source** | Support |
| **Page policy** | No page; queue |
| **Response target** | Per support SLA |
| **Update cadence** | Per L30 |
| **Required owner** | Support |
| **Allowed actions** | L30 runbooks |
| **Forbidden actions** | Production deploy for one ticket |
| **Evidence required** | Ticket |
| **Closure criteria** | Customer informed |

---

## SEV4 — informational

| Field | Definition |
|-------|------------|
| **Customer impact** | None / internal only |
| **Money-path impact** | None |
| **Security impact** | None |
| **Provider impact** | None |
| **Detection source** | Metrics noise, non-prod |
| **Page policy** | None |
| **Response target** | Best effort |
| **Update cadence** | Daily digest |
| **Required owner** | Team backlog |
| **Allowed actions** | Tune threshold |
| **Forbidden actions** | Paging |
| **Evidence required** | Optional |
| **Closure criteria** | Ticket closed or threshold updated |

---

## References

- [`L36_ON_CALL_AND_ESCALATION_MODEL.md`](./L36_ON_CALL_AND_ESCALATION_MODEL.md), [`../runbooks/INCIDENT_SCENARIOS.md`](../runbooks/INCIDENT_SCENARIOS.md)
