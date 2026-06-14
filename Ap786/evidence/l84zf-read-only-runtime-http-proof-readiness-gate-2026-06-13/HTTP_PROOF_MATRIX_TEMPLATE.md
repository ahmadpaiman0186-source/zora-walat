# L-84ZF — HTTP proof matrix template

**For use in a future explicitly authorized execution gate only.**  
**L-84ZF prep: template unfilled — no HTTP proof claimed.**

**Target host (locked):** `https://zora-walat-api-staging.vercel.app`  
**Deployment source:** operator-recorded staging deployment URL / ID (no secrets)

| ID | Method | Path | Executed (Y/N) | Status | Body summary (redacted) | Timestamp (UTC) | No-secret | No-payment | No-provider | Pass/Fail |
|----|--------|------|----------------|--------|-------------------------|-----------------|-----------|------------|-------------|-----------|
| H1 | GET | `/health` | | | | | | | | |
| H2 | GET | `/api/health` | | | | | | | | |
| H3 | GET | `/` | | | | | | | | |
| H4 | GET | `/ready` | | | | | | | | |
| H5 | GET | `/api/ready` | | | | | | | | |
| H6 | GET | `/api/index` | | | | | | | | |
| H7 | HEAD | `/api/index` | | | | | | | | |
| H8 | GET | `/success` | | | | | | | | |
| H9 | GET | `/cancel` | | | | | | | | |
| A1 | POST | `/api/auth/login` | | | empty/invalid JSON only | | | | | |
| A2 | POST | `/api/auth/register` | | | no valid body | | | | | |
| A3 | POST | `/api/auth/request-otp` | | | no valid body | | | | | |
| W1 | POST | `/webhooks/stripe` | | | no Stripe-Signature header | | | | | |
| C1 | POST | `/api/create-checkout-session` | | | no Authorization bearer | | | | | |
| O1 | GET | `/ops/health` | | | unauthenticated only | | | | | |

## Gate completion attestation (execution gate — blank)

| Field | Value |
|-------|-------|
| All required rows executed | |
| Any secret in captured output | **Must be NO** |
| Any payment/checkout created | **Must be NO** |
| Any provider API invoked by proof | **Must be NO** |
| Overall matrix verdict | |

---

*End.*
