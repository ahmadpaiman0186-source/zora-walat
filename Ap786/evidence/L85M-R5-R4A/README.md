# L-85M-R5-R4A — Runtime exception source triage

**Gate UTC:** 2026-06-21  
**Branch:** `evidence/l85m-r5-r4a-runtime-exception-source-triage-2026-06-20`  
**Baseline `main`:** `2ed22e6` (Merge PR #312 — L-85M-R5-R4 authenticated proof retry fail-closed evidence)

## Verdict

`L-85M-R5-R4A_RUNTIME_EXCEPTION_SOURCE_TRIAGE_FILED_LOCAL_ONLY__STATIC_CLASSIFICATION_RUNTIME_EXCEPTION_SOURCE_TRIAGE_CAUSE_PARTIALLY_IDENTIFIED_NO_ENDPOINT_RETRY_NO_TOKEN_USE_NO_RUNTIME_DB_PROOF_NO_SECRET_EXPOSURE_NO_DIRECT_DB_QUERY_NO_WRITE_PROBE_NO_DEPLOY_NO_REDEPLOY_NO_ENV_MUTATION_NO_CODE_ROUTE_TEST_MUTATION_NO_PAYMENT_PROVIDER_ACTION_PR5_CLOSED_UNMERGED_NO_GLOBAL_MONEY_PROVIDER_MARKET_CLAIMS`

## Classification

**`RUNTIME_EXCEPTION_SOURCE_TRIAGE_CAUSE_PARTIALLY_IDENTIFIED`**

## Headline

| Field | Value |
|-------|--------|
| R5-R4 failure context recorded | **YES** |
| Exception phase narrowed (static) | **YES** — authenticated **pass-through**, not pre-bootstrap guard |
| Exact throw class / stack frame | **NOT IDENTIFIED** (no runtime logs; R5-R3B insufficient) |
| Root bridge vs serverless entry mismatch found | **YES** — `registerServerlessRuntime` omitted on root bridge |
| Route registration gap | **NO** (static) |
| Endpoint retry (this gate) | **NO** |
| Token use (this gate) | **NO** |
| L-85M PASS | **NOT CLAIMED** |
| PR #5 | **closed**, **unmerged** — **untouched** |

## Likely runtime exception source (static)

**During or immediately after `getExpressHandler()` cold path** (`server/bootstrap.js` import → `createValidatedApp()` → `serverless-http` wrap) **or during serverless-http dispatch** to `/ops/db-readonly-proof` **before** the proof handler returns a controlled `dbReadonlyProofContract` JSON envelope.

**Confidence:** phase **MEDIUM-HIGH**; exact throw site **MEDIUM**; exception class **LOW**.

## Contents

| File | Purpose |
|------|---------|
| [BASELINE_VERIFICATION.md](./BASELINE_VERIFICATION.md) | Preflight |
| [R5_R4_FAILURE_CONTEXT.md](./R5_R4_FAILURE_CONTEXT.md) | R5-R4 context |
| [BRIDGE_PASS_THROUGH_SOURCE_AUDIT.md](./BRIDGE_PASS_THROUGH_SOURCE_AUDIT.md) | Root bridge pass-through |
| [EXPRESS_BOOTSTRAP_SOURCE_AUDIT.md](./EXPRESS_BOOTSTRAP_SOURCE_AUDIT.md) | Bootstrap / createValidatedApp |
| [OPS_ROUTE_REGISTRATION_AUDIT.md](./OPS_ROUTE_REGISTRATION_AUDIT.md) | Route registration |
| [DB_CLIENT_IMPORT_PATH_AUDIT.md](./DB_CLIENT_IMPORT_PATH_AUDIT.md) | DB client import paths |
| [MODULE_RUNTIME_COMPATIBILITY_AUDIT.md](./MODULE_RUNTIME_COMPATIBILITY_AUDIT.md) | Module/runtime parity |
| [STATIC_CAUSE_HYPOTHESES.md](./STATIC_CAUSE_HYPOTHESES.md) | Ranked hypotheses |
| [NEXT_FIX_RECOMMENDATION.md](./NEXT_FIX_RECOMMENDATION.md) | Next gate |
| [NO_ENDPOINT_RETRY_ATTESTATION.md](./NO_ENDPOINT_RETRY_ATTESTATION.md) | No HTTP |
| [NO_TOKEN_USE_ATTESTATION.md](./NO_TOKEN_USE_ATTESTATION.md) | No token |
| [NO_RUNTIME_DB_PROOF_ATTESTATION.md](./NO_RUNTIME_DB_PROOF_ATTESTATION.md) | No DB proof |
| [NO_DIRECT_DB_QUERY_ATTESTATION.md](./NO_DIRECT_DB_QUERY_ATTESTATION.md) | No direct DB |
| [NO_WRITE_PROBE_ATTESTATION.md](./NO_WRITE_PROBE_ATTESTATION.md) | No write probe |
| [NO_DEPLOY_ENV_CODE_MUTATION_ATTESTATION.md](./NO_DEPLOY_ENV_CODE_MUTATION_ATTESTATION.md) | No mutation |
| [PR5_NON_INTERFERENCE.md](./PR5_NON_INTERFERENCE.md) | PR #5 |
| [NON_CLAIMS.md](./NON_CLAIMS.md) | Non-claims |

---

*End.*
