# L-84F — Redeploy authorization boundary

**Verdict:** `CORE10-L84F-VERDICT-001: L84F_OPERATOR_SECRET_PROVISIONING_EXECUTION_AUTHORIZATION_GATE_ONLY`

## H. Redeploy boundary

**L-84F does not authorize redeploy.**

| Action | L-84F |
|--------|-------|
| Staging redeploy | **NOT AUTHORIZED** |
| Production redeploy | **FORBIDDEN** |

## Future redeploy consideration (separate gate / approval)

A future redeploy may **only** be considered **after** all of:

| # | Requirement |
|---|-------------|
| 1 | `OPS_HEALTH_TOKEN` is **PRESENT** on `zora-walat-api-staging` |
| 2 | Local `ZW_OPS_HEALTH_TOKEN` is **SET** |
| 3 | Both confirmed using **redacted evidence** only |
| 4 | Production untouched confirmed |
| 5 | **Separate redeploy approval** obtained (not defined in L-84F) |

## Relationship to L-84 retry

Even after future redeploy, L-84 retry remains **BLOCKED** until:

| # | Requirement |
|---|-------------|
| 1 | Secret readiness evidence |
| 2 | Staging redeploy evidence |
| 3 | Probe flag controlled (`SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED` per L-84C context) |
| 4 | Production untouched evidence |
| 5 | **Separate explicit L-84 retry approval** |

L-84F must **not** claim L-84 retry eligibility.

## L-84C staging gate context (unchanged)

Per L-84C, staging already has:

- `ZW_API_DEPLOYMENT_TIER=staging`
- `SHADOW_SAFETY_GATE_STAGING_PROBE_ENABLED=false`

Redeploy was **not** performed after L-84C env changes. L-84F does not change or redeploy.

---

*End.*
