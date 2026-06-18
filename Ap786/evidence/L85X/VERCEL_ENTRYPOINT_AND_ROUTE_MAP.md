# L-85X — Vercel entrypoint and route map

---

## Two deploy surfaces in one monorepo

| Surface | Config | Framework / routes | Active when |
|---------|--------|-------------------|-------------|
| **Repo root** | `vercel.json` | `"framework": "nextjs"` + limited `rewrites` | Vercel Root Directory = `.` (L-85O attested) |
| **`server/`** | `server/vercel.json` | `"routes": [{ "src": "/(.*)", "dest": "/api/index.mjs" }]` | CLI deploy from `server/` (`deploy:staging:guard`) |

## Root `vercel.json` rewrites (tracked)

| Source | Destination |
|--------|-------------|
| `/webhooks/stripe` | `/api/webhooks/stripe` |
| `/health`, `/api/health` | `/api/health-ready?route=health` |
| `/ready`, `/api/ready` | `/api/health-ready?route=ready` |
| `/create-checkout-session` | `/api/create-checkout-session` |

**Absent:** any `/ops/*` or `db-readonly-proof` rewrite.

## Root `api/health-ready.mjs` (tracked comment)

> Staging builds from repo root (`./`), so `server/api/index.mjs` is not exposed.

Handler returns **404 JSON** (`code: not_found`) for requests without `?route=health|ready`.

## Server `api/index.mjs` (tracked)

Pre-bootstrap block (L-85P) for `GET`:

- `/ops/db-readonly-proof`
- `/api/admin/ops/db-readonly-proof`

Then fallthrough `getHandler()` → Express for valid token + readonly URL.

## Project target `zora-walat-api-staging`

| Evidence gate | Deploy behavior |
|---------------|-----------------|
| L-85O / L-85Q | `server/` CLI deploy → `λ api/index` — structural unauthenticated **401** PASS |
| L-85O | Vercel project Root Directory setting still **`.`** |
| L-85W | Post-L-85V deployment from **`main`** branch (git-connected) — metadata OBSERVED |

## Inferred active runtime at L-85M attempt

Git-connected production deployment from **`main`** at repo root builds **Next.js + root bridges**, not `server/api/index.mjs` catch-all. **`/ops/db-readonly-proof` is not mapped** → **404** consistent with L-85M result.

## Alternative public paths (static)

| Path | Root deploy | Server deploy |
|------|-------------|---------------|
| `/ops/db-readonly-proof` | **NO** | **YES** |
| `/api/admin/ops/db-readonly-proof` | **NO** | **YES** |
| `/api/ops/db-readonly-proof` | **NOT IN CODE** | **NOT IN CODE** |

---

*End.*
