# L-4 — CORE-10 Read-Only Capture Authorization Decision Gate

**Date:** 2026-05-30  
**Roadmap:** Zora-Walat L-1 … L-150 Global Engineering / Super-System  
**L-step:** **L-4** — CORE-10 Read-Only Capture **Authorization Decision Gate**  
**Branch (this pack):** `docs/l4-core10-readonly-capture-authorization-decision-2026-05-30`  
**Base:** `558e6ff` — Merge PR #118 (L-3 CORE-10 capture readiness)  

---

## 1. L-step identity

| Field | Value |
|-------|-------|
| L-step | **L-4** |
| Title | CORE-10 Read-Only Capture Authorization Decision Gate |
| Date | 2026-05-30 |
| Relationship to PR #118 / L-3 | PR #118 merged [L-3 execution readiness](./ZORA_WALAT_L3_CORE10_READONLY_STAGING_SNAPSHOT_EXECUTION_READINESS_2026_05_30.md); L-4 adds **policy gate** only — **does not** authorize capture |
| Prior CORE-10 packs | PR #116 preflight · PR #117 capture scaffold/blocker |

---

## 2. Mission

Define a **safe, fail-closed authorization decision gate** that must be satisfied **before** any future CORE-10 read-only staging snapshot capture session. Preserve audit-ready, rollback-safe Super-System posture.

**This L-4 task is NOT:**
- Authorization to capture staging data
- Authorization to access staging, Vercel, Stripe, Reloadly, provider systems, DB, or runtime logs
- Authorization to run external read-only probes

**This L-4 task IS:**
- Documentation and governance for **how** future capture may be authorized
- A strict decision record template and policy boundary

---

## 3. Scope

| In scope | Out of scope |
|----------|----------------|
| Authorization decision record (policy) | Staging snapshot capture |
| Go/no-go matrix for future capture | External system access |
| Witness and evidence requirements (spec) | Server/app/runtime changes |
| Redaction and abort rules | Env / Vercel / workflow / package edits |
| Risk register and dependencies | Deploy / redeploy |
| Linkage to existing CORE-10 runbook/manifest | DB / payment / provider mutation |

---

## 4. Authorization rule

### 4.1 Future capture phrase (verbatim)

```
APPROVE CORE-10 READ-ONLY STAGING SNAPSHOT CAPTURE ONLY
```

### 4.2 What does **not** constitute authorization

| Situation | Authorization? |
|-----------|----------------|
| Phrase appears in Ap786 docs (including this L-4 gate) | **NO** |
| Phrase appears in runbook, README, or policy tables | **NO** |
| Branch name contains `authorized-capture` | **NO** |
| L-3 or L-4 pack filed | **NO** |
| PR #118 merged | **NO** |

### 4.3 What **does** constitute authorization (future only)

| Requirement | Mandatory |
|-------------|-----------|
| Phrase appears as **separate explicit operator instruction** in authorizing channel (ticket, signed DR, or designated ops message) | **YES** |
| Phrase recorded verbatim in [CORE10-DR](./ZORA_WALAT_CORE10_OPERATOR_APPROVAL_DECISION_RECORD_2026_05_29.md) | **YES** |
| Step 1 gate phrase also recorded if program requires two-step flow | **YES** (per runbook) |
| Engineering + ops witness assigned before export | **YES** |

### 4.4 L-4 session authorization status

| Field | Value |
|-------|-------|
| Capture phrase granted in **this** L-4 task? | **NO** — documentation only |
| L-4 authorization gate for future capture | **FILED** (policy) |
| Actual CORE-10 capture authorized? | **NO** |

---

## 5. Allowed future actions (after explicit operator authorization only)

After **separate** operator authorization (not L-4), the **minimum necessary** actions:

| # | Action | Mutates staging? |
|---|--------|------------------|
| F1 | Read-only staging snapshot export per [requirements](./ZORA_WALAT_CORE10_RUNTIME_DOCTOR_STAGING_SNAPSHOT_REQUIREMENTS_2026_05_29.md) | **NO** (SELECT/read-only only) |
| F2 | Redact secrets, tokens, keys, PII; file redacted JSON + checksum | **NO** |
| F3 | Offline Runtime Doctor: `node server/tools/zw-doctor.mjs reliability --fixture <redacted-staging-snapshot.json>` | **NO** |
| F4 | Offline CORE-05/06/08 classify on exported bundles (no live wire) | **NO** |
| F5 | Observability correlation per [checklist](./ZORA_WALAT_CORE10_LOG_AUDIT_AND_TRACE_CORRELATION_CHECKLIST_2026_05_29.md) | **NO** |
| F6 | Update [evidence manifest](./ZORA_WALAT_CORE10_READONLY_STAGING_SNAPSHOT_CAPTURE_MANIFEST_2026_05_30.md) and CORE10-EV rows | **NO** |
| F7 | File evidence through dedicated Ap786 PR (no secrets in git) | **NO** |

---

## 6. Prohibited actions (always — including after future authorization)

| # | Prohibited |
|---|------------|
| X1 | Deploy / redeploy |
| X2 | Env / config / secret / credential edits |
| X3 | Stripe replay / resend / test event (unless **separately** approved program) |
| X4 | Reloadly or any provider API execution |
| X5 | DB mutation (INSERT/UPDATE/DELETE/migrate) |
| X6 | Wallet / order / payment / settlement / ledger / card / payout / customer state mutation |
| X7 | Production or live-mode action |
| X8 | Self-healing / auto-repair apply (`--apply`, Class C apply) |
| X9 | Broad staging probing beyond minimum read-only export window |
| X10 | Uncontrolled logging of secrets, tokens, or raw PII into docs or git |

---

## 7. Witness and evidence requirements (future capture session)

| Requirement | Detail |
|-------------|--------|
| Operator identity | Record in CORE10-DR (no fabricated names) |
| UTC timestamp | Session start/end |
| Branch / repo ref | Evidence PR branch name |
| Command transcript | Redacted; no secrets in Ap786 |
| Screenshots | **Redacted only** if used; **no fabricated** screenshots |
| Evidence manifest | Update [manifest](./ZORA_WALAT_CORE10_READONLY_STAGING_SNAPSHOT_CAPTURE_MANIFEST_2026_05_30.md) |
| Before attestation | No-mutation boundary signed per [safety doc](./ZORA_WALAT_CORE10_NO_MUTATION_SAFETY_BOUNDARY_2026_05_29.md) |
| After attestation | Confirm no writes; abort phrase not required if clean completion |

---

## 8. Data handling and redaction rules

| Data class | Rule |
|------------|------|
| Secrets / API keys | **Never** commit; redact before doctor run |
| JWTs / session tokens | Strip from exports and docs |
| Account identifiers | Redact or hash per policy |
| Customer PII | Minimize; opaque pilot ids preferred |
| Provider credentials | Exclude from snapshot and docs |
| Raw webhook bodies | Redact; no full payloads in Ap786 |
| Sensitive operational URLs | Redact host/path tokens |

**Do not** copy sensitive raw logs into markdown evidence files.

---

## 9. Abort rules (future capture — immediate stop)

| # | Stop condition |
|---|----------------|
| A1 | Secrets appear in export or terminal output |
| A2 | Any mutation risk (write SQL, POST, migrate) |
| A3 | Command or tool requests write access |
| A4 | Authorization context unclear (phrase not verbatim in DR) |
| A5 | External dashboard prompts deploy / redeploy / settings edit |
| A6 | Any payment / provider / DB operation requested during session |
| A7 | T1–T12 from [abort doc](./ZORA_WALAT_CORE10_ABORT_AND_STOP_CONDITIONS_2026_05_29.md) |

Operator halt phrase: **`CORE-10 SCAN ABORT`**.

---

## 10. Go / no-go matrix

| Gate | Question | L-4 (this pack) | Future capture (after explicit auth) |
|------|----------|-----------------|--------------------------------------|
| G1 | L-4 docs gate filed? | **GO** | Prerequisite **GO** when merged |
| G2 | Separate operator capture phrase? | **NO-GO** | Requires **GO** |
| G3 | CORE-10 read-only capture executed? | **NO-GO** | Requires evidence PR |
| G4 | Runtime Doctor staging proof verified? | **NO-GO** | Requires offline PASS/WARN filed |
| G5 | Observability proof verified? | **NO-GO** | Requires correlation PASS rows |
| G6 | Production readiness? | **NO-GO** | **NO-GO** until program gates |
| G7 | Real-money readiness? | **NO-GO** | **NO-GO** |
| G8 | Controlled pilot? | **NO-GO** | **NO-GO** |
| G9 | Market launch? | **NO-GO** | **NO-GO** |

---

## 11. Risk register

| ID | Risk | Mitigation |
|----|------|------------|
| L4-R-01 | Accidental external access during “doc” task | L-4: **no** access; agent policy |
| L4-R-02 | Accidental mutation during export | Read-only scripts; witness; T7 abort |
| L4-R-03 | Sensitive data exposure in PR | Redaction gate before git add |
| L4-R-04 | False production-readiness claim | Conservative verdict; no PASS fabrication |
| L4-R-05 | Vercel preview vs staging API confusion | Env label + T1 abort |
| L4-R-06 | Authorization phrase misinterpretation | This L-4 gate; separate operator instruction |
| L4-R-07 | Insufficient observability proof | CORE10-EV rows remain PENDING until filed |
| L4-R-08 | Incomplete NPNS / duplicate proof | Do not claim live; LOCAL_FIXTURE ≠ staging |
| L4-R-09 | L-4 mistaken for capture approval | **This document §4** |

**Risks introduced by L-4 pack:** **None** (Ap786 only).

---

## 12. Dependencies

| Dependency | Status |
|------------|--------|
| L-3 merged (PR #118) | **DONE** |
| PR #117 capture scaffold | **DONE** |
| PR #116 preflight | **DONE** |
| Clean `main` baseline | Expected before L-4 PR merge |
| Future explicit operator authorization | **PENDING** |
| [Read-only runbook](./ZORA_WALAT_CORE10_READ_ONLY_STAGING_SCAN_RUNBOOK_2026_05_29.md) | **FILED NOT EXECUTED** |
| [Evidence manifest](./ZORA_WALAT_CORE10_READONLY_STAGING_SNAPSHOT_CAPTURE_MANIFEST_2026_05_30.md) | **EMPTY** until capture |

---

## 13. Rollback / cleanup plan

| Scenario | Action |
|----------|--------|
| L-4 docs incorrect | `git revert` L-4 PR — **docs only** |
| Runtime rollback | **N/A** — L-4 allows **no** runtime action |
| Erroneous secrets committed | Rotate credentials; purge from git history per security process — **prevent** via redaction |
| Capture session abort | Destroy unredacted local artifacts; do not file CORE10-EV PASS |

**Rollback status (L-4 session):** **N/A** — no runtime or staging change.

---

## 14. Super-System invariants (preserved)

| Invariant | Status |
|-----------|--------|
| Zero duplicate transaction (live) | **Not fully proven** |
| No-pay-no-service (live) | **Not fully proven** |
| Runtime Doctor staging proof | **NOT VERIFIED** |
| Observability proof | **NOT VERIFIED** |
| Self-healing apply | **DISABLED / NOT ENABLED** |
| Production / real-money / controlled pilot / market launch | **NO-GO** |

---

## 15. L-4 session attestations

| # | Attestation | Status |
|---|-------------|--------|
| S1 | Ap786 documentation only | **YES** |
| S2 | No staging access | **YES** |
| S3 | No external API/dashboard access | **YES** |
| S4 | No capture executed | **YES** |
| S5 | No system mutation | **YES** |
| S6 | Capture phrase **not** granted in this task | **YES** |
| S7 | No fabricated screenshots or PASS rows | **YES** |

---

## 16. Final conservative verdict

| Item | Verdict |
|------|---------|
| L-4 authorization decision gate | **FILED** |
| CORE-10 read-only staging snapshot capture | **NOT EXECUTED** |
| External access | **NO** |
| System mutation | **NO** |
| Runtime Doctor staging proof | **NOT VERIFIED** |
| Observability proof | **NOT VERIFIED** |
| Self-healing apply | **DISABLED / NOT ENABLED** |
| Production readiness | **NO-GO** |
| Real-money readiness | **NO-GO** |
| Controlled pilot | **NO-GO** |
| Market launch | **NO-GO** |

**Canonical sentence:**

> L-4 authorization decision gate: **FILED**. CORE-10 read-only staging snapshot capture: **NOT EXECUTED**. External access: **NO**. System mutation: **NO**. Runtime Doctor staging proof: **NOT VERIFIED**. Observability proof: **NOT VERIFIED**. Self-healing apply: **DISABLED / NOT ENABLED**. Production / real-money / controlled pilot / market launch: **NO-GO**.

---

## 17. Related documents

| Document | Role |
|----------|------|
| [L-3 readiness](./ZORA_WALAT_L3_CORE10_READONLY_STAGING_SNAPSHOT_EXECUTION_READINESS_2026_05_30.md) | Preparation (PR #118) |
| [CORE10 operator DR](./ZORA_WALAT_CORE10_OPERATOR_APPROVAL_DECISION_RECORD_2026_05_29.md) | Future verbatim phrase record |
| [Capture blocker](./ZORA_WALAT_CORE10_CAPTURE_BLOCKER_OR_ABORT_RECORD_2026_05_30.md) | CORE10-BLK-CAPTURE-001 |

---

*End of L-4 authorization decision gate.*
