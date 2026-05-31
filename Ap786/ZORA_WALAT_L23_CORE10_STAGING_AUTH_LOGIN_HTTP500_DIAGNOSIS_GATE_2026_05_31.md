# L-23 — CORE-10 Staging Auth Login HTTP 500 Read-Only Diagnosis Gate

**Date:** 2026-05-31  
**Roadmap:** Zora-Walat L-1 … L-150 Global Engineering / Super-System  
**L-step:** **L-23** — Staging Auth Login HTTP **500** Read-Only **Diagnosis Gate** (policy only)  
**Branch (this pack):** `docs/l23-core10-staging-auth-login-http500-diagnosis-gate-2026-05-31`  
**Base:** `d27dc1a` — Merge PR #137 (L-22 token refresh **FAILED**)  

---

## 1. Title and identity — CORE10-L23-GATE-001

| Field | Value |
|-------|-------|
| Title | **L-23 CORE-10 Staging Auth Login HTTP 500 Read-Only Diagnosis Gate** |
| L-step | **L-23** |
| Trigger | [L-22](./ZORA_WALAT_L22_CORE10_TOKEN_REFRESH_AFTER_L21_BLOCKED_TOKEN_EVIDENCE_2026_05_31.md) — `login` HTTP **500** / `Service unavailable` / `auth_invalid_request` |
| L-23 role | Define **future L-24** read-only diagnosis boundary — **no** runtime diagnosis in L-23 |

**CORE10-L23-GATE-001:** **FILED**

---

## 2. Problem statement — CORE10-L23-PROBLEM-001

| Observation | Detail |
|-------------|--------|
| Route reachability | `POST /api/auth/login` is **reachable** — not **404** (L-18/L-22 smoke: `login_route` **400** on empty body probe) |
| Operator login (L-22) | Exactly **one** `login` with gitignored creds → HTTP **500** |
| Safe response enums | `auth_invalid_request`, message `Service unavailable` (keys only in evidence) |
| Token state post-L-22 | Gitignored token **present** but **expired** — refresh **not** completed |
| API surface (L-22 preflight) | Health **200**; `staging-api-smoke` **PASS** |

**Problem statement (canonical):**

> After L-18 API surface correction **PASS**, the staging auth **login route is reachable** but operator **token refresh fails** with HTTP **500** (`Service unavailable` / `auth_invalid_request`). This blocks L-21-class full snapshot capture and leaves Runtime Doctor / observability staging proof **NOT VERIFIED**.

**CORE10-L23-PROBLEM-001:** **FILED**

---

## 3. Evidence chain — CORE10-L23-CHAIN-001

| L-step | Document | Relevant outcome |
|--------|----------|------------------|
| **L-18** | [API surface redeploy evidence](./ZORA_WALAT_L18_STAGING_API_SURFACE_CORRECTION_REDEPLOY_EVIDENCE_2026_05_30.md) | Redeploy **PASS**; health **200 JSON**; smoke **PASS**; `login_route` not **404** |
| **L-19** | [Token refresh after API pass](./ZORA_WALAT_L19_CORE10_TOKEN_REFRESH_AFTER_API_SURFACE_PASS_EVIDENCE_2026_05_30.md) | `LOGIN_HTTP` **200**; token file updated; `status-check` **200** / `FULFILLED` |
| **L-20** | [Full snapshot authorization gate](./ZORA_WALAT_L20_CORE10_FULL_READONLY_STAGING_SNAPSHOT_AUTHORIZATION_GATE_2026_05_30.md) | L-21 capture policy **FILED**; no execution |
| **L-21** | [Full snapshot capture evidence](./ZORA_WALAT_L21_CORE10_FULL_READONLY_STAGING_SNAPSHOT_CAPTURE_EVIDENCE_2026_05_30.md) | **BLOCKED_TOKEN** — token **expired** at preflight; snapshot **NOT STARTED** |
| **L-22** | [Token refresh after L-21 BLOCKED_TOKEN](./ZORA_WALAT_L22_CORE10_TOKEN_REFRESH_AFTER_L21_BLOCKED_TOKEN_EVIDENCE_2026_05_31.md) | Creds present; `login` HTTP **500**; token still **expired** |

**Inference (conservative):** L-19 **SUCCESS** proves login **can** work on staging when surface + deps align. L-22 **500** is a **regression or dependency drift** after token expiry — **not** proven to be operator credential typo alone (H2 unconfirmed).

**CORE10-L23-CHAIN-001:** **FILED**

---

## 4. Hypothesis matrix — CORE10-L23-HYPOTHESIS-001

| ID | Hypothesis | Description | L-22 signal | L-24 read-only test (define only) |
|----|------------|-------------|-------------|-----------------------------------|
| **H1** | Invalid/missing server auth env | Staging deployment missing `JWT_SECRET`, session secret, or auth-related env | **500** generic message | Boolean env **presence** on deployment (names only, no values) |
| **H2** | Operator credential mismatch | Email/password wrong vs staging user DB | L-19 worked historically; L-22 creds **present** | Compare **boolean** local cred presence only — **no** password print; **no** login retry in L-24 unless separately authorized |
| **H3** | Auth route dependency unavailable | Upstream module (email service, bcrypt, rate store) throws | **500** not **401** | Source-route inspection; dependency import graph |
| **H4** | Database/session dependency issue | Prisma/DB connection or user lookup fails at login | Health OK; login **500** | Read-only DB connectivity enum from logs or health sub-probes if exposed |
| **H5** | Staging deployment env drift | Vercel project env changed since L-19 | Temporal gap L-19 → L-22 | Deployment metadata + env **name** list (no values) |
| **H6** | Auth handler regression | Code change in login handler since L-19 merge | Possible | `git log` / source diff on `api/auth/login` path (repo read-only) |
| **H7** | Runtime secret mapping mismatch | Secret exists in dashboard but wrong variable name for runtime | Related H1/H5 | Vercel env key presence vs `process.env` references in source |
| **H8** | Rate-limit/service protection issue | Edge or app-level throttle returns **500** | Message `Service unavailable` | Vercel/runtime logs for rate-limit markers (redacted) |
| **H9** | Route works but internal auth adapter fails | HTTP layer OK; adapter throws before proper **401** | **500** + `auth_invalid_request` | Stack/log correlation in read-only log pull |

**Default until L-24:** **INCONCLUSIVE** — do not rank a single root cause in L-23.

**CORE10-L23-HYPOTHESIS-001:** **FILED**

---

## 5. L-23 scope — CORE10-L23-SCOPE-001

| In scope (L-23) | Out of scope (L-23) |
|-----------------|---------------------|
| Problem statement + evidence chain | Runtime diagnosis **execution** |
| Hypothesis matrix H1–H9 | `login` / token refresh |
| L-24 phrase + allowed/forbidden lists | Full snapshot capture |
| Read-only diagnosis **plan** (define) | Runtime Doctor execution |
| Abort / rollback / evidence matrix | Observability capture |
| Conservative verdict | Deploy / redeploy |
| Governance index updates | Env / Vercel / secrets **edit** |
| | DB / payment / provider mutation |

**CORE10-L23-SCOPE-001:** **FILED** — Ap786 governance only.

---

## 6. Future L-24 authorization phrase — CORE10-L23-FUTURE-PHRASE-001

```
APPROVE L-24 READ-ONLY STAGING AUTH LOGIN HTTP 500 DIAGNOSIS ONLY
```

| Rule | L-23 session |
|------|-------------|
| Phrase in this document | **Policy only** — **NOT** L-23 authorization |
| L-23 runs diagnosis? | **NO** |
| L-23 runs login? | **NO** |

**CORE10-L23-FUTURE-PHRASE-001:** **DEFINED** (execution **PENDING**)

---

## 7. Future L-24 allowed scope (DEFINE ONLY) — CORE10-L23-L24-ALLOWED-001

After **separate** L-24 operator authorization:

| # | Allowed action | Notes |
|---|----------------|-------|
| L24-1 | Verify clean synced main or approved L-24 evidence branch | — |
| L24-2 | `GET /api/health` | Enum HTTP status only |
| L24-3 | `staging-api-smoke` | Abort if **FAIL** or `login_route` **404** |
| L24-4 | Vercel runtime log inspection | **Read-only**; redact secrets before Ap786 |
| L24-5 | Deployment / env **presence** boolean checks | Variable **names** only — **no** values |
| L24-6 | Source-route inspection | Repo read-only on auth login handler + deps |
| L24-7 | One safe auth dependency diagnosis | **Non-mutating** only (e.g. read-only connectivity enum) |
| L24-8 | Redacted diagnosis transcript under Ap786 evidence dir | No token/password/JWT in git |
| L24-9 | Update blocker register + evidence PR | Conservative verdict per hypothesis |

**CORE10-L23-L24-ALLOWED-001:** **FILED**

---

## 8. Future L-24 forbidden scope (DEFINE ONLY) — CORE10-L23-L24-FORBIDDEN-001

| # | Forbidden |
|---|-----------|
| F1 | Deploy / redeploy / `vercel deploy` |
| F2 | Vercel dashboard / settings / env mutation |
| F3 | `login` / token refresh retry |
| F4 | Full read-only staging snapshot |
| F5 | Runtime Doctor execution (live or new fixture run) |
| F6 | Observability capture beyond redacted log enums |
| F7 | DB write, migration, webhook replay |
| F8 | Stripe / Reloadly / provider money-moving calls |
| F9 | Payment / order / wallet **mutation** |
| F10 | Self-healing / auto-repair apply |
| F11 | Token or password print/read into evidence |
| F12 | Commit `.env.local`, `.staging-token.local` |
| F13 | Production / pilot / real-money / market-ready claims |

**CORE10-L23-L24-FORBIDDEN-001:** **FILED**

---

## 9. Read-only diagnosis plan (future L-24) — CORE10-L23-L24-PLAN-001

### Phase 0 — Preflight (abort if fail)

1. Confirm git clean base on synced `main` or approved branch.
2. `GET /api/health` → expect **200**.
3. `staging-api-smoke` → expect **PASS**; `login_route` **not 404**.
4. **Do not** run `login`.

### Phase 1 — Surface vs handler (H6, H9)

1. Inspect auth login handler source path and error mapping for **500** vs **401**.
2. Document whether `Service unavailable` maps to known catch-all path.

### Phase 2 — Deployment env presence (H1, H5, H7)

1. Read-only Vercel project metadata for staging API project.
2. Boolean checklist: required auth env **names** referenced in source — **no values**.

### Phase 3 — Runtime logs (H3, H4, H8, H9)

1. Pull redacted runtime logs for `/api/auth/login` window aligned with L-22 attempt timestamp class.
2. Classify: DB timeout, missing env, unhandled exception, rate limit — enum only.

### Phase 4 — Dependency diagnosis (H3, H4) — at most one non-mutating probe

1. If approved tooling exists and is **read-only**, run **one** safe dependency enum (e.g. health sub-route or documented read-only probe).
2. **Abort** if probe implies write or external mutation.

### Phase 5 — Evidence filing

1. Transcript: `Ap786/evidence/core10-l24-staging-auth-login-http500-diagnosis-2026-05-31/l24_diagnosis_transcript_redacted.txt` (path reserved).
2. Evidence doc: `ZORA_WALAT_L24_CORE10_STAGING_AUTH_LOGIN_HTTP500_DIAGNOSIS_EVIDENCE_2026_05_31.md` (future).
3. Update hypothesis table: each H1–H9 → `CONFIRMED` / `RULED_OUT` / `INCONCLUSIVE`.

**CORE10-L23-L24-PLAN-001:** **FILED** (plan only)

---

## 10. Suggested CORE10-L24 evidence IDs

| ID | Artifact |
|----|----------|
| CORE10-L24-AUTH-001 | Verbatim L-24 phrase |
| CORE10-L24-SMOKE-PREFLIGHT-001 | Smoke + health **PASS** |
| CORE10-L24-LOG-001 | Redacted Vercel/runtime log enums |
| CORE10-L24-ENV-PRESENCE-001 | Auth env name presence matrix (no values) |
| CORE10-L24-SOURCE-001 | Login handler route inspection summary |
| CORE10-L24-HYPOTHESIS-001 | H1–H9 disposition table |
| CORE10-L24-NO-MUTATION-001 | No deploy/login/snapshot attestation |
| CORE10-L24-VERDICT-001 | Conservative diagnosis verdict |

---

## 11. Abort rules — CORE10-L23-ABORT-CRITERIA-001

| # | Condition (L-24 execution) |
|---|---------------------------|
| A1 | `staging-api-smoke` **FAIL** or `login_route` **404** |
| A2 | Any step requests deploy, env edit, or `login` |
| A3 | Secret/token/password in output — stop and redact |
| A4 | Probe implies DB write or provider mutation |
| A5 | `secrets:scan` fails on tracked files |
| A6 | Non-Ap786 files in evidence PR (except defined evidence paths) |
| A7 | Second login attempt in same L-24 session without new phrase |

**L-23 session:** N/A runtime — gate docs only.

**CORE10-L23-ABORT-CRITERIA-001:** **FILED**

---

## 12. Evidence matrix — CORE10-L23-MATRIX-001

| Artifact | L-22 (facts) | L-23 gate | Future L-24 |
|----------|--------------|-----------|-------------|
| Login HTTP **500** | **FILED** | Referenced | Re-validate context only — **no** login in L-24 unless separately approved |
| Hypothesis H1–H9 | — | **DEFINED** | Disposition required |
| Vercel logs | — | Plan only | Redacted transcript |
| Env presence booleans | — | Plan only | Name matrix only |
| Source inspection | — | Plan only | Summary in evidence |
| Token refresh | **FAILED** | **NOT IN SCOPE** | **FORBIDDEN** in L-24 |
| Full snapshot | **NOT EXECUTED** | **NOT IN SCOPE** | **FORBIDDEN** |
| Root cause claim | — | **INCONCLUSIVE** | Conservative enum only |

**CORE10-L23-MATRIX-001:** **FILED**

---

## 13. Rollback notes — CORE10-L23-ROLLBACK-001

| Scenario | Action |
|----------|--------|
| L-23 docs error | Revert L-23 PR — Ap786 only |
| L-23 runtime | **N/A** — no runtime in L-23 |
| Future L-24 bad evidence | `git revert` evidence PR; delete local raw log exports |
| Future L-24 overreach (login/deploy) | Stop session; file **ABORTED** evidence; do not merge |

**CORE10-L23-ROLLBACK-001:** **FILED**

---

## 14. Dependencies

| Dependency | Status |
|------------|--------|
| PR #137 (L-22) merged | **DONE** (`d27dc1a`) |
| PR #136 (L-21) merged | **DONE** |
| PR #135 (L-20) merged | **DONE** |
| L-18 API surface **PASS** | **DONE** (prerequisite) |
| L-19 token **SUCCESS** (historical) | **DONE** — superseded by expired token + L-22 **500** |
| Future L-24 verbatim phrase | **PENDING** |
| **CORE10-BLK-CAPTURE-001** | **OPEN** |

---

## 15. L-23 session attestations

| Attestation | Status |
|-------------|--------|
| Ap786 gate only | **YES** |
| No login / token refresh | **YES** |
| No snapshot / doctor / obs execution | **YES** |
| No deploy / env edit | **YES** |
| L-24 phrase not granted in L-23 | **YES** |

---

## 16. Final conservative verdict — CORE10-L23-VERDICT-001

| Item | Verdict |
|------|---------|
| L-23 diagnosis gate | **FILED** |
| Runtime diagnosis | **NOT EXECUTED** |
| Token refresh retry | **NOT EXECUTED** |
| Full snapshot | **NOT EXECUTED** |
| Runtime Doctor staging proof | **NOT VERIFIED** |
| Observability proof | **NOT VERIFIED** |
| Self-healing apply | **DISABLED / NOT ENABLED** |
| Production readiness | **NO-GO** |
| Real-money readiness | **NO-GO** |
| Controlled pilot | **NO-GO** |
| Market launch | **NO-GO** |

**Canonical sentence:**

> L-23 diagnosis gate: **FILED**. Runtime diagnosis **NOT EXECUTED**; token refresh retry **NOT EXECUTED**; full snapshot **NOT EXECUTED**; Runtime Doctor and observability staging proof **NOT VERIFIED**; production / real-money / controlled pilot / market launch: **NO-GO**.

**CORE10-L23-VERDICT-001:** **FILED**

---

## 17. Cross-links

| Document | Role |
|----------|------|
| [L-22 evidence](./ZORA_WALAT_L22_CORE10_TOKEN_REFRESH_AFTER_L21_BLOCKED_TOKEN_EVIDENCE_2026_05_31.md) | Trigger **500** |
| [L-21 evidence](./ZORA_WALAT_L21_CORE10_FULL_READONLY_STAGING_SNAPSHOT_CAPTURE_EVIDENCE_2026_05_30.md) | **BLOCKED_TOKEN** |
| [Capture blocker](./ZORA_WALAT_CORE10_CAPTURE_BLOCKER_OR_ABORT_RECORD_2026_05_30.md) | **CORE10-BLK-CAPTURE-001** |
| [Blocker register](./ZORA_WALAT_PRODUCTION_READINESS_BLOCKER_REGISTER_2026_05_22.md) | **CORE10-STAGING-DOCTOR-OBS-001** |
