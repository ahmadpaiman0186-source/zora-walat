# L-85X — Route exposure / runtime route mapping audit

**Gate UTC:** 2026-06-17  
**Branch:** `evidence/l85x-route-exposure-runtime-route-mapping-audit-2026-06-17`  
**Baseline `main` HEAD:** `3cf1fd0` (Merge PR #284 — L-85M BLOCKED_404 evidence)  
**Verdict:** `L-85X_ROUTE_EXPOSURE_RUNTIME_MAPPING_AUDIT_FILED_LOCAL_ONLY__L85M_404_CAUSE_CLASSIFIED__NO_ENDPOINT_CALL_NO_TOKEN_USE_NO_DEPLOY_NO_ENV_MUTATION_NO_RUNTIME_DB_PROOF_NO_L85M_PASS_NO_GLOBAL_MONEY_PROVIDER_MARKET_CLAIMS`

## Purpose

Static audit of why L-85M authenticated `GET /ops/db-readonly-proof` returned **HTTP 404** on staging — **no live calls**.

## Headline finding

| Item | Result |
|------|--------|
| Route registered in tracked server code | **YES** |
| Route exposed on **root** Next.js Vercel deploy | **NO** (no rewrite/bridge) |
| Route exposed on **`server/`** Vercel deploy | **YES** (catch-all → `api/index.mjs`) |
| **404 classification** | **VERCEL_ENTRYPOINT_MISMATCH** + **BUILD_TARGET_MISMATCH** |
| Cause proven from tracked source | **YES** (suspected runtime state aligns with L-85W git `main` deploy) |
| `L85M_PASS` | **NO** |
| Runtime DB identity proven | **NO** |

## Contents

| File | Purpose |
|------|---------|
| [BASELINE_VERIFICATION.md](./BASELINE_VERIFICATION.md) | Preflight |
| [TRACKED_SOURCE_ROUTE_DISCOVERY.md](./TRACKED_SOURCE_ROUTE_DISCOVERY.md) | Route strings + files |
| [VERCEL_ENTRYPOINT_AND_ROUTE_MAP.md](./VERCEL_ENTRYPOINT_AND_ROUTE_MAP.md) | Root vs server deploy |
| [OPS_ROUTE_REGISTRATION_AUDIT.md](./OPS_ROUTE_REGISTRATION_AUDIT.md) | Express mount chain |
| [L85M_404_CLASSIFICATION.md](./L85M_404_CLASSIFICATION.md) | 404 taxonomy |
| [RUNTIME_PROOF_NON_OCCURRENCE_ATTESTATION.md](./RUNTIME_PROOF_NON_OCCURRENCE_ATTESTATION.md) | No live proof |
| [MUTATION_NON_OCCURRENCE_ATTESTATION.md](./MUTATION_NON_OCCURRENCE_ATTESTATION.md) | Boundaries |
| [NEXT_GATE_RECOMMENDATION.md](./NEXT_GATE_RECOMMENDATION.md) | Next safest gate |
| [NON_CLAIMS.md](./NON_CLAIMS.md) | Explicit non-claims |

---

*End.*
