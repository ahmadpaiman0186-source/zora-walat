# L-85M-R2B-FIX1 — Failing test identification

**Gate UTC:** 2026-06-19

---

## Failing test

| Field | Value |
|-------|-------|
| File | `server/test/rootVercelWebhookBridge.test.js` |
| Suite | `root Vercel webhook route declaration` |
| Test name | `rewrites /webhooks/stripe and L-84ZJ health/ready probes to root serverless bridges` |
| Line | ~74 |

## Assertion (non-secret)

```
AssertionError: Expected values to be strictly deep-equal
operator: deepStrictEqual
```

## Diff summary (non-secret)

Expected `vercel.json` `rewrites` array ended at `/create-checkout-session`.

Actual array included two additional entries added by L-85M-R2B:

| source | destination |
|--------|-------------|
| `/ops/db-readonly-proof` | `/api/ops/db-readonly-proof` |
| `/ops/health` | `/api/ops/health` |

## CI command path

`.github/workflows/ci.yml` → server job → `npm run test:ci` → `npm run test` → includes `rootVercelWebhookBridge.test.js`.

---

*End.*
