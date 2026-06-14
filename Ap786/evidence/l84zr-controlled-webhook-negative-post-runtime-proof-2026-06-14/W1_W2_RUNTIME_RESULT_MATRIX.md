# L-84ZR — W1/W2 runtime result matrix

**Probe UTC:** `2026-06-14T21:56:34Z`
**Base:** `https://zora-walat-api-staging.vercel.app`
**Verdict:** `CORE10-L84ZR-VERDICT-001: CONTROLLED_WEBHOOK_NEGATIVE_POST_RUNTIME_BOUNDARY_PROOF_PASS_NO_PAYMENT_NO_PROVIDER_NO_MARKET_GLOBAL_LAUNCH_NO_GO`

| ID | Method | Path | Status | Duration (ms) | Content-Type (observed) | Pass? |
|----|--------|------|--------|---------------|-------------------------|-------|
| **W1** | POST | `/api/webhooks/stripe` | **400** | 1934.36 | `application/json` (inferred) | **PASS** |
| **W2** | POST | `/webhooks/stripe` | **400** | 342.14 | `application/json` (inferred) | **PASS** |

## Request constraints (both probes)

| Field | Value |
|-------|--------|
| Body | `{}` |
| Headers | `Content-Type: application/json` only |
| Authorization | **none** |
| Stripe-Signature | **none** |

## Pass criteria evaluation

| Criterion | W1 | W2 |
|-----------|----|----|
| Controlled 4xx (400-class) | **Yes** | **Yes** |
| No 2xx | **Yes** | **Yes** |
| No 5xx | **Yes** | **Yes** |
| No timeout (<30s) | **Yes** | **Yes** |
| No payment/session/customer/provider IDs | **Yes** | **Yes** |
| No client_secret / whsec_ / sk_* | **Yes** | **Yes** |
| Only W1/W2 executed | **Yes** | **Yes** |

## Sanitized response (both identical)

```json
{"success":false,"message":"Invalid request","error":"Invalid request","code":"validation_error"}
```

Body length: **97** bytes each.

---

*End.*
