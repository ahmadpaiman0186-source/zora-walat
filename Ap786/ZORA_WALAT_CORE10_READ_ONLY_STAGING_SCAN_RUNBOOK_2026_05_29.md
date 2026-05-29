# CORE-10 Read-Only Staging Scan Runbook

**Date:** 2026-05-29  
**Status:** **RUNBOOK FILED — NOT EXECUTED**

---

## 0. Execution status

| Field | Value |
|-------|-------|
| Staging scan executed? | **NO** |
| Snapshot captured? | **NO** |
| CORE10-EV-* filed? | **ALL PENDING** |

---

## 1. Prerequisites (all required)

| # | Prerequisite | Evidence |
|---|--------------|----------|
| 1 | Phrase `APPROVE CORE-10 STAGING OBSERVABILITY GATE ONLY` | CORE10-EV-APPROVAL-GATE-001 |
| 2 | Phrase `APPROVE CORE-10 READ-ONLY STAGING SNAPSHOT CAPTURE ONLY` | CORE10-EV-APPROVAL-CAPTURE-001 |
| 3 | [No-mutation safety boundary](./ZORA_WALAT_CORE10_NO_MUTATION_SAFETY_BOUNDARY_2026_05_29.md) signed | CORE10-EV-NO-MUT-001 |
| 4 | [Snapshot requirements](./ZORA_WALAT_CORE10_RUNTIME_DOCTOR_STAGING_SNAPSHOT_REQUIREMENTS_2026_05_29.md) reviewed | CORE10-EV-SNAPSHOT-001 |
| 5 | Staging env identity confirmed | CORE10-EV-ENV-001 |
| 6 | Engineering + ops witness assigned | DR |

---

## 2. Roles

| Role | Duty |
|------|------|
| **Operator** | Export read-only snapshot; redact; run offline doctor |
| **Engineering witness** | Confirms staging/non-prod; no live Stripe/provider |
| **SRE** | Log/trace correlation per checklist |
| **Program lead** | Approves evidence ACCEPTED / REJECTED |

---

## 3. Capture session (future — after capture approval)

| Step | Action | Stop if |
|------|--------|---------|
| S1 | Record UTC start, env label, operator id | Missing capture approval |
| S2 | Confirm staging project URL / branch (redacted) | Production URL |
| S3 | Confirm Stripe **test** mode dashboard | Live mode |
| S4 | Confirm Reloadly **sandbox** (if provider rows exported) | Live audience |
| S5 | **Read-only** export: orders, webhooks, attempts, audit (see snapshot doc) | Write query detected |
| S6 | Redact secrets, PII, tokens, full URLs | Redaction incomplete |
| S7 | Save `staging_snapshot_redacted.json` (checksum recorded) | — |
| S8 | Run `zw-doctor reliability --fixture staging_snapshot_redacted.json` | — |
| S9 | Run CORE-05/06/08 classify on exported bundles (offline) | — |
| S10 | Correlate logs per [checklist](./ZORA_WALAT_CORE10_LOG_AUDIT_AND_TRACE_CORRELATION_CHECKLIST_2026_05_29.md) | Missing correlation |
| S11 | File [evidence matrix](./ZORA_WALAT_CORE10_OBSERVABILITY_EVIDENCE_MATRIX_2026_05_29.md) | Any FAIL |
| S12 | Sign conservative verdict | Critical finding unresolved |

**Hard rule:** **No** DB UPDATE/INSERT/DELETE. **No** provider POST. **No** webhook replay.

---

## 4. Post-session

| Action | Required |
|--------|----------|
| Store artifacts in evidence folder (no secrets) | YES |
| Update CORE10-DR outcome | YES |
| Claim staging proof VERIFIED | Only if all CORE10-EV **PASS** |
| Claim production readiness | **FORBIDDEN** |

---

## 5. Abort reference

See [Abort and stop conditions](./ZORA_WALAT_CORE10_ABORT_AND_STOP_CONDITIONS_2026_05_29.md).  
Operator halt phrase: **`CORE-10 SCAN ABORT`**.

---

*End of runbook.*
