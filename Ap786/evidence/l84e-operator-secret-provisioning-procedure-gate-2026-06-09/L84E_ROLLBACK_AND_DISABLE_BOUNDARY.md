# L-84E — Rollback and disable boundary

## Probe flag (staging)

| Variable | Safe default |
|----------|--------------|
| `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED` | **`false`** until explicit L-84 retry window |

Do **not** enable probe flag during secret provisioning procedure alone.

## After future L-84 retry (reference)

Per L-84 plan: set probe **`false`** + redeploy staging after log capture.

## Rollback if mis-provisioned (future operator)

| Issue | Action |
|-------|--------|
| Token added to wrong project | Remove from wrong project; **STOP**; file incident evidence |
| Token leaked in chat/repo | Rotate token on staging; update local var; never log old/new values |
| Probe accidentally enabled | Set **`false`** on staging; redeploy staging only |

## Do not change (unless separately approved)

- Production `OPS_HEALTH_TOKEN`
- Stripe / webhook / provider / DB env
- L-82 `SHADOW_SAFETY_GATE_WEBHOOK_DIAGNOSTICS_ENABLED` (independent)

## L-84E boundary

**No env mutation in this gate.**

---

*End.*
