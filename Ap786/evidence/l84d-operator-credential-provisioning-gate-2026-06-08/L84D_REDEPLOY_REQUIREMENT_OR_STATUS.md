# L-84D — Redeploy requirement or status

## Redeploy during L-84D

| Field | Value |
|-------|--------|
| Redeploy performed | **NO** |
| Deployment ID | **N/A** |

## Future requirement

When operator adds `OPS_HEALTH_TOKEN` on **`zora-walat-api-staging`**, **redeploy REQUIRED** before any future L-84 retry so running deployment picks up env state.

L-84C env changes (`ZW_API_DEPLOYMENT_TIER`, probe disable) also require redeploy before retry — **not performed in L-84D**.

## L-84D boundary

No redeploy during credential provisioning gate — consistent with blocked provisioning outcome.

---

*End.*
