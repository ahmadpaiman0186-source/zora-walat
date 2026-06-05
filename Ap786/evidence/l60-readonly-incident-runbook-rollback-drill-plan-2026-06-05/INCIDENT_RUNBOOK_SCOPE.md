# L-60 — Incident runbook scope

**Date:** 2026-06-05
**L-45 row:** 11 — Incident response runbook evidence
**L-60 action:** **PLAN ONLY**

---

## 1. Incident categories (planned coverage)

| Category | Prod services | Runbook section |
|----------|---------------|-----------------|
| **OBS-01** | Frontend availability (`zorawalat.com`) | Detection → triage → comms |
| **OBS-02** | API availability (`zora-walat-api`) | Log correlation → escalation |
| **OBS-03** | Alert routing failure | Better Stack / channel verification |
| **OBS-04** | Incident ack delay | Ack workflow → on-call |
| **PAY-01** | Webhook processing (read-only triage) | Enum review — **no payment mutation** |
| **DEP-01** | Bad deployment (read-only assessment) | Rollback **plan reference only** — no execute in L-60/L-61 default |

---

## 2. Severity levels

See [INCIDENT_SEVERITY_AND_ESCALATION_MATRIX.md](./INCIDENT_SEVERITY_AND_ESCALATION_MATRIX.md).

| SEV | Label | Response target (plan) |
|-----|-------|------------------------|
| SEV-1 | Critical prod outage | Immediate operator + escalation |
| SEV-2 | Degraded prod / partial outage | Operator triage within policy window |
| SEV-3 | Non-customer-facing anomaly | Document + schedule fix |
| SEV-4 | Informational / drill/tabletop | Read-only evidence capture |

---

## 3. Roles

See [OPERATOR_ROLES_AND_APPROVALS.md](./OPERATOR_ROLES_AND_APPROVALS.md).

| Role | Responsibility |
|------|----------------|
| **Owner** | Accountable for runbook accuracy (program) |
| **Operator** | Executes read-only capture / tabletop |
| **Reviewer** | Validates evidence filing (local review — not independent SRE cert) |

---

## 4. Read-only evidence required (future L-61)

| Artifact | Purpose |
|----------|---------|
| RUNBOOK-READONLY-001 | Runbook content or walkthrough record |
| INCIDENT-SEVERITY-MATRIX-001.md | Severity mapping filed |
| OPERATOR-APPROVAL-BOUNDARY-001.md | Approval boundaries documented |

Full list: [EVIDENCE_CAPTURE_REQUIREMENTS.md](./EVIDENCE_CAPTURE_REQUIREMENTS.md)

---

## 5. What cannot be claimed without real drill

| Claim | Requires |
|-------|----------|
| Runbook **operationally proven** | Executed walkthrough + evidence (L-61+) |
| Rollback **proven** | Separate rollback execution authorization + post-health PASS |
| Incident response SLO met | Live incident drill + ack evidence |
| FULLY_PROVEN | All L-45 rows PASS |

L-60 **does not** satisfy any of the above.

---

*End of incident runbook scope.*
