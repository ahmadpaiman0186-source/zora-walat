# L-60 — Incident severity and escalation matrix

**Date:** 2026-06-05
**Status:** **PLAN ONLY** — template for future L-61 `INCIDENT-SEVERITY-MATRIX-001.md`

---

## Severity matrix

| SEV | Condition (examples) | Operator action (read-only plan) | Escalation |
|-----|----------------------|----------------------------------|------------|
| **SEV-1** | Prod frontend or API hard down | Open observability + incident UI (read-only); file evidence | On-call per Better Stack policy — **no mutation** |
| **SEV-2** | Elevated errors / partial degradation | Log + dashboard correlation capture | Operator reviewer notified |
| **SEV-3** | Non-user-facing anomaly | Document in tabletop record | Scheduled review |
| **SEV-4** | Tabletop / evidence capture drill | Walkthrough runbook sections | None beyond local review |

---

## Escalation path (plan reference)

| Stage | Role | L-60/L-61 boundary |
|-------|------|-------------------|
| 1 | Operator detects (or simulates in tabletop) | Read-only |
| 2 | Operator captures evidence | No alert rule edit |
| 3 | Reviewer validates filing | Local review — not independent SRE cert |
| 4 | Program owner tracks gaps | Ap786 governance update only |

**On-call escalation is NOT fully proven** by this matrix alone.

---

## Mapping to L-45 rows

| L-45 row | Matrix support |
|----------|----------------|
| 3 Incident ack | SEV-1/2 reference ack workflow — evidence in L-59/L-61 |
| 4 On-call | Escalation column — evidence not filed in L-60 |
| 11 Runbook | All SEV rows reference runbook sections |

---

*End of incident severity and escalation matrix.*
