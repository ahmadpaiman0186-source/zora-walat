# STR-02 — 404 Endpoint Mapping Audit Plan

**Date:** 2026-05-24
**Type:** **Static audit plan only — read-only**
**Parent:** [root-cause investigation](./ZORA_WALAT_STR02_404_ROUTING_ROOT_CAUSE_INVESTIGATION_2026_05_24.md)

**Policy:** Static route inventory and repository inspection only. No deploy. No Resend. No API calls in this pack.

---

## 1. Target paths to reconcile

| Source | Documented path |
|--------|-----------------|
| Stripe sandbox destination (DEST-01) | `https://zora-walat-api-staging.vercel.app/webhooks/stripe` |
| Repository slim entry | `POST /webhooks/stripe` — `server/api/index.mjs` |
| Repository Express mount | `POST /webhooks/stripe` — `server/src/app.js` |
| **Not** documented for Stripe | `/api/webhooks/stripe` (H6 check) |

---

## 2. Static route inventory (repository)

### 2.1 Vercel configuration

| File | Content | Project intent |
|------|---------|----------------|
| `server/vercel.json` | `"routes": [{ "src": "/(.*)", "dest": "/api/index.mjs" }]` | **API staging** — all paths → `api/index.mjs` |
| Root `vercel.json` | `"framework": "nextjs"`, build from root | **Next.js app** — not API webhook project |

**Deploy guard:** `server/scripts/assert-vercel-api-deploy-root.mjs` rejects:
- Wrong package name
- Monorepo root without `server/api/index.mjs`
- Missing catch-all to `api/index`
- `framework: nextjs` in API `vercel.json`

### 2.2 Serverless entrypoints (`server/api/`)

| File | Route / role |
|------|--------------|
| `index.mjs` | Catch-all; slim paths before full Express bootstrap |
| `slimStripeWebhookHandler.mjs` | `POST /webhooks/stripe` — signature verify fast path |
| `slimReadyHandler.mjs` | `GET /ready`, `/api/ready` |
| `slimAuthLoginHandler.mjs` | `POST /auth/login`, `/api/auth/login` |
| (others) | Auth OTP, checkout return, etc. |

### 2.3 Express routes (`server/src/app.js` and routers)

| Path | Method | Notes |
|------|--------|-------|
| `/webhooks/stripe` | POST | Raw body mount **before** `express.json()` |
| `/health`, `/api/health` | GET | Liveness (slim in index.mjs) |
| `/ready`, `/api/ready` | GET | Readiness probe |
| `/api/*` | various | JSON API routes |

### 2.4 Path normalization behavior

`server/api/index.mjs`:
- `requestPathname(req.url)` — strips query string
- `normalizedPathname` — strips trailing slash (except `/`)
- Webhook check uses **exact** `requestPathname(req.url) === '/webhooks/stripe'` (no `/api` prefix)

---

## 3. Audit checklist (read-only)

| # | Check | How | Status |
|---|-------|-----|--------|
| A-01 | Confirm Stripe destination URL path = `/webhooks/stripe` | DEST-01 / STR-02A evidence | **FILED** |
| A-02 | Confirm repo defines `POST /webhooks/stripe` in `server/api/index.mjs` | Static read | **CONFIRMED (repo)** |
| A-03 | Confirm `server/vercel.json` catch-all to `api/index.mjs` | Static read | **CONFIRMED (repo)** |
| A-04 | Confirm root `vercel.json` is Next.js — different from API | Static read | **CONFIRMED (repo)** |
| A-05 | Compare DEP-01 deploy SHA vs STR-02 Resend time | Operator / Vercel dashboard | **PENDING** |
| A-06 | Confirm Vercel project `zora-walat-api-staging` root directory = `server/` | Vercel project settings (read-only) | **PENDING** |
| A-07 | Confirm production domain maps to API project not Next root | Vercel domains (read-only) | **PENDING** |
| A-08 | Search repo for alternate webhook paths (`/api/webhooks/stripe`) | Static grep | **NONE FOUND** (H6 lower) |
| A-09 | Document whether deployed build includes `api/index.mjs` | Vercel deployment output (read-only) | **PENDING** |

---

## 4. Stripe vs deployed path comparison matrix

| Dimension | Stripe expects | Repo (server/) | Match? |
|-----------|----------------|----------------|--------|
| Host | `zora-walat-api-staging.vercel.app` | Staging API project | **VERIFY** (Vercel) |
| Path | `/webhooks/stripe` | `/webhooks/stripe` | **YES (repo)** |
| Method | POST | POST (slim + Express) | **YES (repo)** |
| Prefix | No `/api` | Slim check: no `/api` | **YES (repo)** |
| Deployed runtime | — | Unknown without Vercel inspect | **NOT VERIFIED** |

**Gap:** Repo path **matches** Stripe URL on paper; STR-02 **404 + no logs** implies **deployed** staging may not expose the repo route (H1, H2, H4, H7, H10).

---

## 5. Verdict

| Item | Status |
|------|--------|
| Static repo mapping | **DOCUMENTED** |
| Stripe ↔ repo path alignment (static) | **ALIGNED on `/webhooks/stripe`** |
| Deployed staging alignment | **NOT VERIFIED** |
| Root cause | **NOT CONFIRMED** |
| Fix | **NOT IMPLEMENTED** |

---

*Endpoint mapping audit · static inventory only · no mutation*
