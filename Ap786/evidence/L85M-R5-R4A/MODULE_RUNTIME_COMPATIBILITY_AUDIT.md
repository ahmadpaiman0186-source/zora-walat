# L-85M-R5-R4A — Module runtime compatibility audit

**Gate UTC:** 2026-06-21

---

## Package / module configuration

| Field | Value |
|-------|--------|
| Server package | `server/package.json` — `"type": "module"`, Node `>=20` |
| Root package | No `"type": "module"` (Next.js app) |
| Root Vercel install | `npm install --include=dev && npm --prefix server install --include=dev` |
| Serverless HTTP dep | Declared in **`server/package.json`** only (`serverless-http@^3.2.0`) |

## Root bridge import pattern (shared across STR bridges)

Files using bare `import('serverless-http')` from `api/**/*.mjs`:

- `api/ops/db-readonly-proof.mjs`
- `api/ops/health.mjs`
- `api/webhooks/stripe.mjs`
- `api/create-checkout-session.mjs`

All follow the same `bootstrap.js` → `server/src/index.js` → `serverless-http` cache pattern.

## Runtime kind registration

| Entry | Sets `ZW_RUNTIME_KIND=serverless` |
|-------|-----------------------------------|
| `server/api/index.mjs` | **YES** — imports `registerServerlessRuntime.js` first |
| `api/ops/db-readonly-proof.mjs` | **NO** |
| `api/ops/health.mjs` | **NO** |
| `api/webhooks/stripe.mjs` | **NO** |

Documented expectation (`serverLifecycle.js` L342–343): production HTTP serverless entries should set runtime kind via **`registerServerlessRuntime`**.

## `server/vercel.json` (not staging root entry)

| Field | Value |
|-------|--------|
| Routes | `{ "src": "/(.*)", "dest": "/api/index.mjs" }` |
| Staging project | Builds from **repo root** (`vercel.json` + `api/ops/*`), not `server/vercel.json` catch-all |

## Static compatibility findings

| Finding | Severity (static) |
|---------|-------------------|
| Root proof bridge omits `registerServerlessRuntime` vs documented serverless entry | **HIGH** — parity / production gate mismatch |
| `serverless-http` resolved from root function context | **MEDIUM** — dependency lives under `server/`; other root bridges use identical pattern |
| Full Express graph on proof cold start | **MEDIUM** — large import surface vs slim pre-bootstrap path |

No static evidence that module type or ESM/CJS mismatch alone explains R5-R4; leading story remains **pass-through cold-start exception**, not module format misconfiguration.

---

*End.*
