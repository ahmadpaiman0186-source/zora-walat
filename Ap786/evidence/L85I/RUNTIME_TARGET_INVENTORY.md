# L-85I — Runtime target inventory

**Inspection scope:** Tracked repository files only (no secret files, no `.env.local`).

---

## 1) Git baseline (pre-evidence commit)

| Check | Result |
|-------|--------|
| Branch | `main` |
| Working tree | clean |
| `git log -1 --oneline` | `746ca69 Merge pull request #267 … L-85H` |
| `server/.vercel` | not inspected (may be gitignored local link) |

---

## 2) Vercel configuration (tracked)

### Root — `vercel.json`

| Field | Value |
|-------|-------|
| Framework | `nextjs` |
| Install | root `npm install` + `npm --prefix server install` |
| Build | `npm run build` (Next.js frontend) |
| Rewrites | `/health`, `/ready`, `/api/health`, `/api/ready` → `api/health-ready.mjs`; Stripe webhook + checkout aliases |

**Inference:** Root deploy path `./` ships **frontend (Next.js)** plus root `api/` bridge functions — not the full Express API graph.

### API subproject — `server/vercel.json`

| Field | Value |
|-------|-------|
| Routes | catch-all `/(.*)` → `/api/index.mjs` |
| Framework | none (not Next.js) |

**Inference:** API serverless runtime is **`server/api/index.mjs`** when Vercel root directory is `server/`.

### Deploy guard — `server/scripts/assert-vercel-api-deploy-root.mjs`

| Rule | Purpose |
|------|---------|
| `package.json` name must be `zora-walat-api` | Blocks wrong package deploy |
| Must have `server/api/index.mjs` | API entry present |
| `vercel.json` must route to `api/index` | Catch-all API routing |
| Rejects `framework: nextjs` in API project | Prevents shipping Next from `server/` |

Referenced by `server/package.json` script `deploy:staging:guard` before `vercel deploy`.

---

## 3) Deployment target candidates (names only)

| Candidate | Repo evidence | Role |
|-----------|---------------|------|
| **`zora-walat-api`** | `server/package.json` `"name"`; deploy guard expects this package name | Production API project candidate |
| **`zora-walat-api-staging`** | Tracked in `server/tools/staging-auth-checkout-operator.mjs`, `server/scripts/staging-verify-operator-email.mjs`, `server/tools/stagingOperatorCredentialRotation.mjs` (host marker constant) | Staging API project candidate |
| **`zora-walat`** (frontend) | Root `package.json` `"name": "zora-walat"`; root `vercel.json` Next.js | Frontend project candidate |
| Root `./` + `api/health-ready.mjs` | Root `vercel.json` rewrites | Staging-style monorepo deploy bridge when API is **not** exposed via `server/api/index.mjs` |

**Note:** Vercel Dashboard project IDs and linked directories are **not** declared in tracked JSON beyond the above structural split. Operator-linked `.vercel` metadata is local and was not read.

---

## 4) Runtime entrypoints

| Path | Role |
|------|------|
| `server/api/index.mjs` | Primary Vercel serverless handler (slim routes + lazy Express via `getHandler()`) |
| `server/handlers/*.mjs` | Slim bypass handlers (auth, checkout, staging ops, Stripe webhook, ready) |
| `api/health-ready.mjs` | Root-deploy health/ready bridge (imports slim handlers from `server/`) |
| `api/webhooks/stripe.mjs` | Root-deploy Stripe webhook bridge |
| `api/create-checkout-session.mjs` | Root-deploy checkout bridge |
| `server/bootstrap.js` | Loads dotenv + Redis init before Express graph |
| `server/src/app.js` | Express route mounting |
| `server/index.js` / `server/app.js` | Long-running entry (guards against wrong cwd) |

---

## 5) DB client usage (tracked)

| Component | Connection source | Read-only path? |
|-----------|-------------------|-----------------|
| `server/src/db.js` | `process.env.DATABASE_URL` → Prisma `datasources.db.url` | **NO** — single owner/app pool |
| `server/src/config/env.js` | `databaseUrl: process.env.DATABASE_URL` | **NO** |
| `server/handlers/slimReadyHandler.mjs` | imports `../src/db.js` (owner URL) | **NO** |
| `server/src/routes/ops.routes.js` `/ops/health` | `prisma.$queryRaw\`SELECT 1\`` via owner client | **NO** |
| `server/src/lib/readinessBoundedChecks.js` | owner `prisma` — `SELECT 1` + `webTopupOrder.findFirst` | **NO** |
| Direct `pg` / `@neondatabase` imports in `server/` runtime | **None found** in tracked `.js`/`.mjs` under `server/src` and handlers | N/A |

**Conclusion:** All tracked runtime DB access paths bind to **`DATABASE_URL`** (owner/app role). No second Prisma client or alternate env key in application runtime code.

---

## 6) Diagnostic / health / audit surfaces (runtime)

| Surface | Auth | DB behavior | DB identity proof? |
|---------|------|-------------|-------------------|
| `GET /health`, `/api/health` | Public liveness JSON | No DB | **NO** |
| `GET /ready`, `/api/ready` (slim + Express) | `OPS_HEALTH_TOKEN` when `PRELAUNCH_LOCKDOWN` | Owner `SELECT 1` + optional row probe | **NO** — no `current_user`, no privilege matrix |
| `GET /ops/health` | Token gate under prelaunch | Owner `SELECT 1` | **NO** |
| `GET /metrics` | Token gate under prelaunch | Ops metrics text | **NO** |
| `POST /internal/staging/shadow-safety-gate/diagnostic-probe` | `OPS_HEALTH_TOKEN` + staging flags | Non-mutating shadow diagnostic emit only | **NO** |
| `server/tools/zw-doctor.mjs` | CLI operator tool | Optional local/staging checks | **NO** — not a deployed safe endpoint; propose-only |
| Staging operator slim routes under `/api/ops/staging-operator-*` | Bearer JWT | Read-only **business** rows via owner Prisma | **NO** — not DB role identity proof; uses owner connection |

---

## 7) `READ_ONLY_DATABASE_URL` consumption

| Search scope | Matches |
|--------------|---------|
| `server/**` runtime (`.js`, `.mjs`) | **0** |
| Root `api/**` | **0** |
| Ap786 evidence / gate docs only | **YES** (prior L-85D–H gates; not runtime) |

**Answer:** **NO** — `READ_ONLY_DATABASE_URL` is **not** consumed by tracked application runtime code. It appears only in Ap786 evidence documentation and prior gate runbooks (local gitignored `.env.local` usage documented in L-85G/H — not re-read in L-85I).

---

## 8) Safe runtime DB identity proof endpoint

**Answer:** **NO** — **BLOCKED**

No tracked runtime route returns all of:

- current DB user (role name)
- selected database name
- proof of no write privilege on scope tables
- no row export
- no secret / connection-string disclosure

Existing health routes intentionally avoid env-backed strings and role metadata (`readinessBoundedChecks.js` documents secret-safe slim-ready failures).

### Minimum future code-change requirement (separate authorized gate)

1. Add a **new** token-gated route (e.g. under `/internal/…` or `/ops/…`) that:
   - Reads **`READ_ONLY_DATABASE_URL` only** (separate short-lived Prisma/pg client — must **not** reuse owner `server/src/db.js` singleton).
   - Executes **metadata-only** queries: `current_user`, `current_database()`, `pg_roles` flags, `has_table_privilege` / `information_schema` for the six L-85 scope tables — **SELECT-only**, no table row reads.
   - Returns **boolean/enum structural JSON** only (no host, password, URL, row payloads).
   - Enforces `OPS_HEALTH_TOKEN` (or dedicated gate token) + staging tier flag.
2. Deploy to **`zora-walat-api-staging` only** after explicit mutation authorization (see `MUTATION_AUTHORIZATION_GATE.md`).
3. Prove via **controlled HTTP evidence gate** — not CLI-only (L-85G-style local probe does not satisfy runtime proof).

---

## 9) Future Vercel target for `READ_ONLY_DATABASE_URL`

| Target | Status |
|--------|--------|
| **`zora-walat-api-staging`** | **INFERRED** — staging API project name is repo-tracked; env binding is policy-inferred from L-85E/F/H (no production binding; do not alter owner `DATABASE_URL` without separate scope) |
| **`zora-walat-api` (production)** | **Not authorized** for first read-only runtime binding |
| Root Next.js project | **Wrong target** — no Express DB graph; health bridge uses owner URL via slim ready |

---

*End.*
