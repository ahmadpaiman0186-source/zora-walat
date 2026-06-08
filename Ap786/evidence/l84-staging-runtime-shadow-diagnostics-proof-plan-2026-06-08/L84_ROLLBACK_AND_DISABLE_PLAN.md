# L-84 — Rollback and disable plan

## Immediate disable after proof (future)

On **`zora-walat-api-staging` only**:

1. Set `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED=false` (or remove)
2. Optionally remove `ZW_API_DEPLOYMENT_TIER` if added solely for L-84
3. Redeploy staging API
4. Confirm probe returns **404**

**Do not** disable L-82 webhook diagnostics flag unless separately approved.

## If proof fails or stop condition hit

1. **Do not** repeat POST spam
2. Disable probe env flags (above)
3. File L-84 execution evidence as **BLOCKED** / **PARTIAL** with stop reason
4. Leave production untouched

## Production safety

Confirm production project never received L-84 probe env vars. If mis-set on production, remove immediately and redeploy production only under separate incident approval (out of L-84 happy path).

---

*End.*
