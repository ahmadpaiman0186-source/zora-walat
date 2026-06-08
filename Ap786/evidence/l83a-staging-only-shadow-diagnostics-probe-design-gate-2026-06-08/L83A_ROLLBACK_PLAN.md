# L-83A — Rollback plan

## Immediate disable (no code deploy)

On `zora-walat-api-staging` only:

1. Set `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED=false` (or remove variable)
2. Redeploy staging API project
3. Verify probe returns **404** (fail closed)

Independent: L-82 webhook flag `SHADOW_SAFETY_GATE_WEBHOOK_DIAGNOSTICS_ENABLED` may remain unchanged — rollback of probe does not require disabling webhook diagnostics.

## Code rollback (implementation phase)

1. Revert merge commit containing probe route + adapter + env keys
2. Run full shadow test bundle + `secrets:scan`
3. Confirm no `/internal/staging/shadow-safety-gate/diagnostic-probe` route in `app.js`

## Partial rollback

If adapter bug but route needed:

- Disable via env (preferred)
- Do not leave route enabled without `ZW_API_DEPLOYMENT_TIER=staging` guard

## Production safety check

After any rollback or forward deploy:

- Confirm `zora-walat-api` (production) env has **no** `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED=true`
- Confirm production probe curl returns 404 (operator step in future L-step — not executed here)

---

*End.*
