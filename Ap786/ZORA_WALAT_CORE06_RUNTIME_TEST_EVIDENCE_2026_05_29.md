# CORE-06 Runtime Test Evidence

**Date:** 2026-05-29  
**Command:** `npm run test:no-pay-no-service` (from `server/`)

---

## Fixture map (a–l)

| Fixture | Scenario | Expected decision |
|---------|----------|-------------------|
| a | Healthy payment + provider + audit | `ALLOW_DELIVERY` |
| b | Paid, provider proof missing | `PENDING_REVIEW` |
| c | Provider success, payment missing | `BLOCK_NO_PAYMENT` |
| d | Completed without provider reference | `BLOCK_AMBIGUOUS` |
| e | Provider timeout / ambiguous | `BLOCK_AMBIGUOUS` |
| f | Delivered flag, no payment | `BLOCK_NO_PAYMENT` |
| g | Delivered flag, no provider proof | `BLOCK_NO_PROVIDER_PROOF` |
| h | Duplicate / idempotency risk | `FAIL_CLOSED` |
| i | Missing audit on money path | `FAIL_CLOSED` |
| j | Stale pending + paid | `PENDING_REVIEW` |
| k | Failed payment, no provider | `FAIL_CLOSED` |
| l | Sandbox non-money | `ALLOW_DELIVERY` |

---

## Validation run (2026-05-29)

```
npm run test:no-pay-no-service
# tests 17 | pass 17 | fail 0 | duration_ms ~253
```

---

## Not proven

- Production no-pay-no-service enforcement  
- Webhook → fulfill gate under load  
- User-visible delivery claims in all corridors  

---

*End of test evidence.*
