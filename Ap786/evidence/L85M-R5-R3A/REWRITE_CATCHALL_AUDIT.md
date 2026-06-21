# L-85M-R5-R3A — Rewrite and catch-all audit

**Gate UTC:** 2026-06-20

---

## Root `vercel.json` rewrites (staging root deploy)

| Source | Destination | Proof-related |
|--------|-------------|---------------|
| `/ops/db-readonly-proof` | `/api/ops/db-readonly-proof` | **YES** |
| `/ops/health` | `/api/ops/health` | Related ops bridge |
| `/health`, `/ready`, … | health-ready bridges | Unrelated |

**No broad catch-all rewrite** over `/ops/*` beyond explicit entries (see `server/scripts/verify-str02-root-vercel-route.mjs` pattern in repo).

## `server/vercel.json` (server-only deploy)

| Rule | Destination |
|------|-------------|
| `/(.*)` | `/api/index.mjs` |

Used when deploying **`server/`** subtree only — **not** the documented staging root bridge path for `/ops/db-readonly-proof`.

## Can rewrite send proof request to `/500` statically?

**NO static rewrite rule** maps proof path to `/500`. Observed `/500` is **platform error routing**, not a configured rewrite target in tracked config.

---

*End.*
