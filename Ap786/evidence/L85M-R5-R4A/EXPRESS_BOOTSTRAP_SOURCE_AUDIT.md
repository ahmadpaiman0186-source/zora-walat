# L-85M-R5-R4A — Express bootstrap source audit

**Gate UTC:** 2026-06-21

---

## `server/bootstrap.js`

| Phase | Behavior |
|-------|----------|
| Entry | `[startup] phase=entry_start` log |
| Dotenv | Loads `server/.env` / `.env.local`; production skips missing-file fatal |
| Side effects | Stripe/JWT diagnostic logs (non-fatal warnings in many cases) |
| Blocking await | `initRateLimitRedisOptional()` from `server/src/lib/rateLimitRedisInit.js` |
| Prisma | Explicitly **not** initialized here (`prisma_init_skipped`) |

**Static note:** Top-level `await` on bootstrap import means any **rejected** dynamic import of `bootstrap.js` propagates as an exception to the bridge `catch`.

## `createValidatedApp()` — `server/src/runtime/serverLifecycle.js`

| Step | Function | Failure mode (static) |
|------|----------|------------------------|
| 1 | `assertHttpAppConstructionAllowedOrThrow` | **Throws** if `ZW_RUNTIME_KIND=worker` |
| 2 | Production + `ZW_RUNTIME_KIND` unspecified | **`process.exit(1)`** (not catchable `throw`) |
| 3 | `validateServerRuntimeOrExit()` | Multiple **`process.exit(1)`** gates (JWT, DATABASE_URL, Stripe, CORS, TTLs, deployment contract) |
| 4 | `createApp()` | Loads full Express graph from `server/src/app.js` |

## Production runtime-kind gate (L332–347)

When `env.nodeEnv === 'production'` and `getRuntimeKind() === UNSPECIFIED`, tracked source calls **`process.exit(1)`** with event `fatal_runtime_unspecified_production`.

**Parity gap:** Root bridge does **not** import `server/src/runtime/registerServerlessRuntime.js` (sets `ZW_RUNTIME_KIND=serverless`), unlike `server/api/index.mjs`.

**Triage note:** R5-R4 observed **`PROOF_ROUTE_BRIDGE_RUNTIME_EXCEPTION`** (JavaScript `catch`), not an unhandled platform `/500` HTML surface. That implies either (a) a **thrown** error on the pass-through path, or (b) `createValidatedApp()` completed without hitting the fatal exit branch on the deployed runtime profile. Exact branch cannot be proven without logs or env inspection (both out of scope for this gate).

## `createApp()` — `server/src/app.js`

| Field | Value |
|-------|--------|
| Ops mount | `app.use('/ops', apiIpLimiter, opsRoutes)` (L214–216) |
| Error middleware | `notFound` then `errorHandler` last |
| Import graph | Large — payments, webhooks, admin, queues, Prisma-backed routes |

Cold start for pass-through pulls **entire** validated app factory, not a slim ops-only subgraph.

---

*End.*
