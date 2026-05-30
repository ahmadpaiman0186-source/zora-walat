# L-18 — Staging API Surface Correction Redeploy From Server Only Evidence

**Date:** 2026-05-30  
**Roadmap:** Zora-Walat L-1 … L-150 Global Engineering / Super-System  
**L-step:** **L-18** — Staging API surface correction redeploy + read-only verify  
**Branch:** `evidence/l18-staging-api-surface-correction-redeploy-2026-05-30`  
**Base:** `633bae9` — Merge PR #132 (L-17 redeploy approval gate)  
**Transcript:** [l18_redeploy_transcript_redacted.txt](./evidence/core10-l18-api-surface-redeploy-2026-05-30/l18_redeploy_transcript_redacted.txt)

---

## 1. Authorization — CORE10-L18-AUTH-001

| Field | Value |
|-------|-------|
| Required phrase (verbatim) | `APPROVE L-18 STAGING API SURFACE CORRECTION REDEPLOY FROM SERVER ONLY` |
| Provided in operator task? | **YES** |
| **CORE10-L18-AUTH-001** | **PASS** |

### Scope honored

| Allowed | Executed? |
|---------|-----------|
| Predeploy guard from `server/` | **YES** |
| Exactly **one** redeploy | **YES** |
| Read-only health + `staging-api-smoke` | **YES** |
| Redacted Ap786 evidence | **YES** |

| Forbidden | Status |
|-----------|--------|
| Second redeploy | **NO** |
| Root / frontend deploy | **NO** |
| Vercel settings / env edit | **NO** |
| `login` / token refresh / `status-check` | **NO** |
| Full snapshot | **NOT EXECUTED** |
| DB / payment / Stripe / Reloadly | **NO** |

---

## 2. Predeploy guard — CORE10-L18-PREDEPLOY-GUARD-001

| Field | Value |
|-------|-------|
| Command | `npm run deploy:staging:guard` |
| `DEPLOY_GUARD_PASS` | **true** |
| `DEPLOY_GUARD_ROOT` | `server_api_project` |
| Vercel project | `zora-walat-api-staging` |
| Monorepo root Next deploy | **Blocked** |

**CORE10-L18-PREDEPLOY-GUARD-001:** **PASS**

---

## 3. Vercel target — CORE10-L18-VERCEL-TARGET-001

| Field | Value |
|-------|-------|
| Project | `zora-walat-api-staging` |
| Scope | `ahmadpaiman0186-sources-projects/zora-walat-api-staging` |
| Working directory | `server/` only |
| Production live-money app | **NOT** targeted |

**CORE10-L18-VERCEL-TARGET-001:** **PASS**

---

## 4. Redeploy — CORE10-L18-REDEPLOY-001

| Field | Value |
|-------|-------|
| Command | `npm run deploy:staging` |
| Redeploy count | **1** |
| Deployment id | `dpl_7MLPajMPygfHLrpi9k5z11en7pze` |
| Deployment URL | `https://zora-walat-api-staging-5ggb001zm.vercel.app` |
| Alias | `https://zora-walat-api-staging.vercel.app` |
| Ready state | **READY** |
| Exit code | **0** |

**CORE10-L18-REDEPLOY-001:** **PASS**

---

## 5. Post-deploy health — CORE10-L18-HEALTH-001

| Field | Value |
|-------|-------|
| Request | `GET /api/health` on staging API alias |
| HTTP status | **200** |
| Content-Type | `application/json` |
| Body | `{"status":"ok"}` (status field only) |

**Before L-18 (L-16):** **404** `nextjs_frontend`.  
**After L-18:** API JSON — surface correction **observed**.

**CORE10-L18-HEALTH-001:** **PASS**

---

## 6. Post-deploy smoke — CORE10-L18-SMOKE-001

| Probe | HTTP | Diagnosis |
|-------|------|-----------|
| `health` | **200** | `ok` |
| `index` | **200** | `ok` |
| `login_route` | **400** | `validation_error` (route **reachable**) |
| `operator_status_route` | **401** | `auth_required` |
| `operator_phase1_truth_route` | **401** | `auth_required` |

| Field | Value |
|-------|-------|
| `STAGING_API_SMOKE_VERDICT` | **PASS** |
| `API_SURFACE_LIKELY` | `api_serverless` |

**CORE10-L18-SMOKE-001:** **PASS**

---

## 7. L-14 / L-16 reconciliation

| Step | Outcome |
|------|---------|
| L-16 pre-redeploy | Smoke **FAIL** all **404** |
| L-14 login **404** | Explained by surface — **not** credentials alone |
| L-18 post-redeploy | `/api/auth/login` route **reachable** (smoke **400**, not **404**) |
| Token refresh | **NOT EXECUTED** in L-18 — separate L-14 retry authorized |

---

## 8. No-mutation — CORE10-L18-NO-MUTATION-001

| Domain | Mutated? |
|--------|----------|
| Vercel settings / env dashboard | **NO** |
| Repo `.env*` tracked files | **NO** |
| DB / payment / orders | **NO** |
| Stripe / Reloadly | **NO** |
| Token / password in evidence | **NO** |

**CORE10-L18-NO-MUTATION-001:** **PASS**

---

## 9. Redaction — CORE10-L18-REDACTION-001

Transcript filed with no secrets. Dotenv loader banners omitted from committed transcript.

**CORE10-L18-REDACTION-001:** **PASS**

---

## 10. Evidence artifact summary

| ID | Result |
|----|--------|
| CORE10-L18-AUTH-001 | **PASS** |
| CORE10-L18-PREDEPLOY-GUARD-001 | **PASS** |
| CORE10-L18-VERCEL-TARGET-001 | **PASS** |
| CORE10-L18-REDEPLOY-001 | **PASS** |
| CORE10-L18-HEALTH-001 | **PASS** |
| CORE10-L18-SMOKE-001 | **PASS** |
| CORE10-L18-REDACTION-001 | **PASS** |
| CORE10-L18-NO-MUTATION-001 | **PASS** |
| CORE10-L18-VERDICT-001 | **PASS** (surface only) |

---

## 11. Final conservative verdict — CORE10-L18-VERDICT-001

| Item | Verdict |
|------|---------|
| L-18 staging API surface correction | **PASS** |
| Hosted login route reachable (smoke) | **YES** (not **404**) |
| Token refresh completed | **NO** (out of scope) |
| Full snapshot | **NOT EXECUTED** |
| Runtime Doctor staging proof | **NOT VERIFIED** |
| Observability proof | **NOT VERIFIED** |
| Self-healing apply | **DISABLED / NOT ENABLED** |
| Production / real-money / controlled pilot / market launch | **NO-GO** |

**Canonical sentence:**

> L-18 authorized: **one** redeploy from `server/` to `zora-walat-api-staging`; health **200 JSON**; smoke **PASS**; login route **not** 404. Token refresh and full snapshot **NOT EXECUTED**. Production / real-money / controlled pilot / market launch: **NO-GO**.

**CORE10-L18-VERDICT-001:** **PASS** (deploy/smoke only — **not** launch readiness)

---

## 12. Next gated step

| Step | Authorization |
|------|----------------|
| L-14 token refresh retry | `APPROVE L-14 READ-ONLY STAGING OPERATOR CREDENTIAL LOCAL SETUP AND TOKEN REFRESH ONLY` (or successor) after creds confirmed |
| L-16 re-verify (optional) | Read-only smoke — expected **PASS** post-L-18 |
| Full snapshot | Separate CORE-10 capture phrase |

---

## 13. Rollback reference

| Field | Value |
|-------|-------|
| Prior L-10 deployment (reference) | `dpl_BqvndARx6oY3XKNLW3ernxuRX9Gy` |
| L-18 deployment | `dpl_7MLPajMPygfHLrpi9k5z11en7pze` |

Promote prior deployment via Vercel dashboard if L-18 must be rolled back (operator action).

---

## 14. Related documents

| Document | Role |
|----------|------|
| [L-17 gate](./ZORA_WALAT_L17_CORE10_STAGING_API_SURFACE_CORRECTION_REDEPLOY_APPROVAL_GATE_2026_05_30.md) | Policy |
| [L-16 verify](./ZORA_WALAT_L16_CORE10_STAGING_AUTH_LOGIN_ROUTE_SURFACE_VERIFICATION_EVIDENCE_2026_05_30.md) | Pre-redeploy **FAIL** |
| [L-10 redeploy](./ZORA_WALAT_L10_STAGING_API_SURFACE_CORRECTION_REDEPLOY_EVIDENCE_2026_05_30.md) | Prior **PASS** baseline |

---

*End of L-18 evidence.*
