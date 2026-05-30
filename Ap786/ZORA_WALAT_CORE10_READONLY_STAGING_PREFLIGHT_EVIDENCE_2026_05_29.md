# CORE-10 Read-Only Staging Snapshot Preflight Evidence

**Date:** 2026-05-29  
**Track:** CORE-10 — Staging Runtime Doctor + Observability Gate  
**Phase:** **PREFLIGHT ONLY** — capture **NOT EXECUTED**  
**Scope:** Ap786 evidence only · **no** runtime/deploy/env/workflow changes in this pack  

---

## 1. Git state at preflight filing

| Field | Value |
|-------|-------|
| **Current git branch** | `evidence/core10-readonly-staging-snapshot-preflight-2026-05-29` |
| **Branch base** | `main` @ `0efac59` (Merge PR #115 — CORE-12 reconciliation) |
| **Upstream** | Branch created locally; not yet pushed (preflight pack) |

### Git status summary (preflight session)

| Item | Value |
|------|-------|
| Pre-preflight `main` | Clean · synced with `origin/main` |
| Staging snapshot captured? | **NO** |
| CORE10-EV capture rows filed? | **NO** (all **PENDING**) |
| Server/app/web/workflow changes | **NONE** (Ap786 only) |

---

## 2. Preflight attestations (this session)

| # | Attestation | Status |
|---|-------------|--------|
| A1 | This document is **preflight only** | **CONFIRMED** |
| A2 | **No** staging snapshot was captured | **CONFIRMED** |
| A3 | **No** external APIs were called (Stripe, Reloadly, Vercel, staging HTTP, provider) | **CONFIRMED** |
| A4 | **No** Vercel deploy/redeploy | **CONFIRMED** |
| A5 | **No** Stripe replay/resend | **CONFIRMED** |
| A6 | **No** provider execution | **CONFIRMED** |
| A7 | **No** DB writes (staging or production) | **CONFIRMED** |
| A8 | **No** env edits | **CONFIRMED** |
| A9 | **No** secrets printed or filed in this pack | **CONFIRMED** |
| A10 | **No** mutation of orders, wallets, payments, provider attempts, webhooks, or audit records | **CONFIRMED** |
| A11 | **No** auto-repair apply / self-healing apply | **CONFIRMED** |
| A12 | **No** production or real-money action | **CONFIRMED** |
| A13 | **No** command that changes staging state was run for capture | **CONFIRMED** |

---

## 3. CORE-10 pack inspected (existing Ap786 — unchanged by preflight)

| Document | Role | Execution status |
|----------|------|------------------|
| [Staging runtime doctor observability gate](./ZORA_WALAT_CORE10_STAGING_RUNTIME_DOCTOR_OBSERVABILITY_GATE_2026_05_29.md) | Gate definition | **FILED ONLY** |
| [Read-only staging scan runbook](./ZORA_WALAT_CORE10_READ_ONLY_STAGING_SCAN_RUNBOOK_2026_05_29.md) | Capture procedure | **NOT EXECUTED** |
| [Observability evidence matrix](./ZORA_WALAT_CORE10_OBSERVABILITY_EVIDENCE_MATRIX_2026_05_29.md) | CORE10-EV-* | **PENDING** |
| [Runtime doctor staging snapshot requirements](./ZORA_WALAT_CORE10_RUNTIME_DOCTOR_STAGING_SNAPSHOT_REQUIREMENTS_2026_05_29.md) | Export schema | Spec only |
| [Log/audit/trace checklist](./ZORA_WALAT_CORE10_LOG_AUDIT_AND_TRACE_CORRELATION_CHECKLIST_2026_05_29.md) | Correlation | **PENDING** |
| [No-mutation safety boundary](./ZORA_WALAT_CORE10_NO_MUTATION_SAFETY_BOUNDARY_2026_05_29.md) | Hard prohibitions | Active |
| [Abort and stop conditions](./ZORA_WALAT_CORE10_ABORT_AND_STOP_CONDITIONS_2026_05_29.md) | T1..T12 | Reference |
| [Approval decision record](./ZORA_WALAT_CORE10_OPERATOR_APPROVAL_DECISION_RECORD_2026_05_29.md) | Two-step DR | Template |
| [Conservative verdict](./ZORA_WALAT_CORE10_CONSERVATIVE_VERDICT_2026_05_29.md) | Track verdict | **NO-GO** |

**Related:** CORE-04 local doctor tests do **not** substitute staging proof ([CORE-12 reconciliation](./ZORA_WALAT_CORE12_FINAL_CORE_EVIDENCE_RECONCILIATION_2026_05_29.md)).

---

## 4. Two-step approval (future — not satisfied by preflight)

| Step | Phrase | Authorizes | Preflight status |
|------|--------|------------|------------------|
| 1 | `APPROVE CORE-10 STAGING OBSERVABILITY GATE ONLY` | Gate review + planning | **NOT RECORDED** |
| 2 | `APPROVE CORE-10 READ-ONLY STAGING SNAPSHOT CAPTURE ONLY` | **One** read-only snapshot session | **NOT RECORDED** |

**Required phrase for future capture execution:**

```
APPROVE CORE-10 READ-ONLY STAGING SNAPSHOT CAPTURE ONLY
```

Preflight filing does **not** substitute Step 1 or Step 2.

---

## 5. Commands proposed for future read-only capture (NOT EXECUTED)

All commands below are **proposed only**. **None** were run as part of this preflight pack.

### 5.1 Pre-capture local sanity (optional — does not prove staging)

| # | Proposed command | Purpose | Mutates staging? |
|---|------------------|---------|------------------|
| P1 | `npm --prefix server run test:runtime-doctor` | CORE-04 local fixture PASS reference | **NO** |
| P2 | `node server/tools/zw-doctor.mjs reliability --fixture server/test/fixtures/runtimeDoctor/sample.json` | Offline doctor smoke on sample fixture | **NO** |

### 5.2 Capture session (after Step 2 phrase + DR — runbook S1–S12)

| # | Proposed action / command | Purpose | Mutates staging? |
|---|---------------------------|---------|------------------|
| C1 | Record UTC start, env label, operator id in CORE10-DR | Session audit | **NO** |
| C2 | Confirm staging project URL / branch (redacted in evidence) | Env guard T1 | **NO** |
| C3 | Confirm Stripe **test** mode (dashboard check) | T5 guard | **NO** |
| C4 | Confirm Reloadly **sandbox** if provider rows exported | T4 guard | **NO** |
| C5 | **Read-only** export per [snapshot requirements](./ZORA_WALAT_CORE10_RUNTIME_DOCTOR_STAGING_SNAPSHOT_REQUIREMENTS_2026_05_29.md) → `staging_snapshot_redacted.json` | Snapshot input | **NO** (must be SELECT/read-only only) |
| C6 | `node server/tools/zw-doctor.mjs reliability --fixture <evidence-path>/staging_snapshot_redacted.json` | Offline CORE-04 scan on redacted export | **NO** |
| C7 | Offline classify exported bundles with CORE-05/06/08 modules (no live wire) | NPNS / idempotency / dry-run signals | **NO** |
| C8 | Complete [log/audit/trace checklist](./ZORA_WALAT_CORE10_LOG_AUDIT_AND_TRACE_CORRELATION_CHECKLIST_2026_05_29.md) | CORE10-EV correlation rows | **NO** |
| C9 | File [observability evidence matrix](./ZORA_WALAT_CORE10_OBSERVABILITY_EVIDENCE_MATRIX_2026_05_29.md) rows | Evidence ACCEPTED/REJECTED | **NO** |
| C10 | Sign CORE10-DR + update conservative verdict if warranted | Governance | **NO** |

### 5.3 Explicitly forbidden during capture (never propose as preflight/capture steps)

| Forbidden | Examples |
|-----------|----------|
| DB writes | `INSERT` / `UPDATE` / `DELETE`, Prisma migrate on staging |
| Provider execution | Reloadly live/sandbox POST fulfill |
| Stripe mutation | Replay, resend, new Checkout in capture session |
| Deploy | `npm run deploy:staging`, Vercel redeploy |
| Apply paths | `zw-doctor` `--apply`, auto-repair apply, self-healing apply |
| Unredacted filing | Filing snapshot with secrets, JWTs, raw webhooks |

---

## 6. Abort conditions before future capture

Stop **before** export if any trigger applies ([full list](./ZORA_WALAT_CORE10_ABORT_AND_STOP_CONDITIONS_2026_05_29.md)):

| # | Condition | Action |
|---|-----------|--------|
| T1 | Environment ambiguity (cannot confirm staging) | **Abort** before export |
| T2 | Live credential suspicion | **Abort** |
| T3 | Production DB connection risk | **Abort** |
| T4 | Provider / live-mode ambiguity | **Abort** |
| T5 | Stripe live-mode ambiguity | **Abort** |
| T6 | Missing redaction plan | **Abort** |
| T7 | Any mutation path detected (write query, POST) | **Abort** + incident |
| T8 | Missing capture approval phrase (Step 2) | **Do not export** |
| T9 | Critical doctor finding not understood | Hold verdict |
| T10 | Audit/log correlation plan missing | Do not claim PASS |
| T11 | Operator uncertainty | **Abort** |
| T12 | Vercel/log access without approval | **Abort** |

Operator halt phrase: **`CORE-10 SCAN ABORT`**.

---

## 7. Conservative verdict

| Item | Status |
|------|--------|
| CORE-10 preflight | **FILED ONLY** |
| Staging scan executed | **NO** |
| Staging snapshot captured | **NO** |
| Runtime doctor staging proof | **NOT VERIFIED** |
| Observability proof | **NOT VERIFIED** |
| Production-ready | **NO** |
| Real-money-ready | **NO** |
| Controlled pilot approved | **NO** |
| Market launch | **NO-GO** |

**Verdict sentence (canonical):**

> CORE-10 preflight **FILED ONLY**; staging scan **NOT EXECUTED**; runtime doctor staging proof **NOT VERIFIED**; observability proof **NOT VERIFIED**; production / real-money / pilot / launch **NO-GO**.

---

## 8. Evidence IDs (preflight)

| ID | Requirement | Status |
|----|-------------|--------|
| CORE10-EV-PREFLIGHT-001 | Preflight evidence doc filed | **PASS** (this document) |
| CORE10-EV-APPROVAL-GATE-001 | Step 1 phrase recorded | **PENDING** |
| CORE10-EV-APPROVAL-CAPTURE-001 | Step 2 phrase recorded | **PENDING** |
| CORE10-EV-SNAPSHOT-001 | Redacted snapshot filed | **PENDING** |
| CORE10-EV-* (matrix) | Observability rows | **PENDING** |

---

*End of preflight evidence.*
