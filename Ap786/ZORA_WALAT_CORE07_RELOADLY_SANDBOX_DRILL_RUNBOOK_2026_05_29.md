# CORE-07 Reloadly Sandbox Drill Runbook

**Date:** 2026-05-29  
**Status:** **RUNBOOK FILED — NOT EXECUTED**  
**Prerequisite:** Exact phrase `APPROVE CORE-07 RELOADLY SANDBOX DRILL ONLY` + completed pre-drill gate

---

## 0. Execution status

| Field | Value |
|-------|-------|
| Drill executed? | **NO** |
| Runbook used? | **NO** |
| Evidence filed? | **PENDING** (all CORE7-EV-* **OPEN**) |

---

## 1. Objectives (single session)

1. Confirm sandbox OAuth and provider mode (no live audience).  
2. Execute **at most one** sandbox/non-money provider diagnostic request (if approved in DR).  
3. Capture evidence per [evidence matrix](./ZORA_WALAT_CORE07_PROVIDER_DRILL_EVIDENCE_MATRIX_2026_05_29.md).  
4. Prove **no** customer impact, **no** real charge, **no** delivery without proof.  
5. Stop immediately on any [abort condition](./ZORA_WALAT_CORE07_ABORT_ROLLBACK_AND_STOP_CONDITIONS_2026_05_29.md).

---

## 2. Roles

| Role | Responsibility |
|------|----------------|
| **Program lead** | Issues or confirms approval phrase |
| **Operator** | Runs checklist, executes drill, captures evidence |
| **Engineering witness** | Confirms sandbox mode, redaction, no prod DB |
| **SRE / reliability** | Confirms CORE-05/06 guardrails observed post-drill |

---

## 3. Pre-flight (do not skip)

1. File [Operator approval decision record](./ZORA_WALAT_CORE07_OPERATOR_APPROVAL_DECISION_RECORD_2026_05_29.md) with phrase **verbatim**.  
2. Complete [Sandbox mode verification checklist](./ZORA_WALAT_CORE07_SANDBOX_MODE_VERIFICATION_CHECKLIST_2026_05_29.md).  
3. Confirm `RELOADLY_ENV` / audience = **sandbox** (screenshot or CLI output — redact secrets).  
4. Confirm Stripe **test** mode only if payment path touched — **prefer no payment path** in drill.  
5. Confirm drill uses **non-production** database or **no DB write** path.  
6. Assign evidence owner for each CORE7-EV-* row.  
7. Brief abort hand signal: operator says **“CORE-07 ABORT”** → immediate stop.

---

## 4. Drill steps (future — after approval)

| Step | Action | Stop if |
|------|--------|---------|
| S1 | Record start timestamp (UTC), operator id, environment label | Missing approval |
| S2 | Run sandbox OAuth / token health (read-only probe) | Live host detected |
| S3 | Record idempotency key to be used (single key) | Key missing / duplicate |
| S4 | **One** sandbox dispatch OR dry-run per env policy | Timeout / ambiguous response |
| S5 | Capture provider status + reference (if any) | Unexpected charge indicator |
| S6 | Run CORE-06 classify-only on proof bundle (fixture export) | ALLOW_DELIVERY without proof |
| S7 | Confirm order **not** FULFILLED / not delivered without proof | NPNS violation |
| S8 | File evidence matrix rows | Any CORE7-EV **FAIL** |
| S9 | Record end timestamp + conservative verdict | Operator uncertainty |

**Hard limit:** **One** provider attempt. No retry without new approval and new idempotency key.

---

## 5. Post-drill

| Action | Required |
|--------|----------|
| File all CORE7-EV evidence | YES |
| Update decision record outcome | YES |
| Optional CORE-04 fixture scan | Separate approval |
| Claim provider readiness | **FORBIDDEN** |
| Enable production provider | **FORBIDDEN** |

---

## 6. Rollback / abort reference

See [Abort, rollback, and stop conditions](./ZORA_WALAT_CORE07_ABORT_ROLLBACK_AND_STOP_CONDITIONS_2026_05_29.md).

---

## 7. Conservative verdict

Reloadly/provider sandbox drill **NOT EXECUTED**. Runbook is **planning only**. Provider proof **NOT VERIFIED**. Production / real-money / pilot / launch **NO-GO**.

---

*End of runbook.*
