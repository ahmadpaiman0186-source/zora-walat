# L-84E — Redeploy after secret provisioning plan

**Future procedure — not executed in L-84E gate.**

## When redeploy is required

After **`OPS_HEALTH_TOKEN`** is added or updated on **`zora-walat-api-staging`**, redeploy staging API so running deployment loads new env.

## Target

| Field | Value |
|-------|--------|
| Project | **`zora-walat-api-staging`** only |
| Forbidden | `zora-walat-api` production redeploy |

## Future capture (redacted)

| Field | Record |
|-------|--------|
| Deployment ID | Redacted ID or name only |
| Status | **Ready** / blocked |
| Timestamp | Yes |
| Production redeploy | **NO** |

## Boundaries

- **No redeploy in L-84E gate**
- **No HTTP/POST** after redeploy in provisioning-only evidence
- L-84C/L-84D tier and probe env also require redeploy before retry if not yet applied to running deployment

## Sequence (future)

1. Provision `OPS_HEALTH_TOKEN` on staging (Vercel UI)
2. Confirm `ZW_API_DEPLOYMENT_TIER=staging`, probe **`false`**
3. Redeploy **`zora-walat-api-staging`**
4. Record deployment id/status — **no route invocation**

---

*End.*
