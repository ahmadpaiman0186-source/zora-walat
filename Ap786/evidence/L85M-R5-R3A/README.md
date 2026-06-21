# L-85M-R5-R3A — Route/surface failure investigation

**Gate UTC:** 2026-06-20  
**Branch:** `evidence/l85m-r5-r3a-route-surface-failure-investigation-2026-06-20`  
**Baseline `main`:** `e84f007` (Merge PR #305 — L-85M-R5-R3 authenticated proof retry failure evidence)

## Verdict

`L-85M-R5-R3A_ROUTE_SURFACE_FAILURE_INVESTIGATION_FILED_LOCAL_ONLY__ROUTE_SURFACE_FAILURE_STATIC_CAUSE_PARTIALLY_IDENTIFIED__NO_ENDPOINT_RETRY_NO_TOKEN_USE_NO_RUNTIME_DB_PROOF_NO_SECRET_EXPOSURE_NO_DIRECT_DB_QUERY_NO_WRITE_PROBE_NO_DEPLOY_NO_REDEPLOY_NO_ENV_MUTATION_NO_CODE_ROUTE_TEST_MUTATION_NO_PAYMENT_PROVIDER_ACTION_PR5_CLOSED_UNMERGED_NO_GLOBAL_MONEY_PROVIDER_MARKET_CLAIMS`

## Classification

**`ROUTE_SURFACE_FAILURE_STATIC_CAUSE_PARTIALLY_IDENTIFIED`**

## Headline

| Field | Value |
|-------|--------|
| R5-R3 failure context recorded | **YES** |
| Proof route in tracked source @ `e84f007` | **YES** |
| Expected route bridge | **`/ops/db-readonly-proof` → `/api/ops/db-readonly-proof`** |
| Observed failing surface (R5-R3) | **HTTP 500**, **`X-Matched-Path: /500`**, HTML |
| Static likely cause | **Runtime crash on authenticated pass-through** — not static rewrite absence |
| Endpoint retry (this gate) | **NO** |
| L-85M PASS | **NOT CLAIMED** |
| PR #5 | **closed**, **unmerged** — **untouched** |

## Contents

| File | Purpose |
|------|---------|
| [BASELINE_VERIFICATION.md](./BASELINE_VERIFICATION.md) | Preflight |
| [R5_R3_FAILURE_CONTEXT.md](./R5_R3_FAILURE_CONTEXT.md) | R5-R3 context |
| [ROUTE_SURFACE_STATIC_MAP.md](./ROUTE_SURFACE_STATIC_MAP.md) | Route map |
| [ENTRYPOINT_AND_BRIDGE_MAP.md](./ENTRYPOINT_AND_BRIDGE_MAP.md) | Entrypoints |
| [PROOF_ROUTE_REGISTRATION_AUDIT.md](./PROOF_ROUTE_REGISTRATION_AUDIT.md) | Registration |
| [OPS_AUTH_MIDDLEWARE_AUDIT.md](./OPS_AUTH_MIDDLEWARE_AUDIT.md) | Auth layers |
| [X_MATCHED_PATH_SURFACE_AUDIT.md](./X_MATCHED_PATH_SURFACE_AUDIT.md) | X-Matched-Path |
| [ERROR_500_SURFACE_AUDIT.md](./ERROR_500_SURFACE_AUDIT.md) | 500 surface |
| [REWRITE_CATCHALL_AUDIT.md](./REWRITE_CATCHALL_AUDIT.md) | Rewrites |
| [STATIC_FAILURE_HYPOTHESES.md](./STATIC_FAILURE_HYPOTHESES.md) | Hypotheses |
| [NO_ENDPOINT_RETRY_ATTESTATION.md](./NO_ENDPOINT_RETRY_ATTESTATION.md) | No HTTP |
| [NO_TOKEN_USE_ATTESTATION.md](./NO_TOKEN_USE_ATTESTATION.md) | No token |
| [NO_RUNTIME_DB_PROOF_ATTESTATION.md](./NO_RUNTIME_DB_PROOF_ATTESTATION.md) | No DB proof |
| [NO_DEPLOY_ENV_CODE_MUTATION_ATTESTATION.md](./NO_DEPLOY_ENV_CODE_MUTATION_ATTESTATION.md) | No mutation |
| [PR5_NON_INTERFERENCE.md](./PR5_NON_INTERFERENCE.md) | PR #5 |
| [NON_CLAIMS.md](./NON_CLAIMS.md) | Non-claims |
| [NEXT_GATE_RECOMMENDATION.md](./NEXT_GATE_RECOMMENDATION.md) | Next gate |

---

*End.*
