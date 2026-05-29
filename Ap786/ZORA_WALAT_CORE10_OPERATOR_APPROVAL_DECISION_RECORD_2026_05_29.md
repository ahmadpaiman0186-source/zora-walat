# CORE-10 Operator Approval Decision Record

**Date:** 2026-05-29  
**Template:** CORE10-DR-001  
**Default:** **NO-GO**

---

## Decision record — CORE10-DR-___

| Field | Value |
|-------|-------|
| Record ID | CORE10-DR-___ |
| Date (UTC) | _pending_ |
| Environment target | Staging (documented label) |
| Operator | _pending_ |
| Engineering witness | _pending_ |

---

## Two-step authorization

### Step 1 — Gate review

| Field | Value |
|-------|-------|
| Phrase | `APPROVE CORE-10 STAGING OBSERVABILITY GATE ONLY` |
| Verbatim? | ☐ YES ☐ NO |
| Evidence | CORE10-EV-APPROVAL-GATE-001 |
| Authorizes | Gate review + evidence planning **only** |

### Step 2 — Read-only capture (required before scan)

| Field | Value |
|-------|-------|
| Phrase | `APPROVE CORE-10 READ-ONLY STAGING SNAPSHOT CAPTURE ONLY` |
| Verbatim? | ☐ YES ☐ NO |
| Evidence | CORE10-EV-APPROVAL-CAPTURE-001 |
| Authorizes | **One** read-only snapshot session |

**Does NOT authorize:** DB writes, provider calls, deploy, auto-repair apply, production access.

---

## Pre-capture attestation

| Check | YES / NO |
|-------|----------|
| [Safety boundary](./ZORA_WALAT_CORE10_NO_MUTATION_SAFETY_BOUNDARY_2026_05_29.md) read | |
| [Snapshot requirements](./ZORA_WALAT_CORE10_RUNTIME_DOCTOR_STAGING_SNAPSHOT_REQUIREMENTS_2026_05_29.md) | |
| [Runbook](./ZORA_WALAT_CORE10_READ_ONLY_STAGING_SCAN_RUNBOOK_2026_05_29.md) | |
| [Abort conditions](./ZORA_WALAT_CORE10_ABORT_AND_STOP_CONDITIONS_2026_05_29.md) | |
| CORE-04 local tests PASS (reference only) | |

---

## Outcome (default)

| Field | Value |
|-------|-------|
| CORE-10 gate | **FILED ONLY** |
| Staging scan executed | **NO** |
| Observability proof verified | **NO** |
| Runtime Doctor staging proof | **NOT VERIFIED** |

---

## Signatures

| Role | Name | Date |
|------|------|------|
| Program lead | | |
| Operator | | |
| Engineering witness | | |

---

*End of DR template.*
