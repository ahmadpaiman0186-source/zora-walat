# L-85P — Implementation report

---

## Branch and baseline

| Field | Value |
|-------|-------|
| Branch | `feature/l85p-prebootstrap-readonly-proof-route-stabilization-2026-06-17` |
| Commit | *(filled after final local commit)* |
| Baseline `main` | Includes merged PR #274 (L-85O FAIL), #273 (L-85N), #272 (L-85M BLOCKED), #271 (L-85L), #270 (L-85K) |

## Why L-85O failed

L-85O corrected the staging deploy artifact so `/ops/*` was no longer Next.js 404 HTML, but unauthenticated `GET /ops/db-readonly-proof` still fell through to `getHandler()` → full bootstrap/Express/DB graph. That produced **intermittent 500 JSON and timeouts** instead of stable fail-closed JSON for missing/invalid token.

## How L-85P stabilizes the route

Added an early serverless entry guard in `server/api/index.mjs` that intercepts:

- `GET /ops/db-readonly-proof`
- `GET /api/admin/ops/db-readonly-proof`

**Before** Stripe webhook slim path and **before** `getHandler()` / bootstrap / Prisma / DB proof service.

Missing or invalid OPS token → immediate JSON `401` with `verdict: BLOCKED` and safe structural fields (`prebootstrap_guard: true`).

Valid token + configured `READ_ONLY_DATABASE_URL` (presence check only) may pass through to Express for a future L-85M retry. Valid token without readonly URL → `503` `readonly_url_missing` (still pre-bootstrap, no DB query).

## Files changed

| File | Change |
|------|--------|
| `server/api/index.mjs` | Wire pre-bootstrap handler before bootstrap |
| `server/lib/prebootstrapDbReadonlyProofGuard.mjs` | Guard evaluation + blocked response builder |
| `server/handlers/slimDbReadonlyProofPrebootstrapHandler.mjs` | Slim handler |
| `server/test/prebootstrapDbReadonlyProof.test.js` | Unit + static boundary tests |
| `server/test/helpers/prebootstrapDbReadonlyProofChild.test.js` | Child-process boundary test |
| `server/package.json` | `test:prebootstrap-readonly-proof` script |
| `Ap786/evidence/L85P/*` | Gate evidence |

## Boundaries respected

- No `DATABASE_URL` mutation or owner fallback
- No `READ_ONLY_DATABASE_URL` set/verify/proof
- No Neon connection, DB query, row export, or write probe
- No authenticated live proof in this gate
- No Vercel CLI or deploy
- No secret/env/host/password/token printed or committed

---

*End.*
