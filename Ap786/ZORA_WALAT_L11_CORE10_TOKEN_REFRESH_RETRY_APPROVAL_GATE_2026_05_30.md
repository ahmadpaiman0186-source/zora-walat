# L-11 — CORE-10 Staging Operator Token Refresh Retry Approval Gate

**Date:** 2026-05-30  
**Roadmap:** Zora-Walat L-1 … L-150 Global Engineering / Super-System  
**L-step:** **L-11** — Staging Operator Token Refresh Retry **Approval Gate** (policy only)  
**Branch (this pack):** `docs/l11-core10-token-refresh-retry-approval-gate-2026-05-30`  
**Base:** `5b2a8dc` — Merge PR #125 (L-10 staging API redeploy)  

---

## 1. L-step identity

| Field | Value |
|-------|-------|
| L-step | **L-11** |
| Title | CORE-10 Staging Operator Token Refresh Retry Approval Gate |
| Date | 2026-05-30 |
| PR #125 / L-10 | [L-10 redeploy evidence](./ZORA_WALAT_L10_STAGING_API_SURFACE_CORRECTION_REDEPLOY_EVIDENCE_2026_05_30.md) — API surface **corrected**; smoke **PASS** |
| L-11 role | Define **future L-12** token refresh retry boundary — **no** login, credentials, or token handling in L-11 |

---

## 2. Mission

Define a **fail-closed approval gate** for a future **read-only staging operator token refresh retry** using **gitignored local credentials only**, after L-10 fixed the hosted API surface.

Prevent accidental credential exposure, token print/commit, full snapshot export before token retry succeeds under **separate** L-12 authorization.

**This L-11 task is NOT:**
- Authorization to refresh token or run `login`  
- Authorization to create, edit, print, read, or commit credentials  
- Authorization for full staging snapshot export  

**This L-11 task IS:**
- Documentation / governance / approval-gate only  

---

## 3. Scope

| In scope | Out of scope |
|----------|----------------|
| L-11 approval gate policy | `login` / token refresh execution |
| L-12 phrase definition (reference only) | Credential file create/edit |
| Future L-12 allowed/prohibited lists (define only) | Token print/read/commit |
| Credential + token safety rules | Full snapshot export |
| Status-check rules (post L-12) | Deploy / redeploy / Vercel mutation |
| CORE10-L12-* artifact IDs (pending) | Env/config edits |

---

## 4. Why this gate exists

| History | Finding |
|---------|---------|
| L-6 | `TOKEN_EXPIRED` blocked status-check |
| L-8 | Token refresh **not completed** — `STAGING_OPERATOR_EMAIL` / `STAGING_OPERATOR_PASSWORD` absent in shell |
| L-8 (pre-L-10) | API smoke **FAIL** — wrong deployment surface |
| L-10 | `/api/health` **200 JSON**; `staging-api-smoke` **PASS** (`api_serverless`) |
| **Current blocker** | Valid operator token in gitignored local files |
| **CORE10-BLK-CAPTURE-001** | Full snapshot **OPEN** until token + separate capture auth |

Token refresh retry is the **next** safe step; full snapshot remains **blocked** until L-12 succeeds and `APPROVE CORE-10 READ-ONLY STAGING SNAPSHOT CAPTURE ONLY` (or successor) is issued separately.

---

## 5. Future L-12 authorization phrase (policy only — NOT L-11 authorization)

```
APPROVE L-12 READ-ONLY STAGING OPERATOR TOKEN REFRESH RETRY WITH GITIGNORED LOCAL CREDS ONLY
```

| Rule | L-11 session |
|------|-------------|
| Phrase in this document | **NOT** operator authorization |
| L-11 executes login/token refresh? | **NO** |
| L-11 creates/edits credentials? | **NO** |

---

## 6. Future authorized L-12 actions (DEFINE ONLY — NOT EXECUTED)

After **separate** L-12 operator authorization:

| # | Action | Notes |
|---|--------|-------|
| L12-1 | Verify clean working tree on approved L-12 evidence branch | — |
| L12-2 | Verify `.gitignore` covers `.staging-token.local`, `.env*.local`, staging operator locals | CORE10-L12-GITIGNORE-001 |
| L12-3 | Verify **no** credential/token file staged (`git status`) | CORE10-L12-NO-STAGED-SECRETS-001 |
| L12-4 | Check presence of `STAGING_OPERATOR_EMAIL` / `STAGING_OPERATOR_PASSWORD` **without printing values** | CORE10-L12-CREDS-PRESENCE-001 |
| L12-5 | Run **once**: `node tools/staging-auth-checkout-operator.mjs login` | CORE10-L12-TOKEN-REFRESH-001 |
| L12-6 | Redirect stdout through redaction filter (`eyJ`, `Bearer`, passwords) | CORE10-L12-REDACTION-001 |
| L12-7 | Verify token file exists (`Test-Path`) — **never** `cat` token | CORE10-L12-NO-TOKEN-PRINT-001 |
| L12-8 | If refresh OK: **one** minimal `status-check` (read-only GET) | CORE10-L12-STATUS-CHECK-001 |
| L12-9 | File redacted transcript; evidence PR | — |
| L12-10 | **Do not** start full snapshot export in L-12 | Separate CORE-10 capture auth |

---

## 7. Prohibited actions (always — including after L-12 unless separately approved)

| # | Prohibited |
|---|------------|
| P1 | Full staging snapshot export |
| P2 | Production / live deploy or credential context |
| P3 | Staging redeploy (L-10 already done) |
| P4 | Env / config / secret file edits |
| P5 | Vercel settings edits |
| P6 | Token or credential printing |
| P7 | Token/credential in docs or PR body |
| P8 | Stripe replay / resend / test event |
| P9 | Reloadly / provider execution |
| P10 | DB / payment / order / wallet mutation |
| P11 | Self-healing / auto-repair apply |
| P12 | Broad probing beyond minimal status-check |
| P13 | Production / real-money / controlled-pilot claims |

---

## 8. Required future L-12 evidence artifacts

| ID | Artifact | L-11 status |
|----|----------|------------|
| **CORE10-L12-AUTH-001** | Verbatim L-12 phrase + DR | **PENDING** |
| **CORE10-L12-GITIGNORE-001** | Gitignore verification for token/creds paths | **PENDING** |
| **CORE10-L12-NO-STAGED-SECRETS-001** | No credential/token staged | **PENDING** |
| **CORE10-L12-CREDS-PRESENCE-001** | Env/creds present check (no values) | **PENDING** |
| **CORE10-L12-TOKEN-REFRESH-001** | Login result enums only | **PENDING** |
| **CORE10-L12-NO-TOKEN-PRINT-001** | No token in transcript/docs | **PENDING** |
| **CORE10-L12-STATUS-CHECK-001** | Minimal status-check enums | **PENDING** |
| **CORE10-L12-REDACTION-001** | Redacted transcript filed | **PENDING** |
| **CORE10-L12-NO-MUTATION-001** | No DB/payment/provider mutation | **PENDING** |
| **CORE10-L12-VERDICT-001** | Conservative verdict | **PENDING** |

---

## 9. Credential and token safety rules

| Rule | Requirement |
|------|-------------|
| Credentials | **Local only** — `server/.env.local` or process env (gitignored) |
| Token storage | `server/.staging-token.local` — **gitignored** |
| Never print token | Mandatory |
| Never paste token into Ap786 / PR | Mandatory |
| Never commit token or `.env.local` | Mandatory |
| Redaction filter | Replace `eyJ…`, `Bearer …`, password lines |
| Token in output | **Stop**; do not commit transcript until redacted |
| Staged credential file | **Abort** L-12 session |

**Repo reference (read-only policy check, L-11):** `server/.gitignore` includes `.staging-token.local`, `.env`, `.env*.local`, `.staging-order-id.local`, `.staging-checkout-url.local`.

---

## 10. Status-check rules (after future L-12 token refresh)

| Rule | Requirement |
|------|-------------|
| Command | `status-check` only — read-only GET |
| Scope | Order status **enums** only — no order ID export to Ap786 unless redacted policy allows |
| Forbidden in same session | Full snapshot, webhook export, audit export, DB write |
| Provider / Stripe / Reloadly | **None** |
| Record | HTTP class, `TOKEN_EXPIRED`, `ORDER_STATE_UNAVAILABLE`, payment/order **status strings** only |

---

## 11. Abort rules (future L-12)

| # | Condition |
|---|-----------|
| A1 | Credential or token would be printed |
| A2 | Credential or token staged for commit |
| A3 | Local paths **not** gitignored |
| A4 | Production / live target detected |
| A5 | Deploy / redeploy triggered |
| A6 | Env / config edit requested |
| A7 | DB / payment / provider write |
| A8 | Full snapshot export starts |
| A9 | Secret in output — stop and redact |
| A10 | Evidence cannot be safely redacted |

---

## 12. Go / no-go matrix

| Gate | L-11 (this pack) | Future L-12 token refresh | Full snapshot | Today |
|------|------------------|---------------------------|---------------|-------|
| L-11 approval gate filed | **GO** (when merged) | Prerequisite | — | **IN PROGRESS** |
| L-12 token refresh retry | **N/A** | Requires phrase | Prerequisite | **NO-GO** |
| Full read-only snapshot | **N/A** | **N/A** | Separate CORE-10 phrase | **NO-GO** |
| Runtime Doctor staging proof | **N/A** | — | Needs data | **NOT VERIFIED** |
| Observability proof | **N/A** | — | Needs data | **NOT VERIFIED** |
| NPNS / duplicate (live) | **N/A** | — | Hard evidence | **NO-GO** |
| Production / real-money / pilot / market | **NO-GO** | **NO-GO** | **NO-GO** | **NO-GO** |

---

## 13. Risk register

| ID | Risk | Mitigation |
|----|------|------------|
| L11-R-01 | Credential exposure | Gitignore + no-staged-secrets check |
| L11-R-02 | Token committed to git | Pre-commit + abort if staged |
| L11-R-03 | Token printed in transcript | Redaction filter; CORE10-L12-NO-TOKEN-PRINT-001 |
| L11-R-04 | Token in PR body | Review checklist |
| L11-R-05 | Wrong environment login | Staging API host verified L-10; staging creds only |
| L11-R-06 | Production credential usage | Abort on live-mode signals |
| L11-R-07 | Stale token after false success | Verify `TOKEN_EXPIRED=false` on status-check |
| L11-R-08 | Full snapshot accidentally run | L-12 scope excludes; separate auth |
| L11-R-09 | Status-check mutation | Read-only GET path only |
| L11-R-10 | False readiness claim | Conservative verdict §18 |
| L11-R-11 | L-12 phrase misinterpretation | §5 |

**Risks introduced by L-11:** **None** (Ap786 only).

---

## 14. Dependencies

| Dependency | Status |
|------------|--------|
| PR #125 (L-10) merged | **DONE** |
| PR #118–#124 (L-3..L-10 chain) | **DONE** |
| Staging API surface corrected | **YES** (L-10) |
| Future L-12 verbatim phrase | **PENDING** |
| Gitignored paths (`server/.gitignore`) | **DOCUMENTED** |
| [Redaction policy](./ZORA_WALAT_CORE10_NO_MUTATION_SAFETY_BOUNDARY_2026_05_29.md) | **FILED** |
| `staging-auth-checkout-operator.mjs login` | **AVAILABLE** (not run in L-11) |
| No open incident elevating risk | Program attestation |

---

## 15. Rollback / cleanup plan

| Scenario | Action |
|----------|--------|
| L-11 docs error | `git revert` L-11 PR — docs only |
| L-11 runtime rollback | **N/A** — no login/token action |
| Future L-12 bad token file | Delete local `.staging-token.local`; re-login under new auth |
| Credential leak in transcript | Stop commit; rotate staging operator password per ops process |

---

## 16. Super-System invariants (preserved)

| Invariant | Status |
|-----------|--------|
| Zero duplicate transaction (live) | **Not fully proven** |
| No-pay-no-service (live) | **Not fully proven** |
| Full staging snapshot | **NOT EXECUTED** |
| Runtime Doctor staging proof | **NOT VERIFIED** |
| Observability proof | **NOT VERIFIED** |
| Self-healing apply | **DISABLED / NOT ENABLED** |
| Production / real-money / controlled pilot / market launch | **NO-GO** |

---

## 17. L-11 session attestations

| # | Attestation | Status |
|---|-------------|--------|
| S1 | Ap786 approval gate only | **YES** |
| S2 | No login / token refresh | **YES** |
| S3 | No credential create/edit | **YES** |
| S4 | No token print/read/commit | **YES** |
| S5 | No full snapshot | **YES** |
| S6 | No deploy / Vercel / env mutation | **YES** |
| S7 | L-12 phrase **not** granted in L-11 | **YES** |

---

## 18. Final conservative verdict

| Item | Verdict |
|------|---------|
| L-11 approval gate | **FILED** |
| Token refresh retry | **NOT EXECUTED** |
| Credential setup | **NOT EXECUTED** |
| Token printed/read | **NO** |
| Token/credential committed | **NO** |
| Full snapshot export | **NOT EXECUTED** |
| Deploy/redeploy | **NOT EXECUTED** |
| Vercel mutation | **NO** |
| Env/config mutation | **NO** |
| DB/payment/provider mutation | **NO** |
| Runtime Doctor staging proof | **NOT VERIFIED** |
| Observability proof | **NOT VERIFIED** |
| Self-healing apply | **DISABLED / NOT ENABLED** |
| Production readiness | **NO-GO** |
| Real-money readiness | **NO-GO** |
| Controlled pilot | **NO-GO** |
| Market launch | **NO-GO** |

**Canonical sentence:**

> L-11 approval gate: **FILED**. Token refresh retry: **NOT EXECUTED**. Credential setup: **NOT EXECUTED**. Token printed/read: **NO**. Token/credential committed: **NO**. Full snapshot export: **NOT EXECUTED**. Deploy/redeploy: **NOT EXECUTED**. System mutation: **NO**. Runtime Doctor staging proof: **NOT VERIFIED**. Observability proof: **NOT VERIFIED**. Production / real-money / controlled pilot / market launch: **NO-GO**.

---

## 19. Related documents

| Document | Role |
|----------|------|
| [L-10 redeploy](./ZORA_WALAT_L10_STAGING_API_SURFACE_CORRECTION_REDEPLOY_EVIDENCE_2026_05_30.md) | PR #125 — API surface fixed |
| [L-8 verify](./ZORA_WALAT_L8_CORE10_TOKEN_REFRESH_API_BASE_VERIFY_EVIDENCE_2026_05_30.md) | Token refresh failed (env) |
| [L-7 gate](./ZORA_WALAT_L7_CORE10_TOKEN_REFRESH_API_BASE_APPROVAL_GATE_2026_05_30.md) | Prior token policy |

---

*End of L-11 approval gate.*
