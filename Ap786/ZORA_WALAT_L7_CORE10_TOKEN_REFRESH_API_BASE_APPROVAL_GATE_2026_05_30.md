# L-7 — Read-Only Staging Operator Token Refresh + Correct API Base URL Approval Gate

**Date:** 2026-05-30  
**Roadmap:** Zora-Walat L-1 … L-150 Global Engineering / Super-System  
**L-step:** **L-7** — CORE-10 Token Refresh + API Base URL **Approval Gate** (policy only)  
**Branch (this pack):** `docs/l7-core10-token-refresh-api-base-approval-gate-2026-05-30`  
**Base:** `7aa572e` — Merge PR #121 (L-6 minimum read-only capture)  

---

## 1. L-step identity

| Field | Value |
|-------|-------|
| L-step | **L-7** |
| Title | Read-Only Staging Operator Token Refresh + Correct API Base URL Approval Gate |
| Date | 2026-05-30 |
| PR #121 / L-6 | [L-6 capture evidence](./ZORA_WALAT_L6_CORE10_READONLY_STAGING_SNAPSHOT_CAPTURE_EVIDENCE_2026_05_30.md) — minimum capture **EXECUTED**; full snapshot **NOT** captured |
| L-7 role | Define **future L-8** approval boundary — **no** token refresh, login, or external access in L-7 |

---

## 2. Mission

Define a **fail-closed approval gate** for future:

1. Read-only staging **operator token refresh** (local ignored file policy only), and  
2. **Correct staging API base URL** verification (read-only discovery / guard commands),

before any **L-9** full read-only snapshot export or renewed CORE-10 capture session.

**This L-7 task is NOT:**
- Authorization to refresh a token  
- Authorization to login  
- Authorization to access staging, Vercel, Stripe, Reloadly, DB, logs, or dashboards  

**This L-7 task IS:**
- Documentation / governance / approval-gate only  

---

## 3. Scope

| In scope | Out of scope |
|----------|----------------|
| L-7 approval gate policy | Token refresh execution |
| L-8 phrase definition (policy reference) | Login execution |
| L-8 allowed/prohibited action lists (define only) | Staging HTTP/API calls |
| Token + API base handling rules | Env / Vercel / workflow changes |
| Risk register, go/no-go matrix | Reading or printing token contents |
| Linkage to L-6 blockers | Full snapshot export (L-9 / separate auth) |

---

## 4. Why this gate exists (L-6 findings)

| L-6 observation | Impact |
|-----------------|--------|
| `GET /api/health` → HTTP **404 HTML** | Staging host may be **frontend** surface, not API JSON liveness — [Vercel preview confusion](./ZORA_WALAT_L5_CORE10_READONLY_CAPTURE_EXECUTION_PACK_DRY_RUN_GATE_2026_05_30.md) risk |
| `status-check` → **TOKEN_EXPIRED** | No order state exported; observability **INCONCLUSIVE** |
| Snapshot = metadata-only, **0 orders** | Runtime Doctor offline **PASS** on empty fixture — **not** staging proof |
| **CORE10-BLK-CAPTURE-001** | Remains **OPEN** for full read-only export |

Without L-8 token + API base verification, a repeat capture risks false confidence or secret exposure.

---

## 5. Future L-8 authorization phrase (policy only — NOT L-7 authorization)

```
APPROVE L-8 READ-ONLY STAGING OPERATOR TOKEN REFRESH AND API BASE URL VERIFY ONLY
```

| Rule | L-7 session |
|------|-------------|
| Phrase in this document | **NOT** operator authorization |
| Phrase in L-3..L-6 packs | **NOT** authorization |
| Separate explicit operator instruction required for L-8 | **YES** (future) |
| L-7 executes token refresh? | **NO** |
| L-7 executes API verify? | **NO** |

---

## 6. Future authorized L-8 actions (DEFINE ONLY — NOT EXECUTED)

After **separate** L-8 operator authorization:

| # | Action | Notes |
|---|--------|-------|
| L8-1 | Refresh/obtain staging operator token via **approved** operator path only | Local `.staging-token.local` if policy permits — **gitignored** |
| L8-2 | Verify token **presence** (`Test-Path` / file exists) — **never print** token | CORE10-L8-TOKEN-NO-PRINT-001 |
| L8-3 | Verify correct staging **API** base URL | e.g. `npm run deploy:staging:guard` read-only output; redacted host label only |
| L8-4 | Confirm API returns JSON liveness (not HTML 404) on `/api/health` or approved path | CORE10-L8-API-BASE-001 |
| L8-5 | Run **one** safe read-only `status-check` | No login in same step if token already valid |
| L8-6 | Capture **redacted** transcript only | No secrets in Ap786 |
| L8-7 | Update blocker register conservatively | CORE10-BLK-CAPTURE-001 may remain OPEN until L-9 |
| L8-8 | **Do not** perform full DB/export snapshot unless **separately** authorized (e.g. CORE-10 capture phrase + L-9) | Narrow L-8 scope |

---

## 7. Prohibited actions (always — including after L-8)

| # | Prohibited |
|---|------------|
| P1 | Deploy / redeploy |
| P2 | Env / config / secret edits |
| P3 | Stripe replay / resend / test event (unless separately approved) |
| P4 | Reloadly / provider execution |
| P5 | DB mutation / migrations |
| P6 | Payment / order / wallet / top-up / settlement mutation |
| P7 | Production / live-mode action |
| P8 | Self-healing / auto-repair apply |
| P9 | Broad staging probing |
| P10 | Token printing, token in docs, raw secret commit |
| P11 | Full snapshot export unless **separately** authorized |

---

## 8. Required future L-8 evidence artifacts

| ID | Artifact | L-7 status |
|----|----------|------------|
| **CORE10-L8-AUTH-001** | L-8 authorization evidence (verbatim phrase + DR) | **PENDING** |
| **CORE10-L8-TOKEN-REFRESH-001** | Token refresh / read-only operator evidence | **PENDING** |
| **CORE10-L8-TOKEN-NO-PRINT-001** | No-token-print attestation | **PENDING** |
| **CORE10-L8-API-BASE-001** | API base URL verification (redacted label + JSON health proof) | **PENDING** |
| **CORE10-L8-STATUS-CHECK-001** | Read-only status-check enums (no order IDs in docs) | **PENDING** |
| **CORE10-L8-NO-MUTATION-001** | No-mutation attestation | **PENDING** |
| **CORE10-L8-VERDICT-001** | Conservative verdict matrix | **PENDING** |

**L-7:** IDs defined only — **no** artifacts filed.

---

## 9. Token handling rules

| Rule | Requirement |
|------|-------------|
| Never print token | **Mandatory** |
| Never commit token | **Mandatory** — `.staging-token.local` must stay gitignored |
| Never copy token into Ap786 markdown | **Mandatory** |
| Never expose token in screenshots | **Mandatory** |
| Store token | Local ignored operator file **only** if existing policy permits |
| Verify presence | `Test-Path` or equivalent — **no** `cat` / `type` of token file in evidence |
| Redact identifiers | Host, account, operator ids → `REDACTED_*` |
| Stop condition | Any command that would echo secret content → **abort** |

---

## 10. API base URL verification rules

| Rule | Requirement |
|------|-------------|
| Verify staging **API** base without mutation | Read-only GET / approved guard script stdout (redacted) |
| No deploy / redeploy / Vercel settings / env edits | **Mandatory** |
| No production URL / live-mode endpoint | **Mandatory** |
| Record hostname | Redacted label only (e.g. `REDACTED_STAGING_API_HOST`) |
| Frontend vs API | Document: HTML 404 on wrong host ≠ API JSON `{ "status": "ok" }` on `/api/health` |
| Wrong base symptom (L-6) | Next.js 404 page HTML — route to **API** deployment required before snapshot |

---

## 11. Abort rules (future L-8)

| # | Stop condition |
|---|----------------|
| A1 | Token would be printed to terminal or log |
| A2 | Login flow requests unsafe permissions or writes |
| A3 | Dashboard prompts deploy / redeploy / settings edit |
| A4 | Command requests write access (DB, API POST mutation) |
| A5 | DB / payment / provider operation requested |
| A6 | Production / live-mode context detected |
| A7 | Redaction cannot be guaranteed |
| A8 | Operator identity or L-8 authorization unclear |
| A9 | `CORE-10 SCAN ABORT` invoked |

If secret appears in output: **stop**, redact before any filing; **do not commit** token file.

---

## 12. Go / no-go matrix

| Gate | L-7 (this pack) | Future L-8 | Future L-9 full export | Today |
|------|-----------------|------------|------------------------|-------|
| L-7 approval gate filed | **GO** (when merged) | Prerequisite | Prerequisite | **IN PROGRESS** |
| L-8 token refresh + API verify | **N/A** | Requires phrase | Prerequisite | **NO-GO** |
| L-9 full read-only snapshot | **N/A** | **N/A** | Separate auth | **NO-GO** |
| Runtime Doctor staging proof | **N/A** | Partial hint only | Requires non-empty snapshot | **NOT VERIFIED** |
| Observability proof | **N/A** | status-check enums | Full correlation | **NOT VERIFIED** |
| NPNS proof (live) | **N/A** | **N/A** | Hard evidence | **NO-GO** |
| Zero duplicate tx (live) | **N/A** | **N/A** | Hard evidence | **NO-GO** |
| Production readiness | **NO-GO** | **NO-GO** | **NO-GO** | **NO-GO** |
| Real-money readiness | **NO-GO** | **NO-GO** | **NO-GO** | **NO-GO** |
| Controlled pilot | **NO-GO** | **NO-GO** | **NO-GO** | **NO-GO** |
| Market launch | **NO-GO** | **NO-GO** | **NO-GO** | **NO-GO** |

---

## 13. Risk register

| ID | Risk | Mitigation |
|----|------|------------|
| L7-R-01 | Token exposure in PR/logs | L-8 no-print rules; abort |
| L7-R-02 | Token committed to repo | `.gitignore`; pre-commit review |
| L7-R-03 | Wrong API base URL | L-8 guard + JSON health check |
| L7-R-04 | Frontend route mistaken for API | Document HTML 404 vs JSON health |
| L7-R-05 | Accidental staging mutation | Read-only paths only; no login without L-8 |
| L7-R-06 | Accidental production access | Env label checks; abort |
| L7-R-07 | False proof claim after empty doctor PASS | Do not claim staging verified until L-9 |
| L7-R-08 | Insufficient observability evidence | L-9 correlation required |
| L7-R-09 | Runtime Doctor false confidence | Non-empty redacted snapshot required |
| L7-R-10 | L-8 phrase misinterpretation | This gate §5 |

**Risks introduced by L-7:** **None** (Ap786 only).

---

## 14. Dependencies

| Dependency | Status |
|------------|--------|
| PR #121 (L-6) merged | **DONE** |
| PR #118–#120 (L-3..L-5) | **DONE** |
| Clean `main` at L-8 execution time | Required future |
| Future L-8 verbatim phrase | **PENDING** |
| Local ignored token policy | Documented (`server/.staging-token.local` gitignored) |
| [Redaction policy](./ZORA_WALAT_CORE10_NO_MUTATION_SAFETY_BOUNDARY_2026_05_29.md) | **FILED** |
| [Read-only runbook](./ZORA_WALAT_CORE10_READ_ONLY_STAGING_SCAN_RUNBOOK_2026_05_29.md) | **FILED** |
| [Evidence manifest](./ZORA_WALAT_CORE10_READONLY_STAGING_SNAPSHOT_CAPTURE_MANIFEST_2026_05_30.md) | **PARTIAL** |
| No open incident elevating risk | Operator attestation at L-8 |

---

## 15. Rollback / cleanup plan

| Scenario | Action |
|----------|--------|
| L-7 docs error | `git revert` L-7 PR — docs only |
| Runtime rollback | **N/A** — L-7 allows no runtime action |
| Token file accidentally created in future L-8 | **Do not commit**; verify `.gitignore` |
| Secret in command output | Stop; redact before filing; rotate if leaked |

**L-7 session rollback:** **N/A** — no external access, no mutation.

---

## 16. Super-System invariants (preserved)

| Invariant | Status |
|-----------|--------|
| Zero duplicate transaction (live) | **Not fully proven** |
| No-pay-no-service (live) | **Not fully proven** |
| Runtime Doctor staging proof | **NOT VERIFIED** |
| Observability proof | **NOT VERIFIED** |
| Self-healing apply | **DISABLED / NOT ENABLED** |
| Production / real-money / controlled pilot / market launch | **NO-GO** |

---

## 17. L-7 session attestations

| # | Attestation | Status |
|---|-------------|--------|
| S1 | Ap786 approval gate only | **YES** |
| S2 | No login | **YES** |
| S3 | No token refresh | **YES** |
| S4 | No token read/print | **YES** |
| S5 | No staging/Vercel/external access | **YES** |
| S6 | No mutation | **YES** |
| S7 | L-8 phrase **not** granted in L-7 | **YES** |

---

## 18. Final conservative verdict

| Item | Verdict |
|------|---------|
| L-7 approval gate | **FILED** |
| Token refresh | **NOT EXECUTED** |
| API base URL verification | **NOT EXECUTED** |
| External access | **NO** |
| System mutation | **NO** |
| Full staging snapshot | **NOT CAPTURED** |
| Runtime Doctor staging proof | **NOT VERIFIED** |
| Observability proof | **NOT VERIFIED** |
| Self-healing apply | **DISABLED / NOT ENABLED** |
| Production readiness | **NO-GO** |
| Real-money readiness | **NO-GO** |
| Controlled pilot | **NO-GO** |
| Market launch | **NO-GO** |

**Canonical sentence:**

> L-7 approval gate: **FILED**. Token refresh: **NOT EXECUTED**. API base URL verification: **NOT EXECUTED**. External access: **NO**. System mutation: **NO**. Runtime Doctor staging proof: **NOT VERIFIED**. Observability proof: **NOT VERIFIED**. Production / real-money / controlled pilot / market launch: **NO-GO**.

---

## 19. Related documents

| Document | Role |
|----------|------|
| [L-6 capture evidence](./ZORA_WALAT_L6_CORE10_READONLY_STAGING_SNAPSHOT_CAPTURE_EVIDENCE_2026_05_30.md) | PR #121 — TOKEN_EXPIRED / health 404 |
| [L-5 dry-run gate](./ZORA_WALAT_L5_CORE10_READONLY_CAPTURE_EXECUTION_PACK_DRY_RUN_GATE_2026_05_30.md) | Future sequence |
| [Capture blocker](./ZORA_WALAT_CORE10_CAPTURE_BLOCKER_OR_ABORT_RECORD_2026_05_30.md) | CORE10-BLK-CAPTURE-001 |

---

*End of L-7 approval gate.*
