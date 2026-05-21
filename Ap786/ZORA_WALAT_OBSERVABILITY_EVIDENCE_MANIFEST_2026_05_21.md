# Zora-Walat — Observability Evidence Manifest

**Date:** 2026-05-21  
**Status:** All production proof rows **PENDING EVIDENCE** unless noted  
**Proof plan:** [ZORA_WALAT_PRODUCTION_OBSERVABILITY_PROOF_PLAN_2026_05_21.md](./ZORA_WALAT_PRODUCTION_OBSERVABILITY_PROOF_PLAN_2026_05_21.md)  
**Policy:** Real artifacts only — **no** fabricated screenshots, alerts, or uptime claims.

---

## 1. Evidence manifest purpose

This manifest is the **acceptance checklist** for upgrading Zora-Walat production observability from **PLAN ONLY / NOT PROVEN** to **PROVEN (production)**. Each row requires a filed artifact meeting §8 acceptance criteria. Until filed, external statements must use **NOT PROVEN** language.

---

## 2. Evidence categories

| Category | Code prefix | Count (initial) | Filed |
|----------|-------------|-----------------|-------|
| Dashboards | `OBS-DASH-` | 5 | 0 |
| Metrics / RED | `OBS-METRICS-` | 4 | 0 |
| Logs | `OBS-LOG-` | 4 | 0 |
| Traces | `OBS-TRACE-` | 3 | 0 |
| Alerts | `OBS-ALERT-` | 8 | 1 (CI only) |
| Synthetics | `OBS-SYNTH-` | 5 | 0 |
| SLO reports | `OBS-SLO-` | 1 | 0 |
| Money-path | `OBS-MONEY-` | 6 | 0 (staging partial) |
| Incidents / drills | `OBS-DRILL-` | 4 | 0 |
| Rollback | `OBS-RB-` | 2 | 0 |
| Self-repair governance | `OBS-GOV-` | 3 | 1 (docs) |
| Sign-off | `OBS-SIGN-` | 1 | 0 |

---

## 3. Required screenshot / video artifacts

| ID | Artifact | Description | Status |
|----|----------|-------------|--------|
| `OBS-DASH-PLATFORM-001` | PNG/PDF | Platform overview dashboard (sanitized) | **PENDING EVIDENCE** |
| `OBS-DASH-MONEY-001` | PNG/PDF | Money-path dashboard | **PENDING EVIDENCE** |
| `OBS-DASH-FULFILL-001` | PNG/PDF | Fulfillment dashboard | **PENDING EVIDENCE** |
| `OBS-DASH-SEC-001` | PNG/PDF | Security / auth dashboard | **PENDING EVIDENCE** |
| `OBS-TRACE-MONEY-001` | PNG | Trace waterfall checkout→webhook (IDs redacted) | **PENDING EVIDENCE** |
| `OBS-SYNTH-UPTIME-001` | PNG | Synthetic monitor history 7d | **PENDING EVIDENCE** |

**Not acceptable:** PR #35 frontend PNGs as substitutes for APM/dashboard proof.

---

## 4. Required dashboard artifacts

See §3. Additional requirements:

| Panel | Must show | Must not show |
|-------|-----------|---------------|
| Deploy version | Git SHA or deployment tag | Secrets |
| 5xx rate | Ratio by route | Customer PII |
| Webhook outcomes | success/fail counts | Raw Stripe payloads |
| Gate denials | Enum reasons | Full order IDs (suffix only) |

---

## 5. Required log artifacts

| ID | Artifact | Contents | Status |
|----|----------|----------|--------|
| `OBS-LOG-STRUCT-001` | `sample-api-access-redacted.jsonl` | 10 lines; correlation ID | **PENDING EVIDENCE** |
| `OBS-LOG-WH-001` | `sample-webhook-outcome-redacted.jsonl` | event_type, outcome enum | **PENDING EVIDENCE** |
| `OBS-LOG-GATE-001` | `sample-gate-denial-redacted.jsonl` | reason enum, order suffix | **PENDING EVIDENCE** |
| `OBS-LOG-OPERATOR-001` | `sample-operator-action-redacted.jsonl` | action enum only | **PENDING EVIDENCE** |

---

## 6. Required alert test artifacts

| ID | Alert | Proof | Status |
|----|-------|-------|--------|
| `OBS-ALERT-TEST-001` | A-02 or A-07 fired in drill | Pager/Slack screenshot + ticket ID | **PENDING EVIDENCE** |
| `OBS-ALERT-TEST-002` | A-04 simulated (staging) | Stripe test + log correlation | **PENDING EVIDENCE** |
| `OBS-ALERT-TEST-003` | A-05 gate denial (staging) | Enum capture | **PENDING EVIDENCE** |
| `OBS-ALERT-CI-001` | Guard failure blocks merge | CI log excerpt | **PROVEN (CI)** |

---

## 7. Required synthetic check artifacts

| ID | Check | Proof file | Status |
|----|-------|------------|--------|
| `OBS-SYNTH-001` | SYN-01 `/` prod | `synthetic-01-home-7d.png` | **PENDING EVIDENCE** |
| `OBS-SYNTH-002` | SYN-02 `/success` | `synthetic-02-success-7d.png` | **PENDING EVIDENCE** |
| `OBS-SYNTH-003` | SYN-03 `/cancel` | `synthetic-03-cancel-7d.png` | **PENDING EVIDENCE** |
| `OBS-SYNTH-004` | SYN-04 health | `synthetic-04-health-7d.png` | **PENDING EVIDENCE** |
| `OBS-SYNTH-005` | SYN-05 ready | `synthetic-05-ready-7d.png` | **PENDING EVIDENCE** |

---

## 8. Required incident drill artifacts

| ID | Drill | Record | Status |
|----|-------|--------|--------|
| `OBS-DRILL-SEV2-001` | API degradation tabletop | `drill-sev2-tabletop-YYYY-MM-DD.md` | **PENDING EVIDENCE** |
| `OBS-DRILL-SEV1-001` | Money-path staging simulation | `drill-sev1-money-staging-YYYY-MM-DD.md` | **PENDING EVIDENCE** |
| `OBS-DRILL-PIR-001` | Post-incident review (drill) | `pir-drill-YYYY-MM-DD.md` | **PENDING EVIDENCE** |
| `OBS-DRILL-COMMS-001` | Status comms template used | `comms-drill-redacted.md` | **PENDING EVIDENCE** |

---

## 9. Required rollback drill artifacts

| ID | Drill | Record | Status |
|----|-------|--------|--------|
| `OBS-RB-API-001` | API deploy rollback (staging or prod) | `rollback-api-YYYY-MM-DD.md` | **PENDING EVIDENCE** |
| `OBS-RB-FE-001` | Frontend deploy rollback | `rollback-frontend-YYYY-MM-DD.md` | **PENDING EVIDENCE** |

Must include: decision tree branch taken, verification commands (placeholder), health/synthetic pass after rollback.

---

## 10. Required money-path monitoring artifacts

| ID | Artifact | Status |
|----|----------|--------|
| `OBS-MONEY-WH-001` | Webhook success ratio panel + 7d export | **PENDING EVIDENCE** |
| `OBS-MONEY-DUP-001` | Duplicate webhook counter (prod or staging drill) | **PENDING EVIDENCE** |
| `OBS-MONEY-UNPAID-001` | Unpaid fulfillment gate denials panel | **PENDING EVIDENCE** |
| `OBS-MONEY-REFUND-001` | Refund anomaly panel (post L-11 prod) | **PENDING EVIDENCE** |
| `OBS-MONEY-STAGING-001` | L-4/L-5 staging proof reference | **PROVEN (staging)** — Ap786 L4/L5 |
| `OBS-MONEY-L13-001` | L-13 execution record | **BLOCKED** — not executed |

---

## 11. Required duplicate prevention artifacts

| ID | Artifact | Status |
|----|----------|--------|
| `OBS-DUP-WH-001` | Idempotency metric + staging L-4/L-5 reference | **PARTIAL** |
| `OBS-DUP-REFUND-001` | L-13 checklist completion | **BLOCKED** |
| `OBS-DUP-UX-001` | Optional: success-page duplicate warning spot-check | **PARTIAL** (PR #35 local PNG) |

---

## 12. Required no-pay-no-service artifacts

| ID | Artifact | Status |
|----|----------|--------|
| `OBS-NPS-GATE-001` | Gate denial metric sample (prod) | **PENDING EVIDENCE** |
| `OBS-NPS-STAGING-001` | L-9 cancel staging proof reference | **PROVEN (staging)** |
| `OBS-NPS-UX-001` | Cancel PNG (local evidence only) | **PARTIAL** — not prod monitor |

---

## 13. Required self-repair approval artifacts

| ID | Artifact | Status |
|----|----------|--------|
| `OBS-GOV-G10-001` | G-10 policy excerpt + ops signoff pack reference | **PROVEN (docs)** |
| `OBS-GOV-APPLY-001` | zw-doctor output showing apply disabled | **PENDING EVIDENCE** |
| `OBS-GOV-APPROVAL-001` | Ticket log for any self-heal apply (expect **none**) | **PENDING** (empty acceptable) |

---

## 14. Evidence naming convention

```text
{PREFIX}-{CATEGORY}-{SEQ}-{OPTIONAL_DATE}.{ext}

Examples:
  OBS-DASH-PLATFORM-001-2026-05-21.png
  OBS-LOG-STRUCT-001-redacted.jsonl
  OBS-DRILL-SEV2-001-2026-06-01.md
  OBS-RB-API-001-2026-06-15.md
```

| Rule | Requirement |
|------|-------------|
| Prefix | Always `OBS-` |
| Date | ISO `YYYY-MM-DD` when versioned |
| Redaction | `-redacted` in filename for logs |
| Secrets | Never in filename or body |

---

## 15. Evidence storage path proposal

```text
Ap786/evidence/observability-2026-05-21/
  README.md                          # folder rules (create when first artifact filed)
  dashboards/
  logs/                              # redacted samples only
  traces/
  alerts/
  synthetics/
  slo/
  drills/
  rollback/
  money-path/
  governance/
  INDEX_OBSERVABILITY_EVIDENCE.txt   # row-level filing log
```

**Until the folder exists:** all rows remain **PENDING EVIDENCE**. Do not mark **EVIDENCE FILED** without files in repo or linked sanitized external store (document link in INDEX only).

---

## 16. Evidence acceptance criteria

| Criterion | Required |
|-----------|----------|
| Authenticity | Artifact from real system run (date-stamped) |
| Sanitization | No secrets, JWTs, full PAN, raw webhooks with PII |
| Reproducibility | Steps to reproduce drill (placeholders OK) |
| Scope label | **production** vs **staging** vs **CI** explicit |
| Approval | OBS-G4 reviewer initials in INDEX |
| Claim safety | Filing does **not** imply QA PASS or production-ready |

---

## 17. What cannot be accepted as proof

| Rejected substitute | Why |
|---------------------|-----|
| PR #35 frontend PNGs | Local UI — not prod telemetry |
| Stakeholder sign-off pack alone | Governance docs — not live monitors |
| Observability plan / proof plan | Requirements — not implementation |
| Marketing uptime percentages | No underlying artifact |
| Synthetic local `127.0.0.1` checks | Not production URL |
| CI green badge only | Does not prove prod APM |
| Agent-generated fake dashboard PNGs | Forgery risk — forbidden |
| Self-healing apply logs without G-10 | Policy violation |

---

## 18. Pending evidence table (master)

| ID | Category | Title | Environment | Status |
|----|----------|-------|-------------|--------|
| `OBS-DASH-PLATFORM-001` | Dashboard | Platform overview | production | **PENDING EVIDENCE** |
| `OBS-DASH-MONEY-001` | Dashboard | Money path | production | **PENDING EVIDENCE** |
| `OBS-DASH-FULFILL-001` | Dashboard | Fulfillment | production | **PENDING EVIDENCE** |
| `OBS-DASH-SEC-001` | Dashboard | Security | production | **PENDING EVIDENCE** |
| `OBS-METRICS-RED-001` | Metrics | RED metrics export | production | **PENDING EVIDENCE** |
| `OBS-LOG-STRUCT-001` | Logs | Structured API access sample | production | **PENDING EVIDENCE** |
| `OBS-LOG-WH-001` | Logs | Webhook outcome sample | production | **PENDING EVIDENCE** |
| `OBS-LOG-GATE-001` | Logs | Gate denial sample | production | **PENDING EVIDENCE** |
| `OBS-TRACE-MONEY-001` | Traces | Money-path trace | production | **PENDING EVIDENCE** |
| `OBS-ALERT-TEST-001` | Alert | Pager drill | production | **PENDING EVIDENCE** |
| `OBS-SYNTH-UPTIME-001` | Synthetic | 7d uptime history | production | **PENDING EVIDENCE** |
| `OBS-SLO-REPORT-001` | SLO | 30d SLO report | production | **PENDING EVIDENCE** |
| `OBS-DRILL-SEV2-001` | Drill | SEV2 tabletop | process | **PENDING EVIDENCE** |
| `OBS-DRILL-SEV1-001` | Drill | SEV1 money staging | staging | **PENDING EVIDENCE** |
| `OBS-RB-API-001` | Rollback | API rollback drill | staging/prod | **PENDING EVIDENCE** |
| `OBS-RB-FE-001` | Rollback | Frontend rollback drill | staging/prod | **PENDING EVIDENCE** |
| `OBS-MONEY-WH-001` | Money | Webhook ratio panel | production | **PENDING EVIDENCE** |
| `OBS-MONEY-DUP-001` | Money | Duplicate counter | production | **PENDING EVIDENCE** |
| `OBS-NPS-GATE-001` | NPS | Gate denial metric | production | **PENDING EVIDENCE** |
| `OBS-GOV-APPLY-001` | Gov | zw-doctor apply disabled | CI/CLI | **PENDING EVIDENCE** |
| `OBS-SIGN-SRE-001` | Sign-off | SRE observability sign-off | process | **PENDING SIGNOFF** |
| `OBS-ALERT-CI-001` | Alert | Guard blocks merge | CI | **EVIDENCE FILED** |
| `OBS-GOV-G10-001` | Gov | G-10 policy documented | docs | **EVIDENCE FILED** |
| `OBS-MONEY-STAGING-001` | Money | L-4/L-5 staging | staging | **EVIDENCE FILED** (Ap786) |

**Summary:** **3** filed (CI/docs/staging reference) · **21+** pending production proof · **1** blocked (L-13).

---

*Observability Evidence Manifest · default PENDING EVIDENCE · not production-ready*
