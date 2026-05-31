# L-25 — Staging API Surface Correction Redeploy From Server Only Evidence

**Date:** 2026-05-31  
**Roadmap:** Zora-Walat L-1 … L-150 Global Engineering / Super-System  
**L-step:** **L-25** — Staging API surface correction redeploy + read-only verify  
**Branch:** `evidence/l25-staging-api-surface-correction-redeploy-2026-05-31`  
**Base:** `81d254f` — Merge PR #139 (L-24 diagnosis **INCONCLUSIVE** + surface **404**)  
**Transcript:** [l25_redeploy_transcript_redacted.txt](./evidence/core10-l25-api-surface-redeploy-2026-05-31/l25_redeploy_transcript_redacted.txt)

---

## 1. Authorization — CORE10-L25-AUTH-001

| Field | Value |
|-------|-------|
| Required phrase (verbatim) | `APPROVE L-25 STAGING API SURFACE CORRECTION REDEPLOY FROM SERVER ONLY` |
| **AUTHORIZATION_RECEIVED** | **true** |

---

## 2. Required evidence matrix

| Field | Value |
|-------|-------|
| **REDEPLOY_MODE** | `staging_api_surface_correction` |
| **DEPLOY_TARGET** | `server_only` |
| **VERCEL_PROJECT** | `zora-walat-api-staging` |
| **DEPLOY_GUARD_PASS** | **true** |
| **REDEPLOY_ATTEMPT_COUNT** | **1** |
| **DEPLOYMENT_ID** | `dpl_HFmf5zNdyxeW4W5EmduFfHVBTAyX` |
| **ALIAS** | `https://zora-walat-api-staging.vercel.app` |
| **API_HEALTH_BEFORE** | **FAIL** — HTTP **404** |
| **API_HEALTH_AFTER** | **PASS** — HTTP **200** JSON `{"status":"ok"}` |
| **API_SURFACE_AFTER** | **PASS** — `staging-api-smoke` exit **0** |
| **LOGIN_ROUTE_REACHABLE** | **true** |
| **LOGIN_ROUTE_NOT_404** | **true** (`login_route` **400** `validation_error`) |
| **TOKEN_REFRESH_EXECUTED** | **false** |
| **LOGIN_ATTEMPT_EXECUTED** | **false** |
| **SNAPSHOT_EXECUTED** | **false** |
| **RUNTIME_DOCTOR_EXECUTED** | **false** |
| **OBSERVABILITY_CAPTURE_EXECUTED** | **false** |
| **ENV_EDITED** | **false** |
| **ENV_VALUES_PRINTED** | **false** |
| **SECRET_VALUES_PRINTED** | **false** |
| **DB_MUTATION** | **false** |
| **PAYMENT_MUTATION** | **false** |
| **PROVIDER_MUTATION** | **false** |
| **SELF_HEALING_APPLY** | **false** |
| **PRODUCTION_READY** | **false** |
| **REAL_MONEY_READY** | **false** |

---

## 3. Verdict — CORE10-L25-VERDICT-001

| Item | Status |
|------|--------|
| **CORE10-L25-VERDICT-001** | **PASS** |
| Predeploy guard | **PASS** |
| Redeploy count | **1** from `server/` |
| Post-deploy health + smoke | **PASS** |
| `GET /api/ready` | **200** `database_ok` |
| L-22 login **500** root cause | **Still INCONCLUSIVE** — not re-tested in L-25 |
| Operator token | **Still expired** (no refresh in L-25) |
| Full snapshot | **NOT EXECUTED** |
| Runtime Doctor / observability | **NOT VERIFIED** |
| **CORE10-BLK-CAPTURE-001** | **OPEN** |

**Conservative launch posture:** production · pilot · real-money · market — **NO-GO**.

---

## 4. Predeploy guard — CORE10-L25-PREDEPLOY-GUARD-001

| Field | Value |
|-------|-------|
| Command | `npm run deploy:staging:guard` |
| Working directory | `server/` |
| Package | `zora-walat-api` |
| Linked project | `zora-walat-api-staging` |
| Root Next.js deploy | **Rejected** by guard |

**CORE10-L25-PREDEPLOY-GUARD-001:** **PASS**

---

## 5. Redeploy — CORE10-L25-REDEPLOY-001

| Field | Value |
|-------|-------|
| Command | `npm run deploy:staging` |
| Deployment URL | `https://zora-walat-api-staging-gvt6wuj92.vercel.app` |
| Ready state | **READY** |
| Exit code | **0** |

**CORE10-L25-REDEPLOY-001:** **PASS**

---

## 6. Post-deploy verification — CORE10-L25-VERIFY-001

| Probe | HTTP | Diagnosis |
|-------|------|-----------|
| `/api/health` | **200** | JSON liveness |
| `staging-api-smoke` | **PASS** | `api_serverless` |
| `login_route` | **400** | `validation_error` (not **404**) |
| operator routes (no auth) | **401** | `auth_required` (expected) |
| `/api/ready` | **200** | `readinessReason=database_ok` |

**Before (L-24):** **404** / `nextjs_frontend`.  
**After L-25:** API serverless surface **restored**.

**CORE10-L25-VERIFY-001:** **PASS**

---

## 7. Context and proposed next gates (not executed)

| Prior step | Note |
|------------|------|
| [L-24](./ZORA_WALAT_L24_CORE10_STAGING_AUTH_LOGIN_HTTP500_DIAGNOSIS_EVIDENCE_2026_05_31.md) | Surface **404** triggered redeploy recommendation |
| [L-22](./ZORA_WALAT_L22_CORE10_TOKEN_REFRESH_AFTER_L21_BLOCKED_TOKEN_EVIDENCE_2026_05_31.md) | Historical `login` **500** — requires separate token refresh retry after surface **PASS** |

**Proposed next (separate authorization each):**

1. L-22-class token refresh retry — confirm `LOGIN_HTTP` **200** without printing token.
2. L-21-class full read-only snapshot — only after valid token preflight.
3. If `login` still **500** after refresh: targeted read-only auth diagnosis (not redeploy).

---

## 8. No-mutation attestation

| Domain | Mutated? |
|--------|----------|
| Vercel env / secrets | **NO** |
| Login / token | **NO** |
| Snapshot / doctor / obs | **NO** |
| DB / payment / provider | **NO** |

---

## 9. Cross-links

| Document | Role |
|----------|------|
| [L-18](./ZORA_WALAT_L18_STAGING_API_SURFACE_CORRECTION_REDEPLOY_EVIDENCE_2026_05_30.md) | Prior successful surface redeploy pattern |
| [L-24](./ZORA_WALAT_L24_CORE10_STAGING_AUTH_LOGIN_HTTP500_DIAGNOSIS_EVIDENCE_2026_05_31.md) | Pre-redeploy **404** evidence |

---

**Filed by:** Cursor agent session (engineering evidence only)  
**Commit:** Pending operator review — **no commit** unless operator requests.
