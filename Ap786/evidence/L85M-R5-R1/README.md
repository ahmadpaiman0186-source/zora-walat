# L-85M-R5-R1 — Authenticated read-only DB identity proof retry

**Gate UTC:** 2026-06-20  
**Branch:** `evidence/l85m-r5-r1-authenticated-readonly-db-identity-proof-retry-2026-06-20`  
**Target:** `https://zora-walat-api-staging.vercel.app/ops/db-readonly-proof`

## Verdict

`L-85M-R5-R1_AUTHENTICATED_READONLY_DB_IDENTITY_PROOF_FAIL_AUTH_REJECTED_FILED_LOCAL_ONLY__ROUTE_MATCHED_API_OPS_DB_READONLY_PROOF_AUTH_REJECTED_RUNTIME_USER_NOT_PROVEN_NO_RUNTIME_DB_PROOF_NO_SECRET_EXPOSURE_NO_DEPLOY_NO_ENV_MUTATION_NO_PAYMENT_PROVIDER_ACTION_PR5_OPEN_BLOCKED_NO_PR5_MERGE_NO_PR5_CLOSE_NO_GLOBAL_MONEY_PROVIDER_MARKET_CLAIMS`

## Classification

**`L-85M-R5-R1_AUTH_REJECTED_NOT_PASS`**

## Headline

| Field | Value |
|-------|-------|
| Route mapping | **STRUCTURALLY CONFIRMED** (`X-Matched-Path: /api/ops/db-readonly-proof`) |
| Bearer auth variant | **401 Unauthorized** — proof **NOT ACCEPTED** |
| `X-ZW-Ops-Token` variant | **401 Unauthorized** — proof **NOT ACCEPTED** |
| Runtime DB user | **NOT PROVEN** |
| Runtime DB query | **NOT PROVEN** |
| Read-only DB identity proof | **NOT ESTABLISHED** |
| L-85M PASS | **NOT CLAIMED** |
| Open PR state | **PASS_ONLY_PR5_OPEN** (PR #5 only) |

## Contents

| File | Purpose |
|------|---------|
| [BASELINE_VERIFICATION.md](./BASELINE_VERIFICATION.md) | Preflight |
| [PRIOR_R5_INCONCLUSIVE_CONTEXT.md](./PRIOR_R5_INCONCLUSIVE_CONTEXT.md) | Prior R5 inconclusive context |
| [AUTH_CONTRACT_REVIEW.md](./AUTH_CONTRACT_REVIEW.md) | Tracked auth contract |
| [AUTH_CONTRACT_VARIANT_RESULTS.md](./AUTH_CONTRACT_VARIANT_RESULTS.md) | Bearer vs alternate header results |
| [AUTH_REJECTION_ANALYSIS.md](./AUTH_REJECTION_ANALYSIS.md) | Auth rejection analysis |
| [AUTHENTICATED_REQUEST_METHOD.md](./AUTHENTICATED_REQUEST_METHOD.md) | Request method |
| [HTTP_STATUS_AND_RESPONSE_SHAPE.md](./HTTP_STATUS_AND_RESPONSE_SHAPE.md) | Allowlisted HTTP fields |
| [RUNTIME_DB_IDENTITY_PROOF.md](./RUNTIME_DB_IDENTITY_PROOF.md) | Runtime DB proof status |
| [READ_ONLY_ROLE_ASSERTION.md](./READ_ONLY_ROLE_ASSERTION.md) | Read-only role |
| [OWNER_ROLE_NEGATIVE_ASSERTION.md](./OWNER_ROLE_NEGATIVE_ASSERTION.md) | Owner role negative |
| [TOKEN_HANDLING_ATTESTATION.md](./TOKEN_HANDLING_ATTESTATION.md) | Token non-disclosure |
| [SECRET_NON_DISCLOSURE_REVIEW.md](./SECRET_NON_DISCLOSURE_REVIEW.md) | Secret safety |
| [NEXT_GATE_RECOMMENDATION.md](./NEXT_GATE_RECOMMENDATION.md) | Next gate |
| [NON_CLAIMS.md](./NON_CLAIMS.md) | Non-claims |

---

*End.*
