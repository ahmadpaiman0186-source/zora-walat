# L-85N — Vercel route and project audit

**Scope:** Tracked `vercel.json`, `api/**`, `server/api/index.mjs`, deploy guard. No Vercel CLI. No live calls in L-85N.

---

## 1) Root `vercel.json` (repository root)

| Field | Value |
|-------|--------|
| Framework | `nextjs` |
| Build | `npm run build` (Next.js) |
| Install | root + `npm --prefix server install` |

### Rewrites (explicit only)

| Source | Destination |
|--------|-------------|
| `/webhooks/stripe` | `/api/webhooks/stripe` |
| `/health`, `/api/health` | `/api/health-ready?route=health` |
| `/ready`, `/api/ready` | `/api/health-ready?route=ready` |
| `/create-checkout-session` | `/api/create-checkout-session` |

**Not rewritten:** `/ops/*`, `/api/admin/ops/*`, `/internal/*`, most `/api/*` Express routes.

---

## 2) Root `api/**` serverless functions

| File | Role |
|------|------|
| `api/health-ready.mjs` | Slim health/ready bridge |
| `api/webhooks/stripe.mjs` | Stripe webhook bridge |
| `api/create-checkout-session.mjs` | Checkout bridge (post L-84ZW) |

**Absent:** `api/ops/**` or any bridge for `/ops/db-readonly-proof`.

### Tracked comment in `api/health-ready.mjs` (PROVEN)

> Staging builds from repo root (`./`), so `server/api/index.mjs` is not exposed.

---

## 3) `server/vercel.json` (API subproject)

| Field | Value |
|-------|--------|
| Routes | catch-all `/(.*)` → `/api/index.mjs` |
| Framework | none (not Next.js) |

When deploy root is `server/`, all paths including `/ops/db-readonly-proof` route to `server/api/index.mjs` → Express.

---

## 4) `server/api/index.mjs` routing model

| Path class | Handler |
|------------|---------|
| `/health`, `/ready` | Slim inline (no Express) |
| Selected `/api/auth/*`, `/api/ops/staging-operator-*`, webhooks, checkout | Slim handlers |
| **All other paths** | `getHandler()` → full Express app |

`/ops/db-readonly-proof` is **not** slim-listed → requires Express graph via `getHandler()`.

---

## 5) Can root deploy bypass `server/api/index.mjs`?

| Question | Answer | Confidence |
|----------|--------|------------|
| Root deploy uses root `vercel.json` + Next.js? | **YES** (tracked config) | **PROVEN** |
| Root deploy exposes `server/api/index.mjs`? | **NO** — not in root `api/` | **PROVEN** |
| `/health` reachable on root deploy? | **YES** — via rewrite → `api/health-ready.mjs` | **PROVEN** (matches L-85M 200 JSON) |
| `/ops/*` reachable on root deploy without new bridge? | **NO** — no rewrite; Next 404 HTML | **LIKELY** (matches L-85M 404 HTML) |

---

## 6) Deploy guard (`server/scripts/assert-vercel-api-deploy-root.mjs`)

| Rule | Intent |
|------|--------|
| Package name `zora-walat-api` | API project identity |
| Must have `api/index.mjs` under cwd | API entry |
| `vercel.json` must route to `api/index` | Catch-all API |
| Rejects `framework: nextjs` in API cwd | Prevents shipping Next to API project |

`server/package.json` → `deploy:staging` runs guard then `vercel deploy --prod`.

---

## 7) Project target status

| Project | Role | Repo evidence | Final target proof |
|---------|------|---------------|-------------------|
| **`zora-walat-api-staging`** | Staging API host marker in tools/scripts | **YES** (name references) | **INFERRED** — Vercel Dashboard link not in tracked JSON |
| **`zora-walat-api`** | Production API package name | **YES** | Not selected for L-85M/N |
| **`zora-walat`** | Frontend Next root | **YES** (`README.md`) | Not proof target for `/ops/*` |

**L-85N does not claim** Vercel project ↔ root directory binding is proven from repo alone.

---

## 8) How root deploy explains L-85M 404 pattern

```
Root deploy (./)
  /health  → rewrite → api/health-ready.mjs     → 200 JSON  ✓ (L-85M)
  /ops/*   → no rewrite → Next.js unmatched     → 404 HTML  ✓ (L-85M)
  server/api/index.mjs + Express /ops/*         → NOT IN DEPLOY GRAPH
```

---

*End.*
