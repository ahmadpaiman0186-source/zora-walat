# L-84ZU — Local test results

**Gate UTC:** 2026-06-15  
**Scope:** Mocked entrypoint tests only — no live Stripe, provider, Vercel, or production DB  
**Runtime POST:** **NOT EXECUTED**

## Command pattern

From `server/`:

```text
node --import ./test/setupTestEnv.mjs --test --test-force-exit --test-concurrency=1 <test-file>
```

## Results

| Test file | Pass | Fail | Notes |
|-----------|------|------|-------|
| `test/slimCreateCheckoutEntrypoint.test.js` | **4** | **0** | 401 no bearer; 415 non-JSON; mocked 200 success; index routing 415 |
| `test/slimAuthLoginEntrypoint.test.js` | **4** | **0** | 400 content-type/JSON; 401/403 failed login; index routing 400 |
| `test/slimAuthRegisterEntrypoint.test.js` | **6** | **0** | 415/400 validation; 409 duplicate mocked; 201 success mocked; index 415 |
| `test/slimAuthRequestOtpEntrypoint.test.js` | **6** | **0** | 415/400 validation; 403 owner-only; 200 mocked public contract; index 415 |
| **Total** | **20** | **0** | |

## Exit codes

All four commands exited **0**.

## What local tests prove (bounded)

- Slim handlers reject missing/invalid input **before** orchestration in tested paths
- `api/index.mjs` routes POST checkout/auth to slim handlers without bootstrap health hook side effects (tested paths)
- Mocked success paths use `globalThis.__zwSlim*` hooks — **not** live payment/provider/DB

## What local tests do NOT prove

- Runtime staging/production fail-closed behavior for checkout/auth negative POST
- Express-only routes (`verify-otp`, `refresh`, `logout`, `create-payment-intent`, `checkout-pricing-quote`)
- Invalid Bearer token at **runtime** against staging API
- Production DB zero-write on any path

---

*End.*
