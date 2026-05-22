# Zora-Walat — Gate 3 Incident and Rollback Drill Evidence Checklist

**Date:** 2026-05-22
**Gate:** 3 — Incident / rollback drill evidence
**Runbook:** [ZORA_WALAT_INCIDENT_RESPONSE_AND_ROLLBACK_RUNBOOK_2026_05_21.md](./ZORA_WALAT_INCIDENT_RESPONSE_AND_ROLLBACK_RUNBOOK_2026_05_21.md)
**Capture pack:** [ZORA_WALAT_GATE3_PRODUCTION_OBSERVABILITY_EVIDENCE_CAPTURE_2026_05_22.md](./ZORA_WALAT_GATE3_PRODUCTION_OBSERVABILITY_EVIDENCE_CAPTURE_2026_05_22.md)

**Policy:** Drills are **PENDING EVIDENCE / NOT EXECUTED** until real records exist. **No** live-money, refund, replay, wallet credit, fulfillment, deploy, or self-healing **apply** during drills without explicit approval.

---

## 1. Purpose

Define **required drills**, safe execution constraints, expected artifacts, pass/fail criteria, and approval gates so incident response and rollback readiness can be proven before production launch.

---

## 2. Incident drill scope

| In scope | Out of scope |
|----------|--------------|
| Detection → alert → IC tabletop or controlled sim | Real customer money movement without G-04 |
| Staging Stripe test mode scenarios | Production live-money pilot |
| Read-only Super-System diagnostics | Self-healing **apply** |
| Sanitized drill records in `Ap786/evidence/` | Public status page commit without comms approval |

---

## 3. Rollback drill scope

| In scope | Out of scope |
|----------|--------------|
| Manual rollback of **approved** deploy in non-prod or approved prod window | Autonomous rollback from alerts |
| Post-rollback health + synthetic verification | Schema migration during incident |
| Filed `OBS-RB-*` artifacts | Rollback that triggers wallet credit |

---

## 4. Required drills

| Drill ID | Drill name | Primary severity | Environment | Status |
|----------|------------|------------------|-------------|--------|
| DRILL-G3-01 | Frontend outage | SEV2 | Staging or approved prod window | **NOT EXECUTED** |
| DRILL-G3-02 | API outage | SEV2 | Staging / sim | **NOT EXECUTED** |
| DRILL-G3-03 | Checkout degraded | SEV2 | Staging (test Stripe) | **NOT EXECUTED** |
| DRILL-G3-04 | Stripe webhook failure | SEV1 money | Staging test mode | **NOT EXECUTED** |
| DRILL-G3-05 | Duplicate transaction anomaly | SEV1 money | Staging L-4/L-5 extend | **PARTIAL** (harness only) |
| DRILL-G3-06 | No-pay-no-service enforcement | SEV1 money | Staging | **NOT EXECUTED** |
| DRILL-G3-07 | Wallet credit blocked-state | SEV1 money | Staging / tabletop | **NOT EXECUTED** |
| DRILL-G3-08 | Refund anomaly | SEV1 money | **BLOCKED** (L-12/L-13) | **NOT EXECUTED** |
| DRILL-G3-09 | DB connectivity degraded | SEV2 | Staging / sim | **NOT EXECUTED** |
| DRILL-G3-10 | Secrets / credential incident | SEV1 | Tabletop | **NOT EXECUTED** |
| DRILL-G3-11 | Rollback from bad deploy | SEV2 | Approved non-customer window | **NOT EXECUTED** |
| DRILL-G3-12 | Self-healing detect-only | SEV4 | CI / CLI read-only | **NOT EXECUTED** |

---

## 5. Drill evidence requirements

| Field | Required in drill record |
|-------|--------------------------|
| Drill ID | e.g. `DRILL-G3-04` |
| Date / time (UTC) | Actual execution timestamp |
| Environment | `staging` / `prod-approved-window` |
| Participants | Role placeholders only — **no invented names** |
| Scenario summary | What was simulated |
| Detection proof | Alert ID or manual detect log |
| IC actions | Contain steps taken |
| Forbidden ops confirmed | No refund/replay/credit/apply |
| Artifacts | Ticket ID, redacted logs, screenshots |
| Pass/fail | Per §8 criteria |
| Manifest link | `OBS-DRILL-*` row update |

---

## 6. Safe execution constraints

| Constraint | Rule |
|------------|------|
| Pre-approval | OBS-G2 for prod config; IC approval for prod drills |
| Stripe | Test mode only unless G-04 + OBS-G3 cleared |
| DB | No migration; no destructive writes in drill |
| Webhooks | No replay without explicit ticket |
| Money | No wallet credit; no fulfillment mutation |
| Deploy | Rollback drill only in approved window |
| Evidence | Sanitize all attachments |

---

## 7. Forbidden live-money operations

| Operation | During any drill |
|-----------|------------------|
| Stripe production charges | **Forbidden** |
| Real refunds | **Forbidden** |
| Webhook replay (prod) | **Forbidden** |
| Wallet credit | **Forbidden** |
| Service fulfillment (prod) | **Forbidden** |
| Controlled live-money pilot | **Forbidden** — **NO-GO** |
| Self-healing apply | **Forbidden** |

---

## 8. Drill approval requirements

| Drill type | Approval gate |
|------------|---------------|
| Staging money-path (DRILL-G3-03…07) | Engineering + Payments placeholder |
| Prod-window outage sim | IC + SRE + OBS-G2 |
| Prod money-path | **BLOCKED** — G-04 + OBS-G3 |
| Credential tabletop | Security Owner |
| Rollback (DRILL-G3-11) | IC + SRE |
| Detect-only (DRILL-G3-12) | Engineering Owner |

---

## 9. Expected artifacts

| Drill ID | Manifest / file |
|----------|-----------------|
| DRILL-G3-01 | `OBS-DRILL-FE-001` + alert receipt |
| DRILL-G3-02 | `OBS-DRILL-API-001` |
| DRILL-G3-04 | `OBS-ALERT-TEST-002` |
| DRILL-G3-05 | L-4/L-5 cross-ref + `OBS-ALERT-TEST-003` |
| DRILL-G3-06 | A-05 drill record |
| DRILL-G3-11 | `OBS-RB-001`, `OBS-RB-002` |
| DRILL-G3-12 | zw-doctor output (redacted) |

---

## 10. Pass / fail criteria

| Result | Criteria |
|--------|----------|
| **PASS** | Alert/detection within proposed SLO window; IC runbook followed; forbidden ops none; artifacts filed |
| **FAIL** | Missed detection; unauthorized mutation attempted; missing artifacts; unsanitized leak |
| **DEFERRED** | Approval not granted — document reason |
| **BLOCKED** | Live-money or prod money drill without G-04 |

**Current program result:** **NOT EXECUTED** — no PASS rows filed.

---

## 11. Incident drill checklist (detail)

| Row | Drill ID | Trigger simulation | Alert expected | Status |
|-----|----------|-------------------|----------------|--------|
| ID-01 | DRILL-G3-01 | Frontend 503/timeout | A-07 | **NOT EXECUTED** |
| ID-02 | DRILL-G3-02 | API 5xx inject / scale down | A-02 | **NOT EXECUTED** |
| ID-03 | DRILL-G3-03 | Checkout latency / fail | A-03 | **NOT EXECUTED** |
| ID-04 | DRILL-G3-04 | Webhook handler fail | A-04 | **NOT EXECUTED** |
| ID-05 | DRILL-G3-05 | Duplicate webhook replay | A-06 | **PARTIAL** (staging harness) |
| ID-06 | DRILL-G3-06 | Unpaid fulfill attempt | A-05 | **NOT EXECUTED** |
| ID-07 | DRILL-G3-07 | Wallet credit gate block | A-05 variant | **NOT EXECUTED** |
| ID-08 | DRILL-G3-08 | Refund anomaly | Proposed | **BLOCKED** |
| ID-09 | DRILL-G3-09 | DB pool exhausted sim | A-02 / ready fail | **NOT EXECUTED** |
| ID-10 | DRILL-G3-10 | Credential leak tabletop | G-01 process | **NOT EXECUTED** |
| ID-12 | DRILL-G3-12 | zw-doctor strict run | A-08 (CI analog) | **NOT EXECUTED** |

---

## 12. Rollback drill checklist (detail)

| Row | Step | Verification | Status |
|-----|------|--------------|--------|
| RB-01 | Identify bad deploy SHA | Deploy log | **NOT EXECUTED** |
| RB-02 | IC declares rollback | Ticket ID | **NOT EXECUTED** |
| RB-03 | Execute manual rollback | Platform procedure | **NOT EXECUTED** |
| RB-04 | Verify `/api/health` + `/ready` | Synthetic green | **NOT EXECUTED** |
| RB-05 | Verify 5xx rate normalized | Dashboard | **NOT EXECUTED** |
| RB-06 | File `OBS-RB-001` + `OBS-RB-002` | Manifest | **PENDING EVIDENCE** |

---

## 13. Current status

| Item | Status |
|------|--------|
| All DRILL-G3-* (prod) | **NOT EXECUTED** |
| DRILL-G3-05 staging harness | **PARTIAL** — not IC drill record |
| Rollback drills | **PENDING EVIDENCE** |
| IR runbook exercised | **NOT PROVEN** |
| Gate 3 drill exit | **PENDING EVIDENCE** |

---

## 14. Final verdict

| Verdict | Value |
|---------|-------|
| **Incident drills** | **PENDING EVIDENCE / NOT EXECUTED** |
| **Rollback drills** | **PENDING EVIDENCE / NOT EXECUTED** |
| **Gate 3 (drill plane)** | **PENDING EVIDENCE** |
| **Production observability** | **PLAN ONLY / NOT PROVEN** |
| **Production launch** | **NO-GO** |
| **Real-money launch** | **NO-GO** |
| **Controlled live-money pilot** | **NO-GO** |
| **Self-healing apply** | **GATED / NOT ENABLED** |

**Next recommended action:** Schedule staging drills DRILL-G3-01…07 and tabletop DRILL-G3-10 with placeholder roles; file artifacts; then seek approvals before any prod-window or live-money drill. Maintain **NO-GO** until pass records exist.

---

*Gate 3 Drill Checklist · drills NOT EXECUTED · not production-ready*
