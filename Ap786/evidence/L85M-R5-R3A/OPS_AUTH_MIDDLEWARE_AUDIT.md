# L-85M-R5-R3A — OPS auth middleware audit

**Gate UTC:** 2026-06-20

---

## Layer 1 — Pre-bootstrap guard (first gate)

| Field | Value |
|-------|--------|
| File | `server/lib/prebootstrapDbReadonlyProofGuard.mjs` |
| Token source | `process.env.OPS_HEALTH_TOKEN` / `OPS_INFRA_HEALTH_TOKEN` only |
| Accepted headers | `Authorization: Bearer …`, `X-ZW-Ops-Token` |
| Blocked responses | **401** (`token_missing` / `token_invalid`), **503** (`readonly_url_missing`) |
| Body shape | JSON with `prebootstrap_guard: true` |

## Layer 2 — Express proof service (after pass-through)

| Field | Value |
|-------|--------|
| File | `server/src/services/dbReadonlyProofService.js` |
| Token match helper | `opsInfraHealthTokenMatches` from `opsInfraHealthGate.js` |
| Token source | `env.opsInfraHealthToken` (via `server/src/config/env.js`) |
| Blocked responses | **401** / **503** JSON via `buildDbReadonlyProofBlocked` |

## Layer 3 — Other ops routes

| Route | Auth |
|-------|------|
| `/ops/health` | `denyUnauthenticatedInfraIfPrelaunch` when lockdown |
| `/ops/db-readonly-proof` | Dedicated proof service (not staff JWT) |

## Static note (not runtime proven)

Pre-bootstrap and Express layers read OPS token from **different config paths** (`process.env` vs `env.js`). Misalignment would typically yield **401 JSON**, not **500 HTML**, if reached.

---

*End.*
