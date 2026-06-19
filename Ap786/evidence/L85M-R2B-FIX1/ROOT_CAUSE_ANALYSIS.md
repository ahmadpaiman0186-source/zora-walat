# L-85M-R2B-FIX1 — Root cause analysis

**Gate UTC:** 2026-06-19

---

## Cause chain

1. L-85M-R2B added two targeted rewrites to root `vercel.json` (correct, intentional).
2. Existing test `rootVercelWebhookBridge.test.js` uses `assert.deepEqual` on the **entire** `rewrites` array with a fixed snapshot from pre-R2B state.
3. New ops rewrites make actual ≠ expected → **1 test failure** in CI.

## Related to R2B?

**YES** — failure is a direct consequence of L-85M-R2B `vercel.json` mutation, not payment/webhook/runtime logic regression.

## Not the cause

| Ruled out | Reason |
|-----------|--------|
| `api/webhooks/stripe.mjs` change | File unchanged in R2B |
| STR-02 verifier | Still passes (no catch-all; webhook rewrite intact) |
| Ops bridge runtime | Not exercised by this test (static JSON inventory only) |
| Payment path regression | Failure is JSON inventory mismatch, not handler behavior |

---

*End.*
