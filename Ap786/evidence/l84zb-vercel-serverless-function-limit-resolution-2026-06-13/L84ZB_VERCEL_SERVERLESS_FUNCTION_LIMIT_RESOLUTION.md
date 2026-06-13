# L-84ZB — Vercel serverless function limit resolution (code-level)

**GLOBAL INTERNATIONAL REAL-PROOF STANDARD — Zora-Walat**

NO L WITHOUT REAL PROOF · NO FAKE PROOF · NO MARKETING CLAIM WITHOUT MARKET PROOF · NO MONEY CLAIM WITHOUT MONEY PROOF · NO GLOBAL CLAIM WITHOUT GLOBAL ENGINEERING EVIDENCE · REAL APP FOR GLOBAL REVENUE, NOT A DEMO

**Date:** 2026-06-13
**Branch:** `fix/l84zb-vercel-serverless-function-limit-resolution-2026-06-13`
**Base:** `main` (post L-84Z prep PR #231)
**Gate:** L-84ZB — code-level Hobby plan function-count blocker resolution

---

## Original blocker

Vercel deployment for **`zora-walat-api`** failed with:

> No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan. Create a team (Pro plan) to deploy more.

Read-only inventory (pre-fix):

| Metric | Count |
|--------|------:|
| `API_FILE_COUNT` | 20 |
| `NEXT_API_COUNT` | 0 |
| `SERVER_API_COUNT` | 18 |
| `ROOT_API_COUNT` | 1 |

**Root cause (engineering):** Vercel counts each file under `server/api/` as a Serverless Function. Although `server/vercel.json` routes all traffic to `/api/index.mjs`, 17 internal handler modules lived beside the entrypoint and inflated the function count above Hobby limit (12).

## Fix (repo-only consolidation)

Moved internal slim/webhook handler modules from `server/api/` to `server/handlers/`. Kept **one** Vercel API entrypoint:

- `server/api/index.mjs` — sole `server/api` function file; dynamic imports now target `../handlers/*`

Root bridge unchanged in role:

- `api/webhooks/stripe.mjs` — still delegates to shared handler module (path updated)

`server/vercel.json` unchanged:

```json
{ "routes": [{ "src": "/(.*)", "dest": "/api/index.mjs" }] }
```

## After counts (local, 2026-06-13)

| Metric | Count |
|--------|------:|
| `API_FILE_COUNT` | **2** |
| `NEXT_API_COUNT` | **0** |
| `SERVER_API_COUNT` | **1** |
| `ROOT_API_COUNT` | **1** |

Command:

```powershell
$serverApi = Get-ChildItem -Recurse server\api -File | Where-Object { $_.Extension -match "\.(ts|tsx|js|jsx|mjs|cjs)$" }
$rootApi = Get-ChildItem -Recurse api -File | Where-Object { $_.Extension -match "\.(ts|tsx|js|jsx|mjs|cjs)$" }
```

## Files moved (`git mv`)

From `server/api/` → `server/handlers/`:

| File |
|------|
| `slimAuthLoginHandler.mjs` |
| `slimAuthRegisterHandler.mjs` |
| `slimAuthRequestOtpHandler.mjs` |
| `slimCheckoutReturnHandler.mjs` |
| `slimCreateCheckoutHandler.mjs` |
| `slimReadyEnv.mjs` |
| `slimReadyHandler.mjs` |
| `slimStagingOperatorOrderStatusHandler.mjs` |
| `slimStagingOperatorPhase1TruthHandler.mjs` |
| `slimStagingOperatorRefundableCandidatesHandler.mjs` |
| `slimStagingOperatorRefundTargetHandler.mjs` |
| `slimStagingOperatorVerifyEmailHandler.mjs` |
| `slimStripeWebhookChargeRefunded.mjs` |
| `slimStripeWebhookCheckoutCompleted.mjs` |
| `slimStripeWebhookCheckoutExpired.mjs` |
| `slimStripeWebhookHandler.mjs` |
| `stripeWebhookAudit.mjs` |

**Remaining in `server/api/`:** `index.mjs` only.

## Import path updates

| Location | Change |
|----------|--------|
| `server/api/index.mjs` | `./slim*.mjs` → `../handlers/slim*.mjs` |
| `api/webhooks/stripe.mjs` | `../../server/api/slimStripeWebhookHandler.mjs` → `../../server/handlers/slimStripeWebhookHandler.mjs` |
| `server/test/slim*.test.js`, `stripeWebhookAudit.test.js`, `orderStateSafetyAudit.test.js` | `../api/` → `../handlers/` (entrypoint tests keep `../api/index.mjs`) |
| `server/test/str02RootVercelRouteVerifier.test.js` | handler path → `server/handlers/` |
| `server/scripts/verify-str02-root-vercel-route.mjs` | slim handler path → `server/handlers/` |
| `server/tools/zwDoctor/invariants.mjs` | invariant paths `api/` → `handlers/` |

Internal handler-to-handler imports under `server/handlers/` remain relative (`./`) — no behavior change.

## Validation (local)

| Check | Result |
|-------|--------|
| `git status --short` | Changes limited to move + import updates + this evidence |
| `npm --prefix server run secrets:scan` | **OK** |
| `git diff --check` | **PASS** |
| Slim/route/handler tests (92 cases) | **PASS** — `node --import ./test/setupTestEnv.mjs --test --test-concurrency=1` on slim entrypoint + webhook + STR-02 + audit suites |

## Verdict

| Item | Status |
|------|--------|
| **Local code-level blocker resolution** | **PASS** |
| **Vercel deployment proof** | **NOT CLAIMED** |
| **Runtime proof** | **NOT CLAIMED** |
| **Global launch** | **NO-GO** |

## Explicit non-actions

| Action | Performed |
|--------|-----------|
| Vercel mutation | **NO** |
| Redeploy | **NO** |
| Env update | **NO** |
| Stripe secret access | **NO** |
| HTTP / L-84P proof | **NO** |
| PR #232 merge | **NO** (remains HOLD) |
| PR #233 merge | **NO** |
| Global launch claim | **NO** |

## Related gates (unchanged)

PR **#232** (L-84Z operator attestation) remains **HOLD** until this fix is reviewed/merged and a later authorized deployment/proof gate runs.

**L-84 NOT PROVED** · **L-74 OPEN** · **L-84P retry NOT AUTHORIZED**

## Business option (separate — not primary fix)

Vercel Pro/Team plan would also raise the function limit. L-84ZB treats **code consolidation** as the primary engineering fix; plan upgrade is a separate business decision only.

---

*End.*
