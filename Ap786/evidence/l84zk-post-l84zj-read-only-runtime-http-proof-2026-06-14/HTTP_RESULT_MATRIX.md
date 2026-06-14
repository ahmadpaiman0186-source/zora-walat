# L-84ZK — HTTP result matrix (redacted)

**Host:** `https://zora-walat-api-staging.vercel.app`
**Probe UTC:** `2026-06-14T18:31:51Z`
**Methods:** GET, HEAD only
**Verdict:** `CORE10-L84ZK-VERDICT-001: POST_L84ZJ_READ_ONLY_RUNTIME_HTTP_HEALTH_READY_PROOF_PASS_NO_POST_NO_PAYMENT_NO_PROVIDER_NO_MARKET_GLOBAL_LAUNCH_NO_GO`

| Method | Path | Status | Content-Type | curl_ms | Body preview (redacted, max 500) |
|--------|------|--------|--------------|---------|----------------------------------|
| GET | `/` | 200 | text/html | 623 | `<!DOCTYPE html>…` Next.js frontend HTML `[truncated]` |
| HEAD | `/` | 200 | text/html | 249 | `[HEAD_NO_BODY]` |
| GET | `/health` | 200 | application/json | 1059 | `{"status":"ok"}` |
| HEAD | `/health` | 200 | (empty) | 325 | `[HEAD_NO_BODY]` |
| GET | `/ready` | 200 | application/json | 1218 | `{"status":"ready","readinessReason":"database_ok","checkedAt":"2026-06-14T18:31:54.479Z","timeoutMs":5000}` |
| HEAD | `/ready` | 405 | application/json | 198 | `[HEAD_NO_BODY]` — GET-only readiness (L-84ZJ fail-closed) |
| GET | `/api/health` | 200 | application/json | 201 | `{"status":"ok"}` |
| HEAD | `/api/health` | 200 | (empty) | 211 | `[HEAD_NO_BODY]` |
| GET | `/api/ready` | 200 | application/json | 230 | `{"status":"ready","readinessReason":"database_ok","checkedAt":"2026-06-14T18:31:55.476Z","timeoutMs":5000}` |
| HEAD | `/api/ready` | 405 | application/json | 299 | `[HEAD_NO_BODY]` |
| GET | `/api/health-ready?route=health` | 200 | application/json | 265 | `{"status":"ok"}` |
| HEAD | `/api/health-ready?route=health` | 200 | (empty) | 204 | `[HEAD_NO_BODY]` |
| GET | `/api/health-ready?route=ready` | 200 | application/json | 212 | `{"status":"ready","readinessReason":"database_ok","checkedAt":"2026-06-14T18:31:56.617Z","timeoutMs":5000}` |
| HEAD | `/api/health-ready?route=ready` | 405 | application/json | 219 | `[HEAD_NO_BODY]` |
| GET | `/api/webhooks/stripe` | 405 | application/json | 888 | `{"success":false,"code":"method_not_allowed"}` |
| HEAD | `/api/webhooks/stripe` | 405 | application/json | 213 | `[HEAD_NO_BODY]` |

## Matrix notes

- All probes completed without timeout or TLS error.
- No secret-like substrings observed in body previews after redaction pass.
- Readiness JSON exposes only public fields (`status`, `readinessReason`, `checkedAt`, `timeoutMs`) — no env/connection strings.
- HEAD on `/ready` paths returns **405** by L-84ZJ design; **GET** is the authoritative readiness probe.

---

*End.*
