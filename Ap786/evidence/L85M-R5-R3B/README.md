# L-85M-R5-R3B — Vercel function logs investigation

**Gate UTC:** 2026-06-20  
**Branch:** `evidence/l85m-r5-r3b-vercel-function-logs-investigation-2026-06-20`  
**Baseline `main`:** `1dd466d` (Merge PR #306 — L-85M-R5-R3A route surface investigation)

## Verdict

`L-85M-R5-R3B_VERCEL_FUNCTION_LOGS_INVESTIGATION_FILED_LOCAL_ONLY__R5_R3B_LOGS_UNAVAILABLE_OR_INSUFFICIENT__NO_ENDPOINT_RETRY_NO_TOKEN_USE_NO_RUNTIME_DB_PROOF_NO_SECRET_EXPOSURE_NO_DIRECT_DB_QUERY_NO_WRITE_PROBE_NO_DEPLOY_NO_REDEPLOY_NO_ENV_MUTATION_NO_CODE_ROUTE_TEST_MUTATION_NO_PAYMENT_PROVIDER_ACTION_PR5_CLOSED_UNMERGED_NO_GLOBAL_MONEY_PROVIDER_MARKET_CLAIMS`

## Classification

**`R5_R3B_LOGS_UNAVAILABLE_OR_INSUFFICIENT`**

## Headline

| Field | Value |
|-------|--------|
| R5-R3 failure window identified | **YES** (inferred from evidence + commit proxy) |
| Vercel logs accessed | **YES** (CLI, authenticated session) |
| Logs available for window | **NO** — insufficient sanitized runtime error evidence |
| Sanitized runtime error observed | **NO** |
| Static R5-R3A hypothesis supported by logs | **INCONCLUSIVE** (no log corroboration) |
| Secret material copied/exposed | **NO** |
| Endpoint retry | **NO** |
| L-85M PASS | **NOT CLAIMED** |

## Contents

| File | Purpose |
|------|---------|
| [BASELINE_VERIFICATION.md](./BASELINE_VERIFICATION.md) | Preflight |
| [R5_R3_FAILURE_WINDOW.md](./R5_R3_FAILURE_WINDOW.md) | Failure window |
| [VERCEL_LOG_ACCESS_METHOD.md](./VERCEL_LOG_ACCESS_METHOD.md) | Access method |
| [FUNCTION_LOG_AVAILABILITY.md](./FUNCTION_LOG_AVAILABILITY.md) | Availability |
| [SANITIZED_LOG_EXCERPT_OR_SUMMARY.md](./SANITIZED_LOG_EXCERPT_OR_SUMMARY.md) | Log summary |
| [ERROR_CLASSIFICATION.md](./ERROR_CLASSIFICATION.md) | Error class |
| [ROUTE_SURFACE_CORRELATION.md](./ROUTE_SURFACE_CORRELATION.md) | Route correlation |
| [RUNTIME_EXCEPTION_HYPOTHESIS.md](./RUNTIME_EXCEPTION_HYPOTHESIS.md) | Hypothesis |
| [SECRET_REDACTION_ATTESTATION.md](./SECRET_REDACTION_ATTESTATION.md) | Redaction |
| [NO_ENDPOINT_RETRY_ATTESTATION.md](./NO_ENDPOINT_RETRY_ATTESTATION.md) | No HTTP |
| [NO_TOKEN_USE_ATTESTATION.md](./NO_TOKEN_USE_ATTESTATION.md) | No token |
| [NO_RUNTIME_DB_PROOF_ATTESTATION.md](./NO_RUNTIME_DB_PROOF_ATTESTATION.md) | No DB proof |
| [NO_DEPLOY_ENV_CODE_MUTATION_ATTESTATION.md](./NO_DEPLOY_ENV_CODE_MUTATION_ATTESTATION.md) | No mutation |
| [PR5_NON_INTERFERENCE.md](./PR5_NON_INTERFERENCE.md) | PR #5 |
| [NON_CLAIMS.md](./NON_CLAIMS.md) | Non-claims |
| [NEXT_GATE_RECOMMENDATION.md](./NEXT_GATE_RECOMMENDATION.md) | Next gate |

---

*End.*
