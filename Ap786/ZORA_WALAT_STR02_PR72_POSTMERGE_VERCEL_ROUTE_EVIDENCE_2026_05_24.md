# STR-02 PR72 Post-Merge Vercel Route Evidence

**Date:** 2026-05-24
**Type:** Post-merge read-only evidence gate - **NOT a replay record** and **NOT a fix-proven claim**
**Evidence folder:** [str02-pr72-postmerge-vercel-route-evidence-2026-05-24](./evidence/str02-pr72-postmerge-vercel-route-evidence-2026-05-24/README.md)

**Policy:** Docs/evidence only. No deploy, no redeploy, no Vercel settings edit, no env edit, no Stripe resend/replay/test event, no API call.

---

## 1. Baseline

| Item | Status |
|------|--------|
| PR #72 | **MERGED** |
| Merge commit | `2059e46` |
| Implementation commit | `4b57499` |
| Implementation branch | `fix/str02-404-webhook-routing-staging-2026-05-24` |
| Manual deploy/redeploy | **NOT AUTHORIZED** |
| Stripe resend/replay/test event | **NOT AUTHORIZED / NOT EXECUTED** |
| Local screenshot ingestion | **8 PNGs INGESTED** from `C:\Users\ahmad\Downloads\PR72` |
| Fix proven | **NOT YET** |

---

## 2. Implementation Under Review

| Change | Status |
|--------|--------|
| Root serverless bridge | `api/webhooks/stripe.mjs` merged |
| Root rewrite | `/webhooks/stripe` -> `/api/webhooks/stripe` merged |
| Root install command | server dependency install added |
| Bridge tests | `server/test/rootVercelWebhookBridge.test.js` merged |
| Static route verifier | `npm run verify:str02-route` **PASS** |
| CI route regression guard | Super-System Guard integration **ADDED** |
| Self-repair dry-run | Apply **GATED / NOT ENABLED** |

**Important:** Merged code is not deployed proof. Route surface evidence must come from read-only Vercel deployment screenshots.

---

## 3. Evidence IDs

| Evidence ID | Required Evidence | Status |
|-------------|-------------------|--------|
| PR72-D01 | Latest Vercel deployment source/commit after PR #72 | **CAPTURED** - `main` `d274a82` / PR #74 |
| PR72-D02 | Deployment overview source/commit and current production deployment | **CAPTURED** - production/current deployment |
| PR72-D03 | Deployment build output proving root build started for `main` `d274a82` | **CAPTURED** |
| PR72-D04 | Deployment build output middle | **MISSING / NOT PROVIDED** |
| PR72-D05 | Deployment resources/functions showing whether `/api/webhooks/stripe` exists | **CAPTURED** - `/api/webhooks/stripe` visible |
| PR72-D06 | Logs search for `/webhooks/stripe` without sending requests | **CAPTURED** - no logs found |
| PR72-D07 | Logs search for `stripe` without sending requests | **CAPTURED** - no logs found |
| PR72-D08 | Domain mapping for `zora-walat-api-staging.vercel.app` | **CAPTURED** - valid configuration / production |
| PR72-S01 | Supplemental deployment-list screenshot | **CAPTURED** - `VERCEL-PR72-LATEST-DEPLOYMENT-SOURCE-COMMIT-004.png` |

---

## 4. Interpretation Rules

| If observed | Record as | Do not claim |
|-------------|-----------|--------------|
| `/api/webhooks/stripe` in Functions/Resources | **PARTIAL DEPLOYMENT EVIDENCE** | Fix proven |
| `main` `d274a82` / PR #74 deployment source | **DEPLOYMENT SOURCE EVIDENCE** | HTTP 200 |
| No logs for webhook searches | **NO REQUEST OBSERVED / NO RUNTIME CORRELATION** | Failure |
| HTTP 200 from approved resend/probe | **HTTP 200 EVIDENCE** | Production-ready |

---

## 5. Current Verdict

| Item | Status |
|------|--------|
| Implementation merged | **YES** |
| Static route bridge verification | **PASS** |
| Deployed Vercel route surface | **PARTIAL DEPLOYMENT EVIDENCE CAPTURED** |
| HTTP 200 | **NOT ACHIEVED** |
| Stripe resend after fix | **NOT AUTHORIZED / NOT EXECUTED** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*PR72 post-merge evidence gate - route surface partially captured - no resend*
