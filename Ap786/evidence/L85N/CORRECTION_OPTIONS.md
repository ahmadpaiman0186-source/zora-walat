# L-85N — Correction options

**Status:** PLAN ONLY — **not executed** in L-85N.

---

## 1) Preferred correction path (deploy target)

Align **`zora-walat-api-staging`** with the **API deploy root** intended by `server/scripts/assert-vercel-api-deploy-root.mjs`.

| Step | Action | Owner |
|------|--------|-------|
| 1 | Vercel UI: confirm project name **`zora-walat-api-staging`** | Operator |
| 2 | Vercel UI: confirm **Root Directory** = **`server`** | Operator |
| 3 | Vercel UI: confirm framework **not** Next.js for this project (Node/serverless API) | Operator |
| 4 | Confirm build/install commands match API project (not root `npm run build`) | Operator |
| 5 | Confirm deployment source commit includes **L-85K** (PR #270+) | Operator / git |
| 6 | Confirm `server/vercel.json` routes `/(.*)` → `api/index.mjs` | Repo — **PROVEN** |
| 7 | **Redeploy** staging API project only — if explicitly authorized (L-85O) | Operator |
| 8 | Structural verify: `/ops/db-readonly-proof` returns **JSON** (not HTML 404) | Operator / future gate |
| 9 | Then set `READ_ONLY_DATABASE_URL` + authenticated proof (L-85M retry) | Authorized gate |

**Do not change:** `DATABASE_URL`, Stripe, payment, provider env keys.

---

## 2) Alternative correction (root bridge — code change)

Add root `api/` bridge + `vercel.json` rewrite for `/ops/db-readonly-proof` (and possibly `/ops/health`) mirroring `api/health-ready.mjs` pattern.

| Aspect | Note |
|--------|------|
| Requires runtime code change | **YES** — separate implementation gate |
| Default for L-85N | **NOT executed** |
| Trade-off | Keeps root deploy but duplicates routing surface |

Only pursue if operator **cannot** move staging API to `server/` root.

---

## 3) Options not recommended

| Option | Why |
|--------|-----|
| Bind `READ_ONLY_DATABASE_URL` before route is JSON-live | Endpoint stays BLOCKED/404 — no proof value |
| Deploy from monorepo root without bridges | Perpetuates `/ops/*` 404 (L-84ZW/L-85M pattern) |
| Use production `zora-walat-api` for first proof | Not authorized |
| Change owner `DATABASE_URL` to read-only URL | Forbidden — breaks app |

---

## 4) Verification checklist (post-correction, future)

| Check | Pass criterion |
|-------|----------------|
| `/health` | 200 JSON (may still work on either surface) |
| `/ops/health` | JSON response (not HTML 404) |
| `/ops/db-readonly-proof` without token | JSON `verdict: BLOCKED` (not HTML 404) |
| Deploy inspect | Shows API function routing (operator — structural) |

---

## 5) Proof claim gate

**Do not claim** runtime read-only DB identity proof until:

- `/ops/db-readonly-proof` returns safe JSON with `verdict: PASS` and all required flags (future authorized HTTP proof gate).

---

*End.*
