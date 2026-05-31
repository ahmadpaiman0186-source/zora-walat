# L-27 — Staging API Surface Correction Redeploy After L-26 BLOCKED_PREFLIGHT Evidence

**Date:** 2026-05-31  
**Roadmap:** Zora-Walat L-1 … L-150 Global Engineering / Super-System  
**L-step:** **L-27** — Staging API surface correction redeploy after L-26 **BLOCKED_PREFLIGHT**  
**Branch:** `evidence/l27-staging-api-surface-correction-redeploy-after-l26-blocked-preflight-2026-05-31`  
**Base:** `9b310ab` — Merge PR #141 (L-26 **BLOCKED_PREFLIGHT**)  
**Transcript:** [l27_redeploy_transcript_redacted.txt](./evidence/core10-l27-api-surface-redeploy-after-l26-blocked-preflight-2026-05-31/l27_redeploy_transcript_redacted.txt)

---

## 1. Authorization — CORE10-L27-AUTH-001

| Field | Value |
|-------|-------|
| Required phrase (verbatim) | `APPROVE L-27 STAGING API SURFACE CORRECTION REDEPLOY AFTER L-26 BLOCKED_PREFLIGHT FROM SERVER ONLY` |
| **AUTHORIZATION_RECEIVED** | **true** |

---

## 2. Required evidence matrix

| Field | Value |
|-------|-------|
| **REDEPLOY_MODE** | `staging_api_surface_correction_after_l26_blocked_preflight` |
| **DEPLOY_TARGET** | `server_only` |
| **VERCEL_PROJECT** | `zora-walat-api-staging` |
| **DEPLOY_GUARD_PASS** | **true** |
| **REDEPLOY_ATTEMPT_COUNT** | **1** |
| **DEPLOYMENT_ID** | `dpl_FJQ3LpzHz9QC4vVvqWcGvx2xnAoi` |
| **ALIAS** | `https://zora-walat-api-staging.vercel.app` |
| **API_HEALTH_BEFORE** | **FAIL** — HTTP **404** |
| **API_HEALTH_AFTER** | **PASS** — HTTP **200** |
| **API_READY_AFTER** | **PASS** — HTTP **200** `database_ok` |
| **API_SURFACE_AFTER** | **PASS** — smoke exit **0** |
| **LOGIN_ROUTE_REACHABLE** | **true** |
| **LOGIN_ROUTE_NOT_404** | **true** (`login_route` **400**) |
| **LOGIN_ATTEMPT_EXECUTED** | **false** |
| **TOKEN_REFRESH_EXECUTED** | **false** |
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
| **PROPOSED_NEXT_GATE** | L-26-class token refresh retry (`APPROVE L-26 READ-ONLY STAGING OPERATOR TOKEN REFRESH RETRY AFTER L-25 SURFACE PASS WITH GITIGNORED LOCAL CREDS ONLY` or L-27 successor phrase) — **after** confirming smoke still **PASS**; then L-21-class snapshot |

---

## 3. Verdict — CORE10-L27-VERDICT-001

| Item | Status |
|------|--------|
| **CORE10-L27-VERDICT-001** | **PASS** |
| Trigger | [L-26](./ZORA_WALAT_L26_CORE10_TOKEN_REFRESH_AFTER_L25_SURFACE_PASS_EVIDENCE_2026_05_31.md) **BLOCKED_PREFLIGHT** (**404**) |
| Redeploy | **1×** from `server/` |
| Post-deploy verify | Health **200**, ready **200**, smoke **PASS** |
| Token refresh / snapshot | **NOT EXECUTED** |
| **CORE10-BLK-CAPTURE-001** | **OPEN** |

**Conservative launch posture:** production · pilot · real-money · market — **NO-GO**.

---

## 4. Context chain

| L-step | Surface / token note |
|--------|----------------------|
| **L-25** | Redeploy **PASS** `dpl_HFmf5zNdyxeW4W5EmduFfHVBTAyX` |
| **L-26** | Token refresh **BLOCKED_PREFLIGHT** — **404** regression |
| **L-27** | Surface **restored** `dpl_FJQ3LpzHz9QC4vVvqWcGvx2xnAoi` |

---

## 5. No-mutation attestation

| Domain | Mutated? |
|--------|----------|
| Vercel env / secrets | **NO** |
| Login / token / snapshot | **NO** |
| DB / payment / provider | **NO** |

---

**Filed by:** Cursor agent session (engineering evidence only)  
**Commit:** Pending operator review — **no commit** unless operator requests.
