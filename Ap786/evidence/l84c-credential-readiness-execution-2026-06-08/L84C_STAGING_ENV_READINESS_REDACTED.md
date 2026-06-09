# L-84C — Staging env readiness (redacted)

**Names only — no values recorded.**

## Env state after L-84C

| Variable | Required | L-84C status | Value in evidence |
|----------|----------|--------------|-------------------|
| `OPS_HEALTH_TOKEN` | Present (≥16 chars) | **NOT PRESENT** | REDACTED / NOT RECORDED |
| `ZW_API_DEPLOYMENT_TIER` | `staging` | **CONTROLLED — SET** | name + intended value `staging` only |
| `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED` | Controlled; disabled for L-84C | **CONTROLLED — DISABLED** | name + intended `false` only |
| `SHADOW_SAFETY_GATE_WEBHOOK_DIAGNOSTICS_ENABLED` | Document only (L-82) | **Present (unchanged)** | name only |

## Vercel CLI actions (staging only)

| Command class | Variable | Outcome |
|---------------|----------|---------|
| `vercel env add` | `ZW_API_DEPLOYMENT_TIER` | Added to **`zora-walat-api-staging`** |
| `vercel env rm` + `vercel env add` | `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED` | Reset to **`false`** on staging |

## Not performed

- `OPS_HEALTH_TOKEN` add (requires operator value — not available without disclosure)
- Production env changes
- Stripe / webhook / provider / DB env changes

## Verification method

`vercel env ls` on linked **`zora-walat-api-staging`** — recorded **names only**.

---

*End.*
