# L-84ZJ — Staging API health/ready routing fix preparation

**Date:** 2026-06-14
**Branch:** `fix/l84zj-staging-api-health-ready-routing-fix-prep-2026-06-14`
**Base:** `55fbdef` — main (L-84ZI PR #242 merged)
**Phase:** **Routing fix prep** — code/config only; no redeploy; no HTTP proof
**Verdict:** `CORE10-L84ZJ-VERDICT-PREP: STAGING_API_HEALTH_READY_ROUTING_FIX_PREPARED_NO_REDEPLOY_NO_HTTP_PROOF_NO_PAYMENT_NO_PROVIDER_NO_MARKET_GLOBAL_LAUNCH_NO_GO`

---

## Summary

**L-84ZJ** prepares a minimal, rollback-safe root deployment bridge so staging (`zora-walat-api-staging`, repo root `./`) can expose JSON **health** and **readiness** routes without changing Stripe webhook behavior. Implements the direction diagnosed in [L-84ZH](./ZORA_WALAT_L84ZH_STAGING_API_ROUTING_HEALTH_READINESS_EXPOSURE_DIAGNOSIS_2026_06_13.md).

## Fix approach

| Item | Choice |
|------|--------|
| Pattern | Root API bridge (same class as `api/webhooks/stripe.mjs`) |
| New serverless function | **One** — `api/health-ready.mjs` |
| Rewrites | `/health`, `/ready`, `/api/health`, `/api/ready` → bridge with `?route=` |
| Handler reuse | `sendLivenessJsonOk`, `handleSlimReady` from server slim paths |
| Webhook rewrite | **Unchanged** |

## Runtime/config files changed

| File | Change |
|------|--------|
| `vercel.json` | Add four health/ready rewrites |
| `api/health-ready.mjs` | **New** root probe bridge |
| `server/test/rootHealthReadyBridge.test.js` | **New** local bridge tests |

## Post-merge gates (not in this prep)

| Gate | Status |
|------|--------|
| Vercel redeploy | **NOT AUTHORIZED** |
| HTTP re-proof (L-84ZG class) | **NOT EXECUTED** |
| Full runtime proof | **NOT CLAIMED** |
| Global launch | **NO-GO** |

## Evidence package

[Ap786/evidence/l84zj-staging-api-health-ready-routing-fix-prep-2026-06-14/](./evidence/l84zj-staging-api-health-ready-routing-fix-prep-2026-06-14/)

Prior: [L-84ZH](./ZORA_WALAT_L84ZH_STAGING_API_ROUTING_HEALTH_READINESS_EXPOSURE_DIAGNOSIS_2026_06_13.md) · [L-84ZG](./ZORA_WALAT_L84ZG_READ_ONLY_GET_HEAD_RUNTIME_HTTP_PROOF_EXECUTION_2026_06_13.md) · [L-84ZI](./ZORA_WALAT_L84ZI_PR232_SUPERSEDED_CLOSURE_BRANCH_DELETION_EVIDENCE_2026_06_13.md)

## Prep disposition

**READY_FOR_COMMIT** — pending operator review; no redeploy or HTTP proof in this gate.

---

*End.*
