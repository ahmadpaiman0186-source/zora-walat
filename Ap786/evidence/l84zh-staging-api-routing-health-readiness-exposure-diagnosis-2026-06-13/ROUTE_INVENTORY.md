# L-84ZH — Route inventory (read-only)

**Host under test:** `https://zora-walat-api-staging.vercel.app`  
**Inspection base:** `main` @ `f3e268e`

## A. Root deployment surface (active on staging)

| Vercel function file | HTTP path | Methods | Expected response class |
|---------------------|-----------|---------|-------------------------|
| `api/webhooks/stripe.mjs` | `/api/webhooks/stripe` | POST (GET/HEAD → 405) | API JSON |
| Next.js app | `/`, `/api`, `/health`, … | GET | HTML (200 or 404 page) |

## B. Root `vercel.json` rewrites

| Source | Destination |
|--------|-------------|
| `/webhooks/stripe` | `/api/webhooks/stripe` |

**No rewrites** for: `/health`, `/api/health`, `/ready`, `/api/ready`, `/api/index`.

## C. `server/vercel.json` (inactive when Root Directory ≠ `server`)

| Rule | Destination |
|------|-------------|
| `/(.*)` | `/api/index.mjs` |

## D. `server/api/index.mjs` slim routes (code — not exposed on root deploy)

| Method | Path | Handler | Response type |
|--------|------|---------|---------------|
| GET | `/`, `/health`, `/api/health` | `sendLivenessJsonOk` | JSON `{ status: ok }` |
| GET | `/ready`, `/api/ready` | `handleSlimReady` | JSON readiness |
| GET/HEAD | `/api/index`, `/index` | probe OK | JSON |
| GET | `/success`, `/cancel` | slim checkout return | HTML |
| POST | `/webhooks/stripe` | slim webhook | (not L-84ZH scope) |
| POST | auth/checkout paths | slim handlers | (not L-84ZH scope) |

## E. Gap matrix (L-84ZG probed paths)

| Path | Code implements API JSON? | Staging L-84ZG result | Gap |
|------|---------------------------|----------------------|-----|
| `/health` | **YES** (`server/api/index.mjs`) | 404 Next.js HTML | **Not exposed** |
| `/api/health` | **YES** | 404 Next.js HTML | **Not exposed** |
| `/ready` | **YES** | 404 Next.js HTML | **Not exposed** |
| `/api/ready` | **YES** | 404 Next.js HTML | **Not exposed** |
| `/api/ready/env` | **NO** (not in index.mjs) | 404 Next.js HTML | Expected missing |
| `/api/webhooks/stripe` | **YES** (root bridge) | 405 API JSON | **Exposed** |
| `/` | Liveness in API; also Next home | 200 Next.js HTML | **Ambiguous** — frontend wins |

## F. Vercel serverless function counts (post L-84ZB, on `main`)

| Location | Count |
|----------|------:|
| `server/api/` | **1** (`index.mjs`) |
| Root `api/` | **1** (`webhooks/stripe.mjs`) |

Function-limit fix does **not** auto-expose `server/api/index.mjs` on root-deploy staging.

---

*End.*
