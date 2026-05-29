# CORE-05 Runtime Test Evidence

**Date:** 2026-05-29  
**Command:** `npm run test:idempotency-kernel` (from `server/`)

---

## Scope

- Pure unit tests — `test/idempotencyKernelControl.test.js`  
- Fixtures — `test/fixtures/idempotencyKernel/attempts.mjs`  
- No live API, DB, or env dependency  

---

## Fixture map

| Fixture | Scenario | Expected decision |
|---------|----------|-------------------|
| a | Duplicate checkout | `BLOCK_DUPLICATE` |
| b | Duplicate webhook event | `BLOCK_DUPLICATE` |
| c | Duplicate provider execution | `BLOCK_DUPLICATE` |
| d | Duplicate provider reference | `BLOCK_DUPLICATE` |
| e | Retry after timeout | `RETRY_UNSAFE` |
| f | Retry after success | `BLOCK_DUPLICATE` |
| g | Missing key material | `BLOCK_AMBIGUOUS` |
| h | Stale pending retry | `RETRY_UNSAFE` |
| i | Healthy first attempt | `ALLOW` |
| j | Paid, no provider proof | `PENDING_REVIEW` |
| k | Fulfilled, no proof | `BLOCK_AMBIGUOUS` |

---

## Validation run (2026-05-29)

```
npm run test:idempotency-kernel
# tests 14 | pass 14 | fail 0 | duration_ms ~222
```

Additional assertion: `mutationAllowed === false` for all fixture decisions in batch report.

---

## Not proven

- Live duplicate prevention under concurrency  
- Stripe webhook replay in staging  
- Reloadly 409 / registry integration  
- Production registry durability  

---

*End of test evidence.*
