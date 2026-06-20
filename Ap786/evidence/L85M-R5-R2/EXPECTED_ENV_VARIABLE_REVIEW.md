# L-85M-R5-R2 — Expected env variable review

**Gate UTC:** 2026-06-20  
**Method:** tracked source only — no env values read

---

## Variables required for authenticated pass-through

| Variable | Role | Read by | Minimum |
|----------|------|---------|---------|
| `OPS_HEALTH_TOKEN` | Primary ops infra shared secret | pre-bootstrap guard; `env.js`; Express gates | **≥ 16 chars** when set |
| `OPS_INFRA_HEALTH_TOKEN` | Alias for `OPS_HEALTH_TOKEN` | same | **≥ 16 chars** when set |
| `READ_ONLY_DATABASE_URL` | Read-only DB connection for proof probe | pre-bootstrap guard; `dbReadonlyProofService.js` | non-empty after trim |

## Failure when unset or too short

| Variable state | Pre-bootstrap outcome | HTTP |
|----------------|----------------------|------|
| `OPS_HEALTH_TOKEN` / alias **< 16** or empty | `token_invalid` | **401** |
| Token OK, `READ_ONLY_DATABASE_URL` empty | `readonly_url_missing` | **503** |

## Variables explicitly not used for auth comparison

| Variable | Note |
|----------|------|
| `DATABASE_URL` | Not used for readonly proof auth gate |
| `x-ops-health-token` | **Not referenced** in tracked auth code |

## Staging runtime expectation

For staging `zora-walat-api-staging`, Vercel project env must expose **`OPS_HEALTH_TOKEN`** (or alias) with length ≥16 and **`READ_ONLY_DATABASE_URL`** for proof to reach DB layer.

This gate **did not** query Vercel env presence or values.

---

*End.*
