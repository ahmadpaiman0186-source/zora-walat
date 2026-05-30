# L-15 — CORE-10 Staging Auth Login Route Surface Investigation Gate

**Date:** 2026-05-30  
**Roadmap:** Zora-Walat L-1 … L-150 Global Engineering / Super-System  
**L-step:** **L-15** — Staging Auth Login Route Surface **Investigation Gate** (policy only)  
**Branch (this pack):** `docs/l15-core10-staging-auth-login-route-surface-investigation-gate-2026-05-30`  
**Base:** `c87703e` — Merge PR #129 (L-14 credential/token refresh **FAILED**)  

---

## 1. Title and identity — CORE10-L15-GATE-001

| Field | Value |
|-------|-------|
| Title | **L-15 CORE-10 Staging Auth Login Route Surface Investigation Gate** |
| Trigger | [L-14](./ZORA_WALAT_L14_CORE10_STAGING_OPERATOR_CREDENTIAL_TOKEN_REFRESH_EVIDENCE_2026_05_30.md) — creds OK; `login` **FAILED** HTTP **404** |
| L-15 role | Investigation / governance / runbook — **no** runtime execution |

**CORE10-L15-GATE-001:** **FILED**

---

## 2. Current blocker (from L-14)

| Finding | Value |
|---------|-------|
| `HAS_EMAIL` / `HAS_PASSWORD` | **true** |
| `LOGIN_HTTP` | **404** |
| `ROUTE_DIAGNOSIS` | `route_missing_or_wrong_deployment` |
| `API_SURFACE_LIKELY` | `nextjs_frontend` |
| Token refresh | **NOT COMPLETED** |
| `status-check` | **SKIPPED** |
| Full snapshot | **NOT EXECUTED** |

**Contrast (L-10 post-redeploy):** `GET /api/health` **200 JSON**; `staging-api-smoke` **PASS**; `login_route` probe **POST** empty body → **400** `validation_error` (route **reachable** on API surface).

**Open question for L-16:** Why did L-14 full `login` (with credentials) classify as **404 / nextjs_frontend** while L-10 smoke expected login route on same host?

---

## 3. L-15 scope — CORE10-L15-SCOPE-001

| In scope | Out of scope |
|----------|--------------|
| Root-cause hypothesis matrix | Deploy / redeploy |
| Route/source ownership map | Env / Vercel settings / secrets edit |
| Staging surface verification **plan** | `login` with real credentials |
| Future L-16 read-only check list | Token refresh / `status-check` |
| Abort / rollback policy | Full snapshot export |
| Ap786 governance updates | DB / payment / Stripe / Reloadly / provider |

**CORE10-L15-SCOPE-001:** **FILED** — investigation gate only.

---

## 4. Root-cause hypothesis matrix — CORE10-L15-HYPOTHESIS-001

| ID | Hypothesis | Evidence for | Evidence against | L-16 disproof test (read-only) |
|----|------------|--------------|----------------|-------------------------------|
| H1 | **Wrong deployment on API alias** — monorepo root / Next.js (`vercel.json` framework) serving `zora-walat-api-staging.vercel.app` instead of `server/` API | L-14 `nextjs_frontend`; L-8 pre-L-10 same class | L-10 post-redeploy smoke **PASS** on same alias | `staging-api-smoke` + `GET /api/health` on current alias |
| H2 | **Regression after L-10** — API alias reverted or superseded by frontend deployment | L-14 404 after L-10 PASS | Needs timestamped redeploy log | Compare `vercel inspect` deployment source dir vs `server/` |
| H3 | **Origin mismatch** — operator `login` hit different host than tool default | Unlikely if same `server/` cwd | Tool constant `STAGING_API_BASE` = staging API alias | `auth-env-check` `LOGIN_API_ORIGIN` line (host label only) |
| H4 | **POST body / path divergence** — smoke uses empty POST; login uses JSON body; edge route only registers one | L-10 login_route **400** not **404** | L-14 full login **404** suggests surface not API | Repeat smoke `login_route` probe only |
| H5 | **Local `.vercel` link wrong project** — CLI/deploy guard OK in L-10 but operator session cwd/link differ | Possible if login from wrong tree | L-10 deployed from `server/` | `npm run deploy:staging:guard` from `server/` (no deploy) |
| H6 | **Vercel multi-project Git integration** — frontend projects (`zora-walat`, `zora-walat-mj41`) post failing/rate-limited statuses; confusion vs API project | PR #127 Vercel rate-limit statuses | Separate from commit check runs | Dashboard: which project owns alias |
| H7 | **Slim handler / `api/index.mjs` routing gap** — `POST /api/auth/login` not reached in serverless cold path | Code has slim login in `server/api/index.mjs` | L-10 smoke POST login **400** | Read-only route map + smoke only |
| H8 | **Transient / CDN cache** — stale 404 HTML cached for POST | Intermittent | L-10 sustained PASS | Repeat smoke twice spaced 60s |
| H9 | **Credentials irrelevant** — 404 before auth (not 401) | L-14 diagnosis class | N/A | Empty-body POST probe without secrets |

**Leading hypotheses (conservative):** **H1**, **H2**, **H6** — deployment surface / alias ownership drift.

**CORE10-L15-HYPOTHESIS-001:** **FILED**

---

## 5. Route and source ownership map — CORE10-L15-ROUTE-MAP-001

| Asset | Owner / location | Notes |
|-------|------------------|-------|
| Staging API public alias | `https://zora-walat-api-staging.vercel.app` | Operator tool `STAGING_API_BASE` |
| Vercel project (API) | `zora-walat-api-staging` | L-10 deploy from `server/`; `server/vercel.json` → `/api/index.mjs` |
| Monorepo root Vercel | Repo root `vercel.json` — **Next.js** framework | **Must not** be production alias for API host |
| Login path (canonical) | `POST /api/auth/login` | `server/tools/stagingOperatorAuthEnv.mjs` `LOGIN_API_PATH` |
| Login implementation | `server/api/index.mjs` slim handler; `server/src/app.js` `/api/auth` router | Serverless entry vs full app |
| Health probe | `GET /api/health` | L-10 **200 JSON** |
| Smoke harness | `node tools/staging-auth-checkout-operator.mjs staging-api-smoke` | Probes health, index, login_route, operator routes |
| Operator login | `node tools/staging-auth-checkout-operator.mjs login` | Same origin + path as smoke `login_route` |
| Frontend / preview hosts | `zora-walat`, `zora-walat-mj41` (Vercel contexts) | **Not** auth API surface |

**CORE10-L15-ROUTE-MAP-001:** **FILED**

---

## 6. Staging deployed surface verification plan — CORE10-L15-VERIFY-PLAN-001

Execute only under future **L-16** authorization (read-only):

| Step | Action | Pass signal | Fail signal |
|------|--------|-------------|-------------|
| V1 | `cd server` → `npm run deploy:staging:guard` | `DEPLOY_GUARD_PASS` | Guard fail / wrong tree |
| V2 | `staging-api-smoke` | `STAGING_API_SMOKE_VERDICT PASS` | `route_missing_or_wrong_deployment` |
| V3 | `GET /api/health` (via smoke or curl without secrets) | **200** `application/json` | **404** HTML |
| V4 | `login_route` smoke probe only (empty POST) | **400** validation / **401** class — **not** **404** HTML | **404** `nextjs_frontend` |
| V5 | Optional `vercel inspect` on staging API alias (operator creds) | Deployment linked to **server** project | Root Next deployment |
| V6 | Record redacted transcript; **no** real password login until surface PASS | Enums only | Abort |

**Do not** run V1–V6 in L-15.

**CORE10-L15-VERIFY-PLAN-001:** **FILED**

---

## 7. Future L-16 authorization (policy only) — CORE10-L15-FUTURE-L16-001

```
APPROVE L-16 READ-ONLY STAGING AUTH LOGIN ROUTE SURFACE VERIFICATION ONLY
```

### Allowed in L-16 (define only)

| # | Allowed |
|---|---------|
| L16-1 | Read-only `deploy:staging:guard` (no deploy) |
| L16-2 | `staging-api-smoke` |
| L16-3 | `auth-env-check` (boolean cred flags only — **no** login) |
| L16-4 | Redacted Ap786 evidence |
| L16-5 | Optional `vercel inspect` read-only (operator CLI auth) |

### Forbidden in L-16 (unless separately approved)

| # | Forbidden |
|---|-----------|
| F1 | `login` with real credentials |
| F2 | Token refresh / `status-check` |
| F3 | Deploy / redeploy |
| F4 | Env / Vercel mutation |
| F5 | Full snapshot |
| F6 | DB / payment / provider / Stripe / Reloadly |

**CORE10-L15-FUTURE-L16-001:** **DEFINED** (not executed in L-15)

---

## 8. Explicit boundaries (L-15 session)

| Boundary | L-15 |
|----------|------|
| Deploy / redeploy | **NO** |
| Login / token refresh | **NO** |
| Status-check | **NO** |
| Full snapshot | **NO** |
| Env / config / secrets edit | **NO** |
| Print/read password or token | **NO** |
| DB / payment / provider mutation | **NO** |
| Production / pilot / market claims | **NO** |

---

## 9. Abort conditions — CORE10-L15-ABORT-001

| # | Condition |
|---|-----------|
| A1 | Any step requests deploy without L-10-class phrase |
| A2 | Login with real credentials starts |
| A3 | Full snapshot export starts |
| A4 | Secret/token/password in output |
| A5 | Non-Ap786 files in evidence PR diff |
| A6 | `secrets:scan` fails on tracked sources |

**CORE10-L15-ABORT-001:** **FILED**

---

## 10. Rollback / cleanup

| Scenario | Action |
|----------|--------|
| L-15 docs error | Revert L-15 PR — Ap786 only |
| L-15 runtime | **N/A** |
| Future surface fix | Separate deploy authorization (e.g. L-10 class) — **not** L-15 |

---

## 11. Dependencies

| Dependency | Status |
|------------|--------|
| PR #129 (L-14) merged | **DONE** |
| L-10 API redeploy evidence | **DONE** (health/smoke PASS at L-10 time) |
| L-14 login failure recorded | **DONE** |
| Investigation tooling available | **YES** (not run in L-15) |

---

## 12. Super-System invariants

| Invariant | Status |
|-----------|--------|
| Token refresh | **NOT COMPLETED** |
| Full staging snapshot | **NOT EXECUTED** |
| Runtime Doctor staging proof | **NOT VERIFIED** |
| Observability proof | **NOT VERIFIED** |
| Self-healing apply | **DISABLED / NOT ENABLED** |
| Production / real-money / controlled pilot / market launch | **NO-GO** |

---

## 13. L-15 session attestations

| Attestation | Status |
|-------------|--------|
| Investigation gate only | **YES** |
| No login / deploy / snapshot | **YES** |
| No credential/token exposure | **YES** |

---

## 14. Final conservative verdict — CORE10-L15-VERDICT-001

| Item | Verdict |
|------|---------|
| L-15 investigation gate | **FILED** |
| Root cause resolved | **NO** — hypotheses filed; L-16 verification **PENDING** |
| Credential setup (L-14) | **DONE** (local; not re-tested in L-15) |
| Token refresh | **NOT COMPLETED** |
| Status-check | **NOT EXECUTED** |
| Full snapshot | **NOT EXECUTED** |
| Runtime Doctor staging proof | **NOT VERIFIED** |
| Observability proof | **NOT VERIFIED** |
| Self-healing apply | **DISABLED / NOT ENABLED** |
| Production / real-money / controlled pilot / market launch | **NO-GO** |

**Canonical sentence:**

> L-15 investigation gate: **FILED**. L-14 login **FAILED** 404 (`nextjs_frontend`). Hypothesis matrix and read-only verification plan **FILED** for L-16. No deploy, login, token refresh, status-check, or snapshot in L-15. Production / real-money / controlled pilot / market launch: **NO-GO**.

**CORE10-L15-VERDICT-001:** **FILED**

---

## 15. Related documents

| Document | Role |
|----------|------|
| [L-14 evidence](./ZORA_WALAT_L14_CORE10_STAGING_OPERATOR_CREDENTIAL_TOKEN_REFRESH_EVIDENCE_2026_05_30.md) | Failed login 404 |
| [L-10 redeploy](./ZORA_WALAT_L10_STAGING_API_SURFACE_CORRECTION_REDEPLOY_EVIDENCE_2026_05_30.md) | Prior surface PASS |
| [L-13 gate](./ZORA_WALAT_L13_CORE10_STAGING_OPERATOR_CREDENTIAL_GAP_RESOLUTION_GATE_2026_05_30.md) | Credential policy |

---

*End of L-15 investigation gate.*
