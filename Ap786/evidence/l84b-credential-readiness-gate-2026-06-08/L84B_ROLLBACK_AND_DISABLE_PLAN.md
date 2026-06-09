# L-84B — Rollback and disable plan (future retry)

**Reference for future L-84 retry.** Not executed in L-84B gate.

## During probe window (future)

| Variable | Staging value | Scope |
|----------|---------------|-------|
| `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED` | `true` | **`zora-walat-api-staging` only** |
| `ZW_API_DEPLOYMENT_TIER` | `staging` | **`zora-walat-api-staging` only** |

## After log capture (future — mandatory)

| Step | Action |
|------|--------|
| 1 | Set `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED=false` on **`zora-walat-api-staging`** |
| 2 | Redeploy staging API only |
| 3 | Confirm deployment **Ready** |
| 4 | **Do not** call probe route again unless separately approved |
| 5 | Document disable in Ap786 evidence (names only) |

## Do not change (unless separately approved)

- Production env on `zora-walat-api`
- Stripe env / webhook config
- Provider env
- DB env
- `OPS_HEALTH_TOKEN` value (leave as-is after readiness; do not log)

## L-82 independent flag

`SHADOW_SAFETY_GATE_WEBHOOK_DIAGNOSTICS_ENABLED` — separate from probe disable; do not toggle unless operator approves.

## L-84B gate

Rollback plan documented only. **No env mutation or redeploy in this gate.**

---

*End.*
