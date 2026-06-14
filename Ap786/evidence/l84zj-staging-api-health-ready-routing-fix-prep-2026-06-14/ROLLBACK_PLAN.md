# L-84ZJ — Rollback plan

**Verdict:** `CORE10-L84ZJ-VERDICT-PREP: STAGING_API_HEALTH_READY_ROUTING_FIX_PREPARED_NO_REDEPLOY_NO_HTTP_PROOF_NO_PAYMENT_NO_PROVIDER_NO_MARKET_GLOBAL_LAUNCH_NO_GO`

## Rollback trigger examples

- Health/ready bridge causes unexpected staging behavior after redeploy
- Function count or cold-start regression unacceptable
- Readiness JSON exposes unexpected fields (should not — fail closed by design)
- Webhook path regression (must not occur — webhook file untouched)

## Rollback steps (code)

1. Revert merge commit or PR that introduced L-84ZJ
2. Or manually:
   - Delete `api/health-ready.mjs`
   - Delete `server/test/rootHealthReadyBridge.test.js`
   - Restore `vercel.json` to webhook-only rewrite block
   - Revert Ap786 L-84ZJ evidence if desired

## Rollback steps (deployment)

1. After any redeploy that included L-84ZJ, redeploy previous known-good commit on staging
2. Re-run read-only GET/HEAD proof gate to confirm prior surface restored

## Rollback safety properties

| Property | Notes |
|----------|-------|
| Webhook isolation | `api/webhooks/stripe.mjs` not edited |
| No env mutation | Rollback is git revert + redeploy only |
| No data mutation | Bridge has no POST/payment/DB write paths |
| Auditable | Two runtime files + test; diff is small |

## Post-rollback state

Health/ready paths return to L-84ZG **PARTIAL** surface (Next.js 404 HTML) until a replacement fix is merged and redeployed.

---

*End.*
