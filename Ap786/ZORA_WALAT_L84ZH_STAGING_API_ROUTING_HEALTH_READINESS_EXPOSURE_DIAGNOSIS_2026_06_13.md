# L-84ZH — Staging API routing / health / readiness exposure diagnosis

**Date:** 2026-06-13
**Branch:** `evidence/l84zh-staging-api-routing-health-readiness-exposure-diagnosis-2026-06-13`
**Base:** `f3e268e` — main (L-84ZG PR #240 merged)
**Phase:** **Read-only diagnosis** — no runtime fix
**Verdict:** `CORE10-L84ZH-VERDICT-PREP: STAGING_API_ROUTING_HEALTH_READINESS_EXPOSURE_DIAGNOSIS_PREPARED_L84ZG_PARTIAL_CORRELATED_NO_RUNTIME_FIX_NO_REDEPLOY_NO_PAYMENT_NO_PROVIDER_NO_MARKET_GLOBAL_LAUNCH_NO_GO`

---

## Summary

**L-84ZH** diagnoses why [L-84ZG](./ZORA_WALAT_L84ZG_READ_ONLY_GET_HEAD_RUNTIME_HTTP_PROOF_EXECUTION_2026_06_13.md) was **PARTIAL**: staging host is reachable, but **`/health` / `/ready` JSON probes hit Next.js 404 HTML** while **`/api/webhooks/stripe` hits root `api/webhooks/stripe.mjs`**. Root cause class: **deployment-target + Vercel rewrite gap** — project builds from repo root (`./`, Next.js), not `server/`; only webhook path has an explicit root bridge + rewrite. **`server/api/index.mjs` liveness/readiness logic is implemented in repo but not exposed** on current staging route surface.

## Diagnosis conclusion

| Question | Answer |
|----------|--------|
| Primary cause class | **Deployment-target mismatch** + **missing Vercel rewrites/bridges** |
| Code missing? | **NO** — health/ready in `server/api/index.mjs` |
| Redeploy alone sufficient? | **NO** — config/routing correction required first |
| Next authorized step class | **Runtime route bridge / rewrite correction** → then **redeploy verification gate** → then **HTTP re-proof** |

## Unchanged blockers

| Item | Status |
|------|--------|
| Full runtime proof | **NOT CLAIMED** |
| L-84P full proof | **NOT CLAIMED** |
| Global launch | **NO-GO** |

## Evidence package

[Ap786/evidence/l84zh-staging-api-routing-health-readiness-exposure-diagnosis-2026-06-13/](./evidence/l84zh-staging-api-routing-health-readiness-exposure-diagnosis-2026-06-13/)

Prior: [L-84ZG](./ZORA_WALAT_L84ZG_READ_ONLY_GET_HEAD_RUNTIME_HTTP_PROOF_EXECUTION_2026_06_13.md) · [L-84ZF](./ZORA_WALAT_L84ZF_READ_ONLY_RUNTIME_HTTP_PROOF_READINESS_GATE_2026_06_13.md)

---

*End.*
