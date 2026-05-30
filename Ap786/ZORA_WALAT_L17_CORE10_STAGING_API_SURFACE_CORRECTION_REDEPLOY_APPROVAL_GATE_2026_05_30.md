# L-17 — CORE-10 Staging API Surface Correction Redeploy Approval Gate

**Date:** 2026-05-30  
**Roadmap:** Zora-Walat L-1 … L-150 Global Engineering / Super-System  
**L-step:** **L-17** — Staging API Surface Correction **Redeploy Approval Gate** (policy only)  
**Branch (this pack):** `docs/l17-core10-staging-api-surface-correction-redeploy-approval-gate-2026-05-30`  
**Base:** `fab2648` — L-16 route surface verification evidence merged (PR #131 lineage)  

---

## 1. L-step identity — CORE10-L17-GATE-001

| Field | Value |
|-------|-------|
| Title | **L-17 CORE-10 Staging API Surface Correction Redeploy Approval Gate** |
| L-step | **L-17** |
| Trigger | [L-16](./ZORA_WALAT_L16_CORE10_STAGING_AUTH_LOGIN_ROUTE_SURFACE_VERIFICATION_EVIDENCE_2026_05_30.md) — smoke **FAIL** all probes **404** / `nextjs_frontend` |
| L-17 role | Define **future L-18** redeploy boundary — **no** deploy in L-17 |

**CORE10-L17-GATE-001:** **FILED**

---

## 2. Why redeploy is required

| Observation (L-16) | Implication |
|--------------------|-------------|
| `staging-api-smoke` → **FAIL** | `route_missing_or_wrong_deployment` |
| `API_SURFACE_LIKELY=nextjs_frontend` | Hosted `zora-walat-api-staging` alias serves **frontend**, not API |
| `/api/health`, `/api/auth/login`, operator routes → **404** HTML | Not API JSON / auth handlers |
| `deploy:staging:guard` → **PASS** | Local `server/` layout is **correct** for API deploy |
| [L-14](./ZORA_WALAT_L14_CORE10_STAGING_OPERATOR_CREDENTIAL_TOKEN_REFRESH_EVIDENCE_2026_05_30.md) login **404** | Consistent with surface misrouting — **not** cred-only |
| [L-10](./ZORA_WALAT_L10_STAGING_API_SURFACE_CORRECTION_REDEPLOY_EVIDENCE_2026_05_30.md) prior **PASS** | Surface **regressed** since L-10 — redeploy from `server/` again required |

| Blocker | Status |
|---------|--------|
| Token refresh | **NOT COMPLETED** |
| **CORE10-BLK-CAPTURE-001** | **OPEN** |
| Runtime Doctor / observability staging | **NOT VERIFIED** |

Redeploy is required to restore **API serverless** surface on the **staging API Vercel project** — not monorepo root Next.js deploy.

---

## 3. L-17 scope — CORE10-L17-SCOPE-001

| In scope | Out of scope |
|----------|--------------|
| L-17 approval gate / governance | `vercel deploy` execution |
| L-18 phrase definition (reference only) | Vercel dashboard / settings mutation |
| Future L-18 allowed/forbidden lists | Env / `.env*` / secrets edit |
| Predeploy guard + one-redeploy limit policy | `login` / token refresh |
| Rollback / abort / evidence matrix | `status-check` |
| | Full staging snapshot export |
| | DB / Stripe / Reloadly / provider mutation |
| | Self-healing apply |
| | Production / live-money deploy |

**CORE10-L17-SCOPE-001:** **FILED** — docs only.

---

## 4. Future L-18 authorization phrase — CORE10-L17-FUTURE-PHRASE-001

```
APPROVE L-18 STAGING API SURFACE CORRECTION REDEPLOY FROM SERVER ONLY
```

| Rule | L-17 session |
|------|-------------|
| Phrase in this document | **Policy only** — **NOT** L-17 authorization |
| L-17 executes redeploy? | **NO** |
| L-17 mutates Vercel? | **NO** |

**CORE10-L17-FUTURE-PHRASE-001:** **DEFINED** (execution **PENDING**)

---

## 5. Future L-18 allowed scope (DEFINE ONLY)

| Constraint | Requirement |
|------------|-------------|
| Working directory | **`server/` only** |
| Vercel project | **Staging API** — `zora-walat-api-staging` (not frontend `zora-walat` / `zora-walat-mj41`) |
| Deploy count | **Exactly one** `npm run deploy:staging` (guard + deploy) per L-18 session |
| Predeploy | `npm run deploy:staging:guard` → **PASS** |
| Post-deploy (read-only) | `staging-api-smoke` + `GET /api/health` enum only |
| Env / Vercel settings | **No** edit unless **separately** approved |
| Token / snapshot | **Out of scope** for L-18 |

### Suggested future L-18 evidence IDs

| ID | Artifact |
|----|----------|
| CORE10-L18-AUTH-001 | Verbatim L-18 phrase |
| CORE10-L18-PREDEPLOY-GUARD-001 | Guard result |
| CORE10-L18-VERCEL-TARGET-001 | Project target attestation |
| CORE10-L18-REDEPLOY-001 | Redeploy count = 1 |
| CORE10-L18-HEALTH-001 | Health JSON 200 |
| CORE10-L18-SMOKE-001 | Smoke **PASS**; `login_route` not **404** |
| CORE10-L18-REDACTION-001 | Redacted transcript |
| CORE10-L18-NO-MUTATION-001 | No env/DB/payment mutation |
| CORE10-L18-VERDICT-001 | Conservative verdict |

---

## 6. Predeploy guard requirements

| # | Requirement |
|---|-------------|
| G1 | `cd server` before guard and deploy |
| G2 | `npm run deploy:staging:guard` exit **0**, `DEPLOY_GUARD_PASS true` |
| G3 | `server/vercel.json` routes to `api/index.mjs` |
| G4 | **No** deploy from repo root (Next.js `vercel.json`) |
| G5 | Clean git state on approved L-18 evidence branch (Ap786 + deploy evidence only) |

---

## 7. One-redeploy limit

| Rule | Enforcement |
|------|-------------|
| Maximum deploys per L-18 authorization | **1** |
| Second deploy without new phrase | **Abort** |
| Production / live-money project | **Forbidden** |
| Rollback reference | Record deployment id from transcript (redacted public alias ok) |

---

## 8. Future L-18 forbidden actions

| # | Forbidden |
|---|-----------|
| F1 | Second redeploy in same session |
| F2 | Deploy from monorepo root |
| F3 | Frontend Vercel project deploy to API alias |
| F4 | Vercel env / settings UI edit (default) |
| F5 | Full snapshot export |
| F6 | `login` / token refresh / `status-check` (separate L-steps) |
| F7 | DB / payment / Stripe / Reloadly / provider calls |
| F8 | Self-healing apply |
| F9 | Production / real-money / pilot / market-ready claims |

---

## 9. Abort rules — CORE10-L17-ABORT-CRITERIA-001

| # | Condition |
|---|-----------|
| A1 | Guard fails or wrong deploy root |
| A2 | Deploy count > 1 without new authorization |
| A3 | Env / Vercel settings edit requested |
| A4 | Full snapshot starts |
| A5 | Login with real credentials in same session |
| A6 | Secret in committed transcript |
| A7 | Non-Ap786 files in evidence PR (except deploy transcript paths under Ap786) |
| A8 | `secrets:scan` fails |

**CORE10-L17-ABORT-CRITERIA-001:** **FILED**

---

## 10. Rollback plan

| Scenario | Action |
|----------|--------|
| L-17 docs error | Revert L-17 PR — Ap786 only |
| L-17 runtime | **N/A** |
| Future L-18 bad deploy | Vercel dashboard promote prior deployment (operator); record id from L-10/L-18 evidence |
| Post-L-18 smoke still FAIL | **Do not** auto-redeploy; new authorization required |

---

## 11. Evidence matrix (L-17 vs future L-18)

| Artifact | L-17 | Future L-18 |
|----------|------|-------------|
| Approval gate doc | **FILED** | N/A |
| Authorization phrase | Defined | **Required** in chat |
| `deploy:staging:guard` | **Not run** | **Required** |
| `vercel deploy` | **Not run** | **Once** if approved |
| `staging-api-smoke` | L-16 **FAIL** baseline | **Required** post-deploy |
| Redacted transcript | N/A | **Required** |
| Token refresh | **NOT COMPLETED** | Out of scope |

---

## 12. Go / no-go matrix

| Gate | Status |
|------|--------|
| L-17 approval gate filed | **YES** (this pack) |
| L-18 redeploy | **NO-GO** until phrase + execution |
| L-16 re-verify after L-18 | **PENDING** |
| Token refresh (L-14 retry) | **NO-GO** until smoke **PASS** |
| Full snapshot | **NO-GO** |
| Production / real-money / pilot / market | **NO-GO** |

---

## 13. Dependencies

| Dependency | Status |
|------------|--------|
| L-16 verification **FAIL** recorded | **DONE** |
| L-15 investigation gate | **DONE** |
| L-10 prior redeploy evidence (baseline) | **DONE** |
| `server/` deploy tooling | **AVAILABLE** |
| Future L-18 verbatim phrase | **PENDING** |

---

## 14. L-17 session attestations

| Attestation | Status |
|-------------|--------|
| Ap786 gate only | **YES** |
| No deploy / Vercel mutation | **YES** |
| No login / token / snapshot | **YES** |
| L-18 phrase not granted in L-17 | **YES** |

---

## 15. Final conservative verdict — CORE10-L17-VERDICT-001

| Item | Verdict |
|------|---------|
| L-17 approval gate | **FILED** |
| Redeploy executed | **NOT EXECUTED** |
| Hosted API surface corrected | **NO** |
| Token refresh | **NOT COMPLETED** |
| Full snapshot | **NOT EXECUTED** |
| Runtime Doctor staging proof | **NOT VERIFIED** |
| Observability proof | **NOT VERIFIED** |
| Self-healing apply | **DISABLED / NOT ENABLED** |
| Production / real-money / controlled pilot / market launch | **NO-GO** |

**Canonical sentence:**

> L-17 gate: **FILED**. L-16 proved hosted staging API surface **broken** (404 / `nextjs_frontend`). Redeploy: **NOT EXECUTED**. Token refresh and full snapshot: **NOT READY**. Production / real-money / controlled pilot / market launch: **NO-GO**.

**CORE10-L17-VERDICT-001:** **FILED**

---

## 16. Related documents

| Document | Role |
|----------|------|
| [L-16 evidence](./ZORA_WALAT_L16_CORE10_STAGING_AUTH_LOGIN_ROUTE_SURFACE_VERIFICATION_EVIDENCE_2026_05_30.md) | Read-only verify **FAIL** |
| [L-10 redeploy](./ZORA_WALAT_L10_STAGING_API_SURFACE_CORRECTION_REDEPLOY_EVIDENCE_2026_05_30.md) | Prior correction **PASS** |
| [L-9 gate](./ZORA_WALAT_L9_CORE10_STAGING_API_SURFACE_CORRECTION_REDEPLOY_APPROVAL_GATE_2026_05_30.md) | L-10 phrase predecessor |

---

*End of L-17 approval gate.*
