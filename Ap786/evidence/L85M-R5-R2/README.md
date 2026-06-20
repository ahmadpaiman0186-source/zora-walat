# L-85M-R5-R2 — Auth/env alignment investigation (read-only)

**Gate UTC:** 2026-06-20  
**Branch:** `evidence/l85m-r5-r2-auth-env-alignment-investigation-2026-06-20`  
**Baseline `main`:** `4a3525f` (Merge PR #297 — L-85M-R5-R1 auth-rejected evidence)

## Verdict

`L-85M-R5-R2_AUTH_ENV_ALIGNMENT_INVESTIGATION_FILED_LOCAL_ONLY__NO_TOKEN_USE_NO_ENDPOINT_CALL_NO_RUNTIME_DB_PROOF_NO_SECRET_EXPOSURE_NO_DEPLOY_NO_ENV_MUTATION_NO_PAYMENT_PROVIDER_ACTION_PR5_OPEN_BLOCKED_NO_PR5_MERGE_NO_PR5_CLOSE_NO_GLOBAL_MONEY_PROVIDER_MARKET_CLAIMS`

## Primary classification

**`SOURCE_CONTRACT_MATCHES_R5_R1_BUT_AUTH_REJECTED`**

Tracked source accepts the same header names R5-R1 used (`Authorization: Bearer …`, `X-ZW-Ops-Token`). The root Vercel bridge does not strip or rewrite auth headers in code. Authenticated **401** on both variants therefore points to **runtime env/token alignment**, not header-contract or bridge-mapping defects in tracked source.

## Ranked root-cause hypotheses (not proven in this gate)

| Rank | Hypothesis | Likelihood |
|------|------------|------------|
| 1 | `RUNTIME_ENV_MISSING_OR_MISMATCH_LIKELY` | **HIGH** |
| 2 | `TOKEN_VALUE_MISMATCH_LIKELY` | **HIGH** |
| 3 | `HEADER_CONTRACT_MISMATCH_LIKELY` | **RULED OUT** |
| 4 | `BRIDGE_HEADER_FORWARDING_ISSUE_LIKELY` | **LOW** |
| 5 | `DEPLOYMENT_STALENESS_LIKELY` | **LOW** |

Definitive separation of rank 1 vs 2 requires **authorized staging env metadata** (presence/length only — not values) or **L-85M-R5-R2T** rotation gate — not performed here.

## Headline

| Field | Value |
|-------|-------|
| Endpoint calls | **NOT PERFORMED** |
| Token use | **NOT PERFORMED** |
| Runtime DB proof | **NOT PERFORMED** |
| L-85M PASS | **NOT CLAIMED** |
| PR #5 | **UNTOUCHED** |

## Contents

| File | Purpose |
|------|---------|
| [BASELINE_VERIFICATION.md](./BASELINE_VERIFICATION.md) | Preflight |
| [PRIOR_R5_R1_RESULT.md](./PRIOR_R5_R1_RESULT.md) | Prior auth-rejected outcome |
| [AUTH_CONTRACT_SOURCE_REVIEW.md](./AUTH_CONTRACT_SOURCE_REVIEW.md) | Auth contract from source |
| [EXPECTED_ENV_VARIABLE_REVIEW.md](./EXPECTED_ENV_VARIABLE_REVIEW.md) | Expected env vars |
| [ACCEPTED_HEADER_NAMES_REVIEW.md](./ACCEPTED_HEADER_NAMES_REVIEW.md) | Accepted headers |
| [BRIDGE_HEADER_FORWARDING_REVIEW.md](./BRIDGE_HEADER_FORWARDING_REVIEW.md) | Bridge forwarding |
| [DEPLOYED_ROUTE_MAPPING_CONTEXT.md](./DEPLOYED_ROUTE_MAPPING_CONTEXT.md) | Route/deploy context |
| [FAILURE_MODE_MATRIX.md](./FAILURE_MODE_MATRIX.md) | Failure mode matrix |
| [SECRET_NON_DISCLOSURE_ATTESTATION.md](./SECRET_NON_DISCLOSURE_ATTESTATION.md) | Secret safety |
| [NO_ENDPOINT_CALL_ATTESTATION.md](./NO_ENDPOINT_CALL_ATTESTATION.md) | No HTTP calls |
| [NO_ENV_MUTATION_ATTESTATION.md](./NO_ENV_MUTATION_ATTESTATION.md) | No env mutation |
| [PR5_NON_INTERFERENCE.md](./PR5_NON_INTERFERENCE.md) | PR #5 |
| [NON_CLAIMS.md](./NON_CLAIMS.md) | Non-claims |
| [NEXT_GATE_RECOMMENDATION.md](./NEXT_GATE_RECOMMENDATION.md) | Next gate |

---

*End.*
