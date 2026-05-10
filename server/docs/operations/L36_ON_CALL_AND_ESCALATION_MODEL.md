# L36 — On-call and escalation model

**Prelaunch note:** Names below are **role placeholders** until HR/ops assigns people and vendor roster (PagerDuty etc.) is created **with approval**.

---

## On-call roles

| Role | Responsibility |
|------|----------------|
| **Incident Commander** | Owns timeline, comms cadence, go/no-go on risky mitigations |
| **Backend / API owner** | Deploy, rollback, `/ready` diagnosis |
| **Money-path owner** | Stripe + ledger + recon coordination with Finance |
| **Provider / Reloadly owner** | L28 circuits, provider comms |
| **Stripe / webhook owner** | Dashboard deliveries, endpoint changes **with dual control** |
| **Database owner** | Neon, connection limits, restore coordination |
| **Infra / Vercel owner** | Platform, DNS cutover support with L35 |
| **Support lead** | Customer queue, L30 templates |
| **Security / fraud lead** | SEV classification, containment |
| **Communications owner** | External status (if product has public page) |

---

## Escalation levels

| Level | Meaning |
|-------|---------|
| **L1** | Primary on-call for service area |
| **L2** | Secondary / engineering lead |
| **L3** | Executive + legal/comms (SEV0 / regulatory) |

---

## Response time targets (initial)

| Severity | Page ack | Role-up |
|----------|----------|---------|
| SEV0 | 5 min | 15 min |
| SEV1 | 15 min | 30 min |
| SEV2 | 30 min | 2 h |
| SEV3 | 4 h | next business day |

---

## Handoff policy

- **Warm handoff:** 15-min overlap voice or shared doc  
- **Ticket** required: current state, next steps, **no secrets**

---

## Incident bridge policy

- SEV0/1: mandatory bridge channel  
- Recordings/transcripts per **legal** retention policy

---

## Timezone / coverage

- Document primary TZ and “follow-the-sun” **if** applicable — otherwise **best effort** with explicit gaps.

---

## Backup owner requirements

- Every **critical** role has **secondary** in calendar  
- **No single-person** Stripe webhook secret rotation

---

## Escalation if no owner responds

- SEV0/1: auto-escalate to **engineering lead** at T+15 min, **executive** at T+30 min (configurable)

---

## Evidence required

- PagerDuty/export or calendar export showing roster (redacted)  
- Post-incident list of participants

---

## References

- [`L36_INCIDENT_SEVERITY_RESPONSE_TARGETS.md`](./L36_INCIDENT_SEVERITY_RESPONSE_TARGETS.md)
