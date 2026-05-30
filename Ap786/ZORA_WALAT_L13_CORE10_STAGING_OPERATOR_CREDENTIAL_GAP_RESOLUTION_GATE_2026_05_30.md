# L-13 — CORE-10 Staging Operator Credential Gap Resolution Gate

**Date:** 2026-05-30  
**Roadmap:** Zora-Walat L-1 … L-150 Global Engineering / Super-System  
**L-step:** **L-13** — Staging Operator Credential Gap Resolution **Approval Gate** (policy only)  
**Branch (this pack):** `docs/l13-core10-staging-operator-credential-gap-resolution-gate-2026-05-30`  
**Base:** `1958b32` — Merge PR #127 (L-12 token refresh retry evidence)  

---

## 1. Title and identity

| Field | Value |
|-------|-------|
| Title | **L-13 CORE-10 Staging Operator Credential Gap Resolution Gate** |
| L-step | **L-13** |
| Role | Define how missing staging operator password may be added **only** under future **L-14** authorization |

---

## 2. Current blocker

| Finding | Source |
|---------|--------|
| `STAGING_OPERATOR_PASSWORD` **missing** | [L-12 evidence](./ZORA_WALAT_L12_CORE10_TOKEN_REFRESH_RETRY_EVIDENCE_2026_05_30.md) |
| L-12 token refresh | **BLOCKED_CREDS_MISSING** |
| `server/.env.local` | **exists**, gitignored; `HAS_EMAIL=true`, `HAS_PASSWORD=false` |
| `.staging-token.local` | **exists**, **expired**; login **not** run in L-12 |
| Minimal `status-check` | **SKIPPED** |
| PR #127 | **Merged**; main clean and synced |

**CORE10-BLK-CAPTURE-001** remains **OPEN** until valid token + separate full-snapshot authorization.

---

## 3. L-13 scope — CORE10-L13-SCOPE-001

| In scope (L-13) | Out of scope (L-13) |
|-----------------|---------------------|
| Approval gate / runbook / governance | Create or edit `server/.env.local` |
| L-14 phrase definition (reference only) | Print/read password or token |
| Credential safety + abort rules | `login` / token refresh / `status-check` |
| Future L-14 allowed/forbidden lists | Full staging snapshot export |
| Preflight validation checklist (define) | Deploy / redeploy / Vercel mutation |
| Future L-14 evidence ID references (define) | Env/config/secret file edits |
| | Stripe / Reloadly / provider / DB |
| | App/server/runtime/workflow changes |
| | Self-healing apply |
| | Production / pilot / real-money / market claims |

**CORE10-L13-SCOPE-001:** **FILED** — governance only; **no** credential setup, login, token refresh, status-check, or snapshot.

---

## 4. L-13 gate status — CORE10-L13-GATE-001

| Attestation | L-13 session |
|-------------|--------------|
| Ap786 documentation only | **YES** |
| Credential setup executed | **NO** |
| Login / token refresh executed | **NO** |
| Status-check executed | **NO** |
| Full snapshot executed | **NO** |

**CORE10-L13-GATE-001:** **FILED**

---

## 5. Future L-14 authorization phrase — CORE10-L13-FUTURE-PHRASE-001

```
APPROVE L-14 READ-ONLY STAGING OPERATOR CREDENTIAL LOCAL SETUP AND TOKEN REFRESH ONLY
```

| Rule | L-13 session |
|------|-------------|
| Phrase in this document | **Policy definition only** — **NOT** operator authorization for L-13 |
| L-13 may execute credential setup? | **NO** |
| L-13 may run login? | **NO** |

**CORE10-L13-FUTURE-PHRASE-001:** **DEFINED** (execution **PENDING** separate L-14 approval)

---

## 6. Credential safety rules — CORE10-L13-CREDENTIAL-SAFETY-001

| Rule | Requirement |
|------|-------------|
| Allowed storage | **Gitignored local only** — `server/.env.local` and/or process env in operator session |
| Password | Never print; never paste into Ap786 / PR / transcript |
| Token | Never print; never read contents into docs; never commit |
| Forbidden in git | `.env.local`, `.staging-token.local`, credential artifacts |
| Presence checks | **Boolean / length only** via `auth-env-check` or equivalent — no file content reads |
| Redaction | All sensitive values → `REDACTED`; abort if secret appears in output |
| Command abort | Any command that would reveal password or JWT → **stop** |

**Repo reference (policy, read-only):** `server/.gitignore` includes `.env`, `.env*.local`, `.staging-token.local`, `.staging-operator-email.local`, `.staging-operator-verify-token.local`.

**CORE10-L13-CREDENTIAL-SAFETY-001:** **FILED**

---

## 7. Future L-14 allowed actions (DEFINE ONLY — NOT EXECUTED IN L-13)

After **separate** L-14 operator authorization:

| # | Action |
|---|--------|
| L14-1 | Verify clean synced `main` (or approved L-14 evidence branch) |
| L14-2 | Verify `.gitignore` covers credential/token paths |
| L14-3 | Verify **no** credential/token file staged |
| L14-4 | Operator adds `STAGING_OPERATOR_PASSWORD` to gitignored local source **only** (human/operator — agent does not edit unless explicitly authorized in L-14) |
| L14-5 | Boolean-only credential presence check (`auth-env-check`) |
| L14-6 | **Exactly one** `node tools/staging-auth-checkout-operator.mjs login` if email **and** password present |
| L14-7 | Verify token file exists (`Test-Path`) — **never** read token |
| L14-8 | **Exactly one** minimal read-only `status-check` **only if** token refresh succeeds |
| L14-9 | File redacted Ap786 evidence + transcript |
| L14-10 | **No** full snapshot in L-14 unless separate CORE-10 capture phrase |

**Suggested future evidence IDs (L-14 pack):** `CORE10-L14-AUTH-001`, `CORE10-L14-GITIGNORE-001`, `CORE10-L14-CREDS-PRESENCE-001`, `CORE10-L14-TOKEN-REFRESH-001`, `CORE10-L14-STATUS-CHECK-001`, `CORE10-L14-REDACTION-001`, `CORE10-L14-NO-MUTATION-001`, `CORE10-L14-VERDICT-001`.

---

## 8. Future L-14 forbidden actions

| # | Forbidden |
|---|------------|
| F1 | Full staging snapshot export (unless separate authorization) |
| F2 | Deploy / redeploy / Vercel settings or env mutation |
| F3 | DB / migration / payment / order / wallet mutation |
| F4 | Stripe / Reloadly / provider API calls |
| F5 | Self-healing / auto-repair apply |
| F6 | Production / live / real-money operations |
| F7 | Token or password print in terminal or docs |
| F8 | Committing `.env.local`, `.staging-token.local`, or credentials |
| F9 | More than one login or status-check per L-14 session |
| F10 | Status-check before successful token refresh |

---

## 9. Preflight validation checklist (future L-14)

| # | Check | Pass criterion |
|---|-------|----------------|
| P1 | `git status -sb` | Clean or only approved Ap786 evidence paths |
| P2 | `git diff --name-only` | Ap786-only for evidence PR |
| P3 | `git diff --check` | **PASS** |
| P4 | `npm --prefix server run secrets:scan` | **OK** |
| P5 | `git check-ignore` on `.env.local` / `.staging-token.local` | Ignored |
| P6 | No staged credential/token files | **NONE** |
| P7 | `auth-env-check` | `HAS_EMAIL=true` **and** `HAS_PASSWORD=true` before login |
| P8 | L-14 verbatim phrase in operator chat | **YES** |

---

## 10. Abort conditions — CORE10-L13-ABORT-CRITERIA-001

| # | Condition | Action |
|---|-----------|--------|
| A1 | Credential missing (email or password) | Do **not** run `login`; file **BLOCKED_CREDS_MISSING** |
| A2 | Command would print token or password | **Abort** session |
| A3 | `git diff` includes non-Ap786 paths (evidence PR) | **Abort** until scoped |
| A4 | `secrets:scan` fails | **Abort**; fix tracked sources |
| A5 | More than one `login` attempted | **Abort** |
| A6 | `status-check` before token refresh success | **Abort** |
| A7 | Deploy / env edit / API / provider / payment mutation requested | **Abort** |
| A8 | Full snapshot export starts | **Abort** |
| A9 | Credential or token staged for commit | **Abort** |
| A10 | Secret in output; cannot redact | **Abort**; do not commit transcript |

**CORE10-L13-ABORT-CRITERIA-001:** **FILED**

---

## 11. Dependencies

| Dependency | Status |
|------------|--------|
| PR #127 (L-12) merged | **DONE** (`1958b32`) |
| L-11 token refresh gate | **DONE** |
| L-10 staging API surface | **CORRECTED** |
| L-12 blocked outcome documented | **DONE** |
| Gitignored credential paths | **DOCUMENTED** |
| `staging-auth-checkout-operator.mjs` | **AVAILABLE** (not run in L-13) |
| Future L-14 verbatim phrase | **PENDING** |

---

## 12. Rollback / cleanup

| Scenario | Action |
|----------|--------|
| L-13 docs error | Revert L-13 PR — Ap786 only |
| L-13 runtime rollback | **N/A** — no credential/login action |
| Future L-14 bad local creds | Operator removes password line from `.env.local` or rotates staging password per ops process |
| Future L-14 bad token file | Delete `server/.staging-token.local` locally; re-login under new auth |

---

## 13. Super-System invariants (preserved)

| Invariant | Status |
|-----------|--------|
| L-12 token refresh | **BLOCKED_CREDS_MISSING** (unchanged by L-13) |
| Full staging snapshot | **NOT EXECUTED** |
| Runtime Doctor staging proof | **NOT VERIFIED** |
| Observability proof | **NOT VERIFIED** |
| Self-healing apply | **DISABLED / NOT ENABLED** |
| Zero duplicate / NPNS (live) | **Not fully proven** |
| Production / real-money / controlled pilot / market launch | **NO-GO** |

---

## 14. L-13 session attestations

| # | Attestation | Status |
|---|-------------|--------|
| S1 | Ap786 gate only | **YES** |
| S2 | No `.env.local` create/edit by agent | **YES** |
| S3 | No password/token print/read | **YES** |
| S4 | No login / refresh / status-check | **YES** |
| S5 | L-14 phrase not granted in L-13 | **YES** |

---

## 15. Final conservative verdict — CORE10-L13-VERDICT-001

| Item | Verdict |
|------|---------|
| L-13 gate | **FILED** |
| Credential setup | **NOT EXECUTED** |
| Token refresh | **NOT EXECUTED** |
| Status-check | **NOT EXECUTED** |
| Full snapshot export | **NOT EXECUTED** |
| Token/password printed/read | **NO** |
| Token/credential committed | **NO** |
| Runtime Doctor staging proof | **NOT VERIFIED** |
| Observability proof | **NOT VERIFIED** |
| Self-healing apply | **DISABLED / NOT ENABLED** |
| Production readiness | **NO-GO** |
| Real-money readiness | **NO-GO** |
| Controlled pilot | **NO-GO** |
| Market launch | **NO-GO** |

**Canonical sentence:**

> L-13 gate: **FILED**. Credential setup: **NOT EXECUTED**. Token refresh: **NOT EXECUTED**. Status-check: **NOT EXECUTED**. Full snapshot: **NOT EXECUTED**. Runtime Doctor staging proof: **NOT VERIFIED**. Observability proof: **NOT VERIFIED**. Production / real-money / controlled pilot / market launch: **NO-GO**.

**CORE10-L13-VERDICT-001:** **FILED** (conservative **NO-GO** on all launch paths)

---

## 16. Related documents

| Document | Role |
|----------|------|
| [L-12 evidence](./ZORA_WALAT_L12_CORE10_TOKEN_REFRESH_RETRY_EVIDENCE_2026_05_30.md) | **BLOCKED_CREDS_MISSING** — root blocker |
| [L-11 gate](./ZORA_WALAT_L11_CORE10_TOKEN_REFRESH_RETRY_APPROVAL_GATE_2026_05_30.md) | Prior token-retry policy |
| [L-10 redeploy](./ZORA_WALAT_L10_STAGING_API_SURFACE_CORRECTION_REDEPLOY_EVIDENCE_2026_05_30.md) | API surface fixed |

---

*End of L-13 credential gap resolution gate.*
