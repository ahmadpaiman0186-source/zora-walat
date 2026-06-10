# L-84M — Track B: Staging OPS_HEALTH_TOKEN provisioning

**Verdict:** `CORE10-L84M-VERDICT-001: L84M_REAL_PROOF_EXECUTION_TARGET_LOCK_ONLY_NO_OPERATIONAL_ACTION`

**Execution in L-84M:** **NO**

## 1. Exact staging project / surface

| Lock item | Value |
|-----------|-------|
| Vercel project | **`zora-walat-api-staging`** |
| Public alias (Ap786) | `https://zora-walat-api-staging.vercel.app` |
| Runtime package | `server/` API (`server/api/index.mjs` lineage) |
| **Not in scope** | `zora-walat-api` (production), frontend project |

## 2. Exact env name expected by app

| Env name | Role | Source |
|----------|------|--------|
| **`OPS_HEALTH_TOKEN`** | Primary — Vercel staging slot | `server/src/config/env.js` → `opsInfraHealthToken` |
| `OPS_INFRA_HEALTH_TOKEN` | Alias (same logical token) | `server/src/middleware/opsInfraHealthGate.js` |
| `ZW_OPS_HEALTH_TOKEN` | **Local operator shell only** — sent as `X-ZW-Ops-Token` header | L-84B protocol — **never stored in repo/Ap786** |

**Auth surfaces gated when `PRELAUNCH_LOCKDOWN=true`:** infra/readiness routes via `denyUnauthenticatedInfraIfPrelaunch` — accepts `Authorization: Bearer …` or `X-ZW-Ops-Token` matching staging token.

## 3. Operator UI steps (no token material)

Future authorized provisioning gate — **steps only:**

1. Open Vercel → project **`zora-walat-api-staging`** only.
2. Settings → Environment Variables.
3. Add variable name **`OPS_HEALTH_TOKEN`** (exact spelling).
4. Paste value from **local/session clipboard only** — value **must not** appear in chat, Ap786, screenshots with visible value, or git.
5. Scope: staging project Production slot per [L-84E](../l84e-operator-secret-provisioning-procedure-gate-2026-06-09/L84E_VERCEL_UI_STAGING_ONLY_PROCEDURE.md) — **staging project only**.
6. Save — confirm UI shows variable **name** with Encrypted/m masked indicator.
7. **Do not** screenshot the Value field.

## 4. Token generation boundary

| Rule | Requirement |
|------|-------------|
| Generation location | **Local/session only** (e.g. `openssl rand -base64 32` in operator shell) |
| Recording | **NEVER** in repo, Ap786, PR body, or agent transcript |
| Minimum length | App requires ≥16 chars (`opsInfraHealthGate.js`) |
| Local mirror | Operator sets `$env:ZW_OPS_HEALTH_TOKEN` to **same logical value** in shell only — evidence may say **SET** / **NOT SET** only |

## 5. Save confirmation evidence (no value)

| Evidence artifact | Content allowed |
|-------------------|-----------------|
| `vercel env ls` output | **`OPS_HEALTH_TOKEN` name listed** — Encrypted OK |
| Vercel UI screenshot | Variable **name** + masked value — **no cleartext** |
| Operator attestation | “Save succeeded: YES/NO” |
| Wrong-value discard (L-84G pattern) | If paste error → discard, file BLOCKED — **no value recorded** |

## 6. Redeploy requirement

| Item | Requirement |
|------|-------------|
| Redeploy | **REQUIRED** after env save before any HTTP proof |
| Target | **`zora-walat-api-staging`** deployment |
| Evidence | Deployment ID / timestamp / commit SHA — **no secrets** |
| Prior art | [L-84D redeploy requirement](../l84d-operator-credential-provisioning-gate-2026-06-08/L84D_REDEPLOY_REQUIREMENT_OR_STATUS.md) |

## 7. Staging HTTP proof requirement (after explicit approval)

**Not authorized in L-84M.** Future Track C after redeploy:

| Check | Example surface (staging only) |
|-------|-------------------------------|
| Ops-gated route returns non-503 with valid header | e.g. `GET /ops/health` with `X-ZW-Ops-Token` — path per `server/test/helpers/prelaunchPrivateSurfaceChild.test.js` |
| Shadow diagnostics probe (if L-84 retry ever authorized) | `POST …/internal/staging/shadow-safety-gate/diagnostic-probe` — **L-84 retry NOT AUTHORIZED** |

Evidence: request time (UTC), URL path only, status code, redacted body, deployment ID — **no header value in evidence**.

## 8. Failure handling (paste/save fails again)

| Failure | Action |
|---------|--------|
| Paste into wrong field | **Discard** — do not save; file BLOCKED evidence |
| Save error / UI timeout | **STOP** — no retry without new operator authorization phrase |
| Secret-like value visible in UI | **Do not record** — classification only |
| Accidental Stripe key in ops field | Treat as exposure triage — **separate** Track A gate; do not conflate with ops provision |
| Post-failure | Staging `OPS_HEALTH_TOKEN` remains **NOT PROVISIONED** until proven save + redeploy |

---

*End.*
