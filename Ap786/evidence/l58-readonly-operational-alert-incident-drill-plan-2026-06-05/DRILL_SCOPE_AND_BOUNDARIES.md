# L-58 — Drill scope and boundaries

**Date:** 2026-06-05
**Gate type:** **PLANNING ONLY** — no execution in L-58

---

## 1. L-58 scope (this filing session)

| In scope | Out of scope |
|----------|--------------|
| Ap786 drill plan documentation | Live drill execution |
| Pass/fail criteria definition | Dashboard access |
| Abort rules definition | Alert trigger / fire |
| Evidence capture requirements for L-59 | Incident acknowledgement |
| Future approval phrase filing | Deploy / redeploy |
| Preserving L-57 matrix status | Runtime / env / secret mutation |

---

## 2. Future drill scope (L-59+, when separately approved)

Future drill sessions authorized by **L-59 phrase only** must default to:

| Mode | Requirement |
|------|-------------|
| **Read-only / detect-only** | Operator views existing alert/incident/on-call UI; no config edits |
| **Tabletop acceptable** | Walkthrough of runbook without firing prod alerts |
| **Synthetic / scheduled test alert** | **FORBIDDEN** unless separate explicit phrase beyond L-59 |
| **Rollback drill** | **FORBIDDEN** in L-59; requires separate rollback authorization per L-45 row 10 |

---

## 3. L-57 matrix preservation

| Metric | Preserved value |
|--------|-----------------|
| L-45 PASS | **0 / 12** |
| PARTIAL | **7** |
| OPEN | **5** |

L-58 plan filing **does not** reclassify L-57 rows.

---

## 4. OPEN rows targeted by future drill (plan only)

| L-45 row | Current | Future drill may address |
|----------|---------|--------------------------|
| 1 Alert routing | **PARTIAL** | Fired-routing evidence (read-only capture) |
| 3 Incident acknowledgement | **PARTIAL / sample** | Ack-within-policy evidence |
| 4 On-call / escalation | **OPEN** | Escalation path screenshot |
| 11 Incident runbook | **OPEN** | Walkthrough record |

Rows 8, 9, 10 remain **outside** L-58/L-59 alert-incident drill scope unless separately authorized.

---

## 5. Boundary statements

| Statement | Status |
|-----------|--------|
| L-58 is a planning gate only | **YES** |
| Plan ≠ proof | **YES** |
| Plan ≠ execution | **YES** |
| Alert routing fully proven after L-58 | **NO** |
| Incident acknowledgement fully proven after L-58 | **NO** |
| On-call escalation fully proven after L-58 | **NO** |
| Incident runbook fully proven after L-58 | **NO** |
| Production observability FULLY_PROVEN | **false** |

---

*End of drill scope and boundaries.*
