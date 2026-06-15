# L-84ZX — Read-only route checks

**Probe UTC:** **2026-06-15T21:53:25Z**  
**Base URL:** `https://zora-walat-api-staging.vercel.app`  
**Methods:** GET, HEAD only — **NO POST**

## Results

| Method | Path | Status | Content-Type | Body preview (≤300 chars) |
|--------|------|--------|--------------|---------------------------|
| GET | `/health` | **200** | (JSON inferred) | `{"status":"ok"}` |
| GET | `/ready` | **200** | (JSON inferred) | `{"status":"ready","readinessReason":"database_ok",…}` |
| GET | `/api/create-checkout-session` | **405** | (JSON inferred) | `{"success":false,"code":"method_not_allowed"}` |
| HEAD | `/api/create-checkout-session` | **405** | `application/json; charset=utf-8` | (no body) |
| GET | `/create-checkout-session` | **405** | (JSON inferred) | `{"success":false,"code":"method_not_allowed"}` |
| HEAD | `/create-checkout-session` | **405** | `application/json; charset=utf-8` | (no body) |

## Interpretation (supplementary only)

| Observation | Meaning |
|-------------|---------|
| Checkout paths return **405 JSON** | L-84ZW bridge reachable — **not** Next.js 404 HTML (contrast L-84ZV) |
| POST not executed | Fail-closed **401** behavior **NOT CLAIMED** |
| No forbidden artifacts | No `cs_`, `pi_`, `client_secret`, payment IDs in responses |

Route checks support **readiness** narrative; deployment SHA binding proven separately in [DEPLOYMENT_BINDING_MATRIX.md](./DEPLOYMENT_BINDING_MATRIX.md).

---

*End.*
