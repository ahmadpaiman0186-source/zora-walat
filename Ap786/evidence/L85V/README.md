# L-85V — Operator-controlled Vercel staging READ_ONLY_DATABASE_URL env remediation

**Gate UTC:** 2026-06-17  
**Branch:** `evidence/l85v-vercel-staging-readonly-database-url-env-remediation-2026-06-17`  
**Baseline `main` HEAD:** `2afdae6` (Merge PR #281 — L-85U attestation update)  
**Target project:** **`zora-walat-api-staging`**  
**Verdict:** `L-85V_VERCEL_STAGING_READ_ONLY_DATABASE_URL_ENV_REMEDIATION_FILED_LOCAL_ONLY__READ_ONLY_DATABASE_URL_PRESENT_PRODUCTION_SENSITIVE__NO_VALUE_DISCLOSURE_NO_DEPLOY_NO_RUNTIME_PROOF_NO_AUTHENTICATED_PROOF_NO_L85M_GO_NO_GLOBAL_MONEY_PROVIDER_MARKET_CLAIMS`

## Purpose

Record operator-controlled addition of **`READ_ONLY_DATABASE_URL`** on Vercel staging under strict secret-hygiene controls. **Not** runtime proof, **not** deploy, **not** L-85M.

## Headline outcome

| Item | Result |
|------|--------|
| Env key added | **`READ_ONLY_DATABASE_URL`** |
| Scope | **Production only** |
| Sensitive flag | **ON** |
| Value exposed in evidence/chat | **NO** |
| Manual redeploy performed | **NO** |
| Runtime pickup proven | **NO** |
| `L85M_GO` | **NO** |
| `L85M_BLOCKED` | **YES** (pending redeploy/pickup + authenticated proof gates) |

## Contents

| File | Purpose |
|------|---------|
| [OPERATOR_ENV_REMEDIATION_ATTESTATION.md](./OPERATOR_ENV_REMEDIATION_ATTESTATION.md) | Operator remediation record |
| [STAGING_ENV_KEY_PRESENCE_AFTER_REMEDIATION.md](./STAGING_ENV_KEY_PRESENCE_AFTER_REMEDIATION.md) | Post-remediation key matrix |
| [SECRET_NON_DISCLOSURE_ATTESTATION.md](./SECRET_NON_DISCLOSURE_ATTESTATION.md) | Hygiene attestation |
| [DEPLOYMENT_PICKUP_NON_CLAIM.md](./DEPLOYMENT_PICKUP_NON_CLAIM.md) | No runtime pickup claim |
| [L85M_BLOCKER_REASSESSMENT.md](./L85M_BLOCKER_REASSESSMENT.md) | Blocker update vs L-85U |
| [MUTATION_BOUNDARY_ATTESTATION.md](./MUTATION_BOUNDARY_ATTESTATION.md) | Allowed/forbidden mutations |
| [NON_CLAIMS.md](./NON_CLAIMS.md) | Explicit non-claims |

## Next authorized gates (not L-85V)

1. **Redeploy/pickup gate** — staging deploy from `server/` so Production env is loaded (no authenticated proof).
2. **Key-presence re-attestation** — names only post-deploy.
3. **L-85M** — authenticated runtime DB proof (separate operator authorization).

---

*End.*
