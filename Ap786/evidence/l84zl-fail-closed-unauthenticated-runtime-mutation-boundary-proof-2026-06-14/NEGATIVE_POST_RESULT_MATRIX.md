# L-84ZL — Negative POST result matrix

**Host:** `https://zora-walat-api-staging.vercel.app`
**Probe UTC:** `2026-06-14T18:55:54Z`
**Payload:** `{}` · **No auth headers**
**Verdict:** `CORE10-L84ZL-VERDICT-002: FAIL_CLOSED_UNAUTHENTICATED_RUNTIME_MUTATION_BOUNDARY_PROOF_PARTIAL_UNPROBED_WEBHOOK_AUDIT_WRITE_RISK_REMAINS_NO_PAYMENT_NO_PROVIDER_NO_MARKET_GLOBAL_LAUNCH_NO_GO`

## Executed probes (H1–H6)

| ID | Method | Path | Status | curl_ms | Content-Type | Body preview (redacted) | Pass? |
|----|--------|------|--------|---------|--------------|-------------------------|-------|
| H1 | POST | `/api/health-ready?route=health` | **405** | 1222 | application/json | `{"success":false,"code":"method_not_allowed"}` | **YES** |
| H2 | POST | `/api/health-ready?route=ready` | **405** | 367 | application/json | `{"success":false,"code":"method_not_allowed"}` | **YES** |
| H3 | POST | `/api/health` | **405** | 363 | application/json | `{"success":false,"code":"method_not_allowed"}` | **YES** |
| H4 | POST | `/api/ready` | **405** | 193 | application/json | `{"success":false,"code":"method_not_allowed"}` | **YES** |
| H5 | POST | `/health` | **405** | 303 | application/json | `{"success":false,"code":"method_not_allowed"}` | **YES** |
| H6 | POST | `/ready` | **405** | 204 | application/json | `{"success":false,"code":"method_not_allowed"}` | **YES** |

## Not executed

| ID | Path | Reason |
|----|------|--------|
| W1 | POST `/api/webhooks/stripe` | **BLOCKED_UNSAFE_TO_PROBE_DUE_NON_MONEY_AUDIT_WRITE_RISK** |
| W2 | POST `/webhooks/stripe` | Same |

## Pass criteria check (H1–H6)

| Criterion | Result |
|-----------|--------|
| Deterministic fail-closed (405) | **YES** — all six |
| Controlled JSON non-success | **YES** |
| No 2xx mutation success | **YES** |
| No checkout/session/payment/provider ID | **YES** |
| No secret leakage | **YES** |
| No 5xx | **YES** |
| No timeout | **YES** |

---

*End.*
