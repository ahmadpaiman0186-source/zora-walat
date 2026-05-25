# STR-02 CI Route Regression Guard

**Date:** 2026-05-24
**Parent:** [Super-System Route Intelligence Pack](./ZORA_WALAT_SUPER_SYSTEM_ROUTE_INTELLIGENCE_PACK_2026_05_24.md)

**Policy:** CI static guard only. No secrets, no deploy, no endpoint probe, no external service calls.

---

## 1. CI Integration

| Workflow | Change | Status |
|----------|--------|--------|
| `.github/workflows/super-system-guard.yml` | Adds `npm run verify:str02-route` from repo root | **ADDED** |

The guard runs after checkout/setup and before broader `zw-doctor` checks. It uses local filesystem inspection only.

---

## 2. Guarded Invariants

| Invariant | CI failure if |
|-----------|---------------|
| `/webhooks/stripe` rewrite exists | Rewrite missing or points elsewhere |
| Root bridge exists | `api/webhooks/stripe.mjs` missing |
| Bridge reuses slim handler | `handleSlimStripeWebhookPost` not referenced |
| Unsupported methods fail closed | POST-only 405 guard not visible |
| No direct money mutation | Bridge contains direct Prisma/payment mutation terms |
| Frontend routes preserved | root app route files missing |

---

## 3. Commands

```text
npm run verify:str02-route
cd server
node --import ./test/setupTestEnv.mjs --test --test-force-exit --test-concurrency=1 test/str02RootVercelRouteVerifier.test.js
```

---

## 4. Conservative Verdict

| Item | Status |
|------|--------|
| Implementation merged | **YES** |
| CI static guard | **ADDED** |
| Static route bridge verification | **PASS** |
| Deployed Vercel route surface | **PENDING** |
| HTTP 200 | **NOT ACHIEVED** |
| Stripe resend after fix | **NOT AUTHORIZED / NOT EXECUTED** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*CI route regression guard - static only*
