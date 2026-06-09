# L-84B — Next credential readiness gate

**Purpose:** Resolve blockers before any L-84 retry. **Not executed in this filing.**

## Prerequisites (names only — no values)

| # | Gate | Requirement |
|---|------|-------------|
| G1 | Staging project | Must remain **`zora-walat-api-staging`** only |
| G2 | Staging `OPS_HEALTH_TOKEN` | Must be **present** on staging (≥16 chars); value never logged in Ap786 |
| G3 | Local `ZW_OPS_HEALTH_TOKEN` | Operator sets locally; must match staging token; never pasted into repo or commands |
| G4 | Probe flag | `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED=true` on staging only during probe window |
| G5 | Tier flag | `ZW_API_DEPLOYMENT_TIER=staging` on staging only |
| G6 | Redeploy | Staging API redeploy after env confirmation |
| G7 | Single POST | Exactly one authorized empty-body POST |
| G8 | Log capture | Exactly one redacted `shadow_safety_gate_webhook_diagnostic` line |
| G9 | Disable | `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED=false` + redeploy after capture |

## Forbidden (unchanged)

Production Vercel/HTTP, Stripe, webhook replay, payment/order/checkout, provider, DB mutation, secret exposure, L-74 closure claims.

## Approval for retry

Separate operator approval required for L-84 retry after L-84B credential readiness is satisfied and documented.

## Current blockers (from L-84 execution)

- `OPS_HEALTH_TOKEN` on staging: **NOT PRESENT / not confirmed**
- `ZW_OPS_HEALTH_TOKEN` local: **NOT SET**
- Probe gates: **not confirmed enabled**

---

*End.*
