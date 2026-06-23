# L-86D — Production one-shot DB-readonly-proof (operator-executed)

**Gate UTC:** 2026-06-23  
**Evidence branch (planned):** `evidence/l86d-production-db-readonly-proof-2026-06-23`  
**Baseline `main`:** `bc0ae6e` (Merge PR #319 — L-86B production route parity)  
**Target project:** `zora-walat-api`  
**Target endpoint:** `https://zora-walat-api.vercel.app/ops/db-readonly-proof`

## Verdict

`L86D_PRODUCTION_DB_READONLY_PROOF_PASS_FILED_LOCAL_ONLY__HTTP_200_VERDICT_PASS_READONLY_ROLE_AND_PRIVILEGE_FLAGS_CONFIRMED_PRODUCTION_PASS_DB_READONLY_PROOF_ONLY_NO_TOKEN_EXPOSURE_NO_SECOND_REQUEST_NO_DIRECT_MANUAL_DB_QUERY_NO_DEPLOY_NO_REDEPLOY_NO_ENV_MUTATION_NO_CODE_MUTATION_NO_PAYMENT_PROVIDER_REAL_MONEY_GLOBAL_LAUNCH_MARKET_CLAIMS`

## Classification

**`AUTHENTICATED_READ_ONLY_DB_IDENTITY_PROOF_PASS_PRODUCTION`**

## Headline

| Field | Value |
|-------|--------|
| Gate chain | L-86B route parity → L-86A env → L-86C metadata → L-86C-R redeploy → **L-86D one-shot** |
| Active production deploy (pre-proof) | `dpl_Bzx564dBYynLjZjQ2wsV132148jc` @ `bc0ae6e` |
| Authenticated requests | **1** GET only |
| HTTP status | **200** |
| `verdict` | **PASS** |
| `checked_at` | **2026-06-23T01:20:03.949Z** |
| `PRODUCTION_PASS` | **YES_DB_READONLY_PROOF_ONLY** |
| L-85M PASS (staging) | **YES** — unchanged; staging-only scope preserved |
| Global / real-money / provider / launch | **NOT CLAIMED** |

## Contents

| File | Purpose |
|------|---------|
| [BASELINE_VERIFICATION.md](./BASELINE_VERIFICATION.md) | Preflight chain |
| [GATE_CHAIN_CONTEXT.md](./GATE_CHAIN_CONTEXT.md) | L-86B / L-86A / L-86C-R |
| [AUTHENTICATED_REQUEST_METADATA.md](./AUTHENTICATED_REQUEST_METADATA.md) | Request metadata |
| [HTTP_RESPONSE_SUMMARY.md](./HTTP_RESPONSE_SUMMARY.md) | HTTP + allowlisted JSON |
| [RUNTIME_PROOF_RESULT.md](./RUNTIME_PROOF_RESULT.md) | PASS flags |
| [RUNTIME_DB_IDENTITY_RESULT.md](./RUNTIME_DB_IDENTITY_RESULT.md) | DB identity |
| [READ_ONLY_ROLE_RESULT.md](./READ_ONLY_ROLE_RESULT.md) | Read-only role |
| [OWNER_FALLBACK_GUARD_RESULT.md](./OWNER_FALLBACK_GUARD_RESULT.md) | Owner URL guard |
| [NO_SECOND_REQUEST_ATTESTATION.md](./NO_SECOND_REQUEST_ATTESTATION.md) | Single request |
| [SECRET_NON_DISCLOSURE_ATTESTATION.md](./SECRET_NON_DISCLOSURE_ATTESTATION.md) | No secrets |
| [NO_DIRECT_DB_QUERY_ATTESTATION.md](./NO_DIRECT_DB_QUERY_ATTESTATION.md) | Controlled path |
| [NO_DEPLOY_ENV_CODE_MUTATION_ATTESTATION.md](./NO_DEPLOY_ENV_CODE_MUTATION_ATTESTATION.md) | No mutation |
| [NON_CLAIMS.md](./NON_CLAIMS.md) | Non-claims |
| [FINAL_RECONCILIATION.md](./FINAL_RECONCILIATION.md) | Locked final status |

---

*End.*
