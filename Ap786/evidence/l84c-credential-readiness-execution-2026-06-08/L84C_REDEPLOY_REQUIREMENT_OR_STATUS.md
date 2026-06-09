# L-84C — Redeploy requirement or status

## Redeploy during L-84C

| Field | Value |
|-------|--------|
| Redeploy performed | **NO** |
| Deployment ID | **N/A** |
| Ready status | **N/A** |

## Env changes applied (staging only)

| Variable | Change |
|----------|--------|
| `ZW_API_DEPLOYMENT_TIER` | Added (`staging`) |
| `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED` | Set to `false` |

## Future retry note

**Redeploy REQUIRED FOR FUTURE RETRY** — Vercel env changes do not affect running deployment until **`zora-walat-api-staging`** is redeployed. Future L-84 retry must redeploy after any env confirmation (including `OPS_HEALTH_TOKEN` when added).

## L-84C boundary

No redeploy during L-84C — consistent with mission (credential documentation without probe trigger). No HTTP verification after redeploy (none performed).

---

*End.*
