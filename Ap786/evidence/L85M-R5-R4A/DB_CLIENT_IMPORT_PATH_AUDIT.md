# L-85M-R5-R4A — DB client import path audit

**Gate UTC:** 2026-06-21

---

## Owner Prisma (Express default)

| Field | Value |
|-------|--------|
| File | `server/src/db.js` |
| Client | `PrismaClient` with `DATABASE_URL` (via `buildDatabaseUrlWithPoolCap`) |
| Load timing | Module evaluation when imported by routes/services |
| Imported by ops router | **YES** — `server/src/routes/ops.routes.js` L7 (`import { prisma } from '../db.js'`) |

**Static note:** Loading `ops.routes.js` during `createApp()` evaluates `db.js` and constructs owner Prisma **before** any proof-handler logic runs. This uses **`DATABASE_URL`**, not `READ_ONLY_DATABASE_URL`.

## Read-only proof Prisma (isolated)

| Field | Value |
|-------|--------|
| File | `server/src/services/dbReadonlyProofService.js` |
| Factory | `createReadonlyProofPrismaClient(readonlyUrl)` — separate `PrismaClient` |
| URL source | `READ_ONLY_DATABASE_URL` only (`resolveReadonlyDatabaseUrl`) |
| Probe | `$queryRaw` metadata checks; failures caught → **`db_connect_failed`** JSON |

## Pre-bootstrap guard DB check

| Field | Value |
|-------|--------|
| File | `server/lib/prebootstrapDbReadonlyProofGuard.mjs` L99–104 |
| Check | Non-empty **`READ_ONLY_DATABASE_URL`** string only — **no** Prisma, **no** SQL |

## Phase mapping (static)

| Phase | DB activity |
|-------|-------------|
| Pre-bootstrap (401/503 blocked) | Env presence check only |
| `bootstrap.js` / `createValidatedApp` | Owner Prisma module may initialize via import graph |
| Proof handler | Separate readonly Prisma client on demand |

## Triage inference

R5-R4 boundary body reports `db_query_performed: false` on the **bridge** envelope. That aligns with failure **before** a successful proof-service response, not with a completed readonly metadata probe returning pass/fail contract fields.

Exact DB-related throw site (owner Prisma init vs readonly probe) | **NOT PROVEN** without runtime logs.

---

*End.*
