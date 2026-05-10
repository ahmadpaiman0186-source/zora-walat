# L30 — Support and recovery overview

**Gate:** L30 = support / recovery (customer workflows, incident recovery, evidence, escalation).  
**Status:** Documentation and taxonomy only — **not** runtime verified.

---

## Support scope

| In scope | Out of scope (hand off) |
|----------|-------------------------|
| Triage customer reports (payment, fulfillment, access) | Card-network dispute **submissions** (Stripe Dashboard + counsel) |
| Correlate orders using canonical APIs and Stripe Dashboard | Changing production env without change control |
| Document evidence (redacted) for tickets | Issuing refunds without authority matrix approval |
| Escalate to engineering / security / finance per playbook | Automated in-app refund product (Phase 1 gap — see `PHASE1_REFUND_AND_DISPUTE.md`) |
| Customer status updates within honest, non-technical language | “Silent” ledger fixes via ad-hoc SQL |

---

## Support case taxonomy (summary)

Full detail: [`L30_SUPPORT_TICKET_TAXONOMY.md`](./L30_SUPPORT_TICKET_TAXONOMY.md).

**Families:** `OUTAGE`, `PAYMENT`, `FULFILLMENT`, `REFUND_DISPUTE`, `PROVIDER`, `ACCESS`, `BALANCE`, `RECON_LEDGER`, `INFRA_RESTORE`, `FRAUD_SECURITY`, `GENERAL`.

---

## Owner / escalation matrix (template)

| Role | Owns |
|------|------|
| **L1 support** | First response, ID collection, template comms, routing |
| **L2 support / ops** | Stripe Dashboard correlation, recon list review, non-money overrides per authority matrix |
| **On-call engineer** | `/ready` degradation, deploy rollback recommendation, webhook/queue diagnosis |
| **Finance** | Refund approval above threshold, ledger mismatch sign-off |
| **Security (L31)** | Fraud rings, credential abuse, suspected account takeover |
| **Infra / DBA** | DB restore, Neon failover — per L25 drill |

Escalation clock: **P1** unacked **30 min** → on-call lead; **P0** **15 min** → incident commander.

---

## Severity levels (support-facing)

| Level | Meaning | Example |
|-------|---------|---------|
| **Sev-1** | Many customers blocked or money-path integrity risk | API down, mass unpaid-after-capture pattern |
| **Sev-2** | Elevated volume or SLA risk | Provider degraded, growing stuck queue |
| **Sev-3** | Single customer, restorable | One order stuck, OTP delay |
| **Sev-4** | Informational | Question on timing, no loss signal |

Map to engineering paging (P0–P3) per [`../observability/L29_ALERT_ROUTING_ADR.md`](../observability/L29_ALERT_ROUTING_ADR.md) when wiring alerts.

---

## Customer-impact categories

- **Availability:** cannot open app or pay.
- **Money movement:** charged, not credited / not fulfilled.
- **Trust:** duplicate charge concern, wrong amount shown.
- **Access:** cannot sign in, OTP/email not received.
- **Post-payment:** refund requested, dispute notice from bank.

---

## Dependencies on other L gates

| Gate | What support relies on |
|------|------------------------|
| **L25** | Backup/restore **credibility**; evidence that RPO/RTO rehearsed — [`../L25_BACKUP_RESTORE_READINESS.md`](../L25_BACKUP_RESTORE_READINESS.md), [`../runbooks/BACKUP_RESTORE_DRILL.md`](../runbooks/BACKUP_RESTORE_DRILL.md) |
| **L26** | Runtime environment health, `/ready` semantics, timeouts — unverified; support must not assume prod parity with docs until L26 **VERIFIED** |
| **L27** | Stripe webhook behavior, signature validation, dispute webhook hardening (PR #5) — support uses Dashboard + logs; HTTP 200 ≠ success for some failures — [`../observability/L29_DASHBOARD_LOG_QUERIES.md`](../observability/L29_DASHBOARD_LOG_QUERIES.md) |
| **L28** | Reloadly / provider availability, sandbox vs live — [`../runbooks/RELOADLY_PRODUCTION_REHEARSAL.md`](../runbooks/RELOADLY_PRODUCTION_REHEARSAL.md) |
| **L29** | Detection, synthetics, dashboards — [`../observability/`](../observability/) |

---

## What support must not assume before external readiness is verified

- Do **not** promise fulfillment timelines if L26/L28 are not verified for the target environment.
- Do **not** treat “payment succeeded in app” as “provider delivered airtime” without checking fulfillment terminal state and provider reference.
- Do **not** interpret webhook HTTP status alone — use Stripe delivery panel + structured logs when engineering provides access.
- Do **not** execute DLQ replay, manual fulfillment kick, or refunds without [`L30_MANUAL_RECOVERY_AUTHORITY_MATRIX.md`](./L30_MANUAL_RECOVERY_AUTHORITY_MATRIX.md).

---

## NO-GO conditions

- Refund or **goodwill credit** without documented approval and Stripe/org policy.
- Replaying webhooks or “forcing” fulfillment when `manualReviewRequired` or recon shows **duplicate risk** — see [`../runbooks/INCIDENT_SCENARIOS.md`](../runbooks/INCIDENT_SCENARIOS.md).
- Sharing **internal** service names, keys, stack traces, or full customer PII in public channels.
- Silencing money-path alerts to clear a ticket queue.
- Customer-facing commitment to **root cause** before engineering confirms.

---

## Related documents

- [`L30_SUPPORT_INCIDENT_RECOVERY.md`](../runbooks/L30_SUPPORT_INCIDENT_RECOVERY.md) — scenario runbooks  
- [`L30_CUSTOMER_COMMUNICATION_TEMPLATES.md`](./L30_CUSTOMER_COMMUNICATION_TEMPLATES.md)  
- [`PHASE1_INCIDENT_PLAYBOOK.md`](../PHASE1_INCIDENT_PLAYBOOK.md) — engineering quick paths  
- [`PHASE1_REFUND_AND_DISPUTE.md`](../PHASE1_REFUND_AND_DISPUTE.md)
