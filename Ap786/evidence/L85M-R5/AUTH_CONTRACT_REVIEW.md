# L-85M-R5 — Auth contract review

**Gate UTC:** 2026-06-20  
**Source:** tracked source only (no `.env.local`)

---

## Pre-bootstrap guard (`server/lib/prebootstrapDbReadonlyProofGuard.mjs`)

| Field | Contract |
|-------|----------|
| Token env | `OPS_HEALTH_TOKEN` or `OPS_INFRA_HEALTH_TOKEN` |
| Request presentation | `Authorization: Bearer <token>` **or** `X-ZW-Ops-Token: <token>` |
| Min token length | 16 chars (configured) |
| Pre-pass-through | Requires `READ_ONLY_DATABASE_URL` configured |

## Express proof service (`server/src/services/dbReadonlyProofService.js`)

Uses same `opsInfraHealthTokenMatches` pattern via Bearer or `X-ZW-Ops-Token`.

## Not used by tracked contract

| Header | Status |
|--------|--------|
| `x-ops-health-token` | **Not in tracked contract** for this endpoint |

## Planned R5 header (if token available)

`Authorization: Bearer <OPS_HEALTH_TOKEN>` per tracked contract.

---

*End.*
