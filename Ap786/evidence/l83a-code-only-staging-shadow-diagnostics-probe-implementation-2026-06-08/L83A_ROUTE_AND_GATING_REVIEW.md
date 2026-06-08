# L-83A — Route and gating review

## Route

`POST /internal/staging/shadow-safety-gate/diagnostic-probe`

Registered in `app.js` under `/internal` with `apiIpLimiter`.

## Gate stack (implemented)

| Condition | HTTP |
|-----------|------|
| `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED !== 'true'` | 404 `not_found` |
| `ZW_API_DEPLOYMENT_TIER !== 'staging'` | 404 `not_found` |
| Missing/invalid ops token | 401 `unauthorized` |
| Non-empty JSON body | 400 `body_not_allowed` |
| All gates pass + valid POST | 200 bounded JSON |

## Auth

`opsInfraHealthTokenMatches(req)` — reuses `OPS_HEALTH_TOKEN` / `X-ZW-Ops-Token` (same as `/internal/logs/webtopup`).

## Runtime env read

Probe gates read `process.env` at request time via `readStagingProbeEnvConfig()` for fail-closed behavior when env changes without redeploy module cache issues on tier flags.

---

*End.*
