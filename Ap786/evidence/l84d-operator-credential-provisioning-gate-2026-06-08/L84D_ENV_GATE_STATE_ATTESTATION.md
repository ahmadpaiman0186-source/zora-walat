# L-84D — Env gate state attestation

**Names only — no values recorded.**

## Gate variables on `zora-walat-api-staging`

| Variable | L-84D status | Intended state |
|----------|--------------|----------------|
| `OPS_HEALTH_TOKEN` | **NOT PRESENT** | Present (≥16 chars) before retry |
| `ZW_API_DEPLOYMENT_TIER` | **PRESENT** (L-84C) | `staging` |
| `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED` | **PRESENT** (L-84C) | `false` / disabled |
| `SHADOW_SAFETY_GATE_WEBHOOK_DIAGNOSTICS_ENABLED` | Present (L-82, unchanged) | document only |

## L-84D changes to env

| Variable | Changed in L-84D? |
|----------|-------------------|
| Any | **NO** — read-only verification |

Probe flag remains **disabled** for safety. Tier remains **staging** from prior L-84C configuration.

---

*End.*
