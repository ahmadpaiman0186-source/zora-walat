# L-84ZH — Staging API routing / health / readiness exposure diagnosis

**GLOBAL INTERNATIONAL REAL-PROOF STANDARD — Zora-Walat**

**Verdict:** `CORE10-L84ZH-VERDICT-PREP: STAGING_API_ROUTING_HEALTH_READINESS_EXPOSURE_DIAGNOSIS_PREPARED_L84ZG_PARTIAL_CORRELATED_NO_RUNTIME_FIX_NO_REDEPLOY_NO_PAYMENT_NO_PROVIDER_NO_MARKET_GLOBAL_LAUNCH_NO_GO`

## 1. Inspected files (read-only)

| File | Role |
|------|------|
| `vercel.json` (repo root) | Next.js project; **single rewrite** for Stripe webhook |
| `server/vercel.json` | Catch-all `/(.*)` → `/api/index.mjs` — **applies only if Root Directory = `server`** |
| `package.json` (root) | Next.js app (`next build`) |
| `next.config.mjs` | No API rewrites for health/ready |
| `server/api/index.mjs` | **Implements** GET `/health`, `/api/health`, `/ready`, `/api/ready` JSON |
| `api/webhooks/stripe.mjs` | **Root Vercel function**; documents root-deploy mismatch |
| `Ap786/ZORA_WALAT_STR02_VERCEL_PROJECT_ROOT_EVIDENCE_CHECKLIST_2026_05_24.md` | Prior evidence: Root Directory = **`./`**, not `server` |
| `Ap786/evidence/l84zg-.../HTTP_RESULT_MATRIX.md` | L-84ZG probe outcomes |

## 2. Diagnosis questions — answers

### Q1. Which files define staging API route entrypoints?

| Layer | Entry | Exposed on staging today? |
|-------|-------|---------------------------|
| Root `api/` | `api/webhooks/stripe.mjs` | **YES** — `/api/webhooks/stripe` |
| `server/api/` | `server/api/index.mjs` | **NO** — not mounted when Root Directory = `./` |
| Root Next.js | `app/` / `pages/` routes | **YES** — `GET /` → 200 HTML |

### Q2. Expected routing model?

**Intended API runtime** (per `server/api/index.mjs` + `server/vercel.json`): all traffic through **`server/api/index.mjs`**.

**Actual staging deployment** (per root `vercel.json` + STR-02 checklist + `api/webhooks/stripe.mjs` header comment): builds from **repo root `./`** as **Next.js**, not `server/`.

### Q3. Are `/health` and `/ready` implemented?

**YES in code** — `server/api/index.mjs` lines 72–94 route GET `/`, `/health`, `/api/health` to `sendLivenessJsonOk`; GET `/ready`, `/api/ready` to `handleSlimReady`.

**NO on deployed route surface** — no root `api/` bridge and no root rewrite for these paths.

### Q4. Are `/api/health` and `/api/ready` mapped to `server/api/index.mjs`?

**In repo (server project):** **YES**.

**On staging host today:** **NO** — requests fall through to Next.js → **404 HTML**.

### Q5. Why `/api/webhooks/stripe` returns API JSON but `/api/health` returns frontend 404?

| Path | Handler reached | Evidence |
|------|-----------------|----------|
| `/api/webhooks/stripe` | Root `api/webhooks/stripe.mjs` | L-84ZG **405** JSON `method_not_allowed` |
| `/api/health` | Next.js 404 page | L-84ZG **404** HTML |
| `/webhooks/stripe` | Rewrite → same root function | Root `vercel.json` rewrite exists |

Root `vercel.json` **only** rewrites `/webhooks/stripe`. Stripe bridge was added explicitly (STR-02). Health/ready were never bridged at root.

### Q6. Root cause classification

| Class | Applies? |
|-------|----------|
| Code-routing logic missing in `server/api/index.mjs` | **NO** |
| **Vercel routing / rewrites gap at repo root** | **YES — primary** |
| **Deployment target mismatch (Root Directory `./` vs `server`)** | **YES — primary** |
| Expected missing route (by design) | **NO** — L-84ZF expected JSON on health/ready |

### Q7. Minimal correction before next runtime proof PASS

**Option A (architectural):** Set Vercel **`zora-walat-api-staging` Root Directory = `server`** — activates `server/vercel.json` catch-all. **Risk:** may decouple/break current Next.js-at-root layout; requires operator architecture review.

**Option B (surgical, STR-02 pattern):** Add root **`api/` bridges** + **`vercel.json` rewrites** for `/health`, `/api/health`, `/ready`, `/api/ready` delegating to `server/api/index.mjs` handler paths (mirror webhook bridge).

**Option C:** Add Next.js `rewrites` in `next.config.mjs` — same class as B.

**Minimal for L-84ZF-class GET proof:** expose at least **`/health` or `/api/health`** and **`/ready` or `/api/ready`** as JSON via root deployment surface.

### Q8. Redeploy required?

| Step | Required? |
|------|-----------|
| Code/config correction | **YES — first** |
| Redeploy after correction | **YES — separate authorized gate** |
| Redeploy alone (no routing fix) | **NO — will not fix L-84ZG PARTIAL** |

### Q9. What remains blocked until proof exists?

- Full runtime / liveness / readiness HTTP **PASS**
- L-84P authenticated `/ops/health`
- L-84 reconciliation
- Real-money / market / global launch

## 3. Recommended next gate sequence (not authorized here)

1. **L-84ZI-class** — authorized routing bridge / rewrite correction (code)
2. **L-84ZJ-class** — staging redeploy verification (operator)
3. **L-84ZK-class** — re-run read-only GET/HEAD HTTP proof matrix

---

*End.*
