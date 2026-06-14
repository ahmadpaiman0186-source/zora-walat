# L-84ZO — Read-only GET/HEAD matrix (staging)

**Host:** `https://zora-walat-api-staging.vercel.app`
**Probe UTC:** 2026-06-14T20:02:12Z (batch) · sample bodies 2026-06-14T20:04:15Z
**Verdict:** Read-only checks **PASS** for GET fail-closed webhook + health JSON; some **HEAD** probes slow/timeout on body read — status codes captured where curl completed.

| Method | Path | Status | ms | Content-Type | Body preview (max 300) |
|--------|------|--------|-----|--------------|------------------------|
| GET | `/` | 200 | 523 | text/html | (HTML — frontend) |
| GET | `/health` | 200 | 1061 | application/json | `{"status":"ok"}` |
| HEAD | `/health` | 200* | 30013 | — | *curl timeout on body; HTTP 200 indicated |
| GET | `/ready` | 200 | 1261 | application/json | (JSON readiness) |
| HEAD | `/ready` | 405 | 30008 | application/json | L-84ZJ design |
| GET | `/api/health` | 200 | 233 | application/json | `{"status":"ok"}` |
| HEAD | `/api/health` | 200* | 30011 | — | *timeout on body read |
| GET | `/api/ready` | 200 | 222 | application/json | (JSON readiness) |
| HEAD | `/api/ready` | 405 | 30014 | application/json | L-84ZJ design |
| GET | `/api/webhooks/stripe` | 405 | 957 | application/json | `{"success":false,"code":"method_not_allowed"}` |
| HEAD | `/api/webhooks/stripe` | 405 | 30001 | application/json | fail-closed |
| GET | `/webhooks/stripe` | 405 | 214 | application/json | `{"success":false,"code":"method_not_allowed"}` |
| HEAD | `/webhooks/stripe` | 405 | 15003 | application/json | fail-closed |

**Headers observed:** `X-Matched-Path: /api/health-ready` (health), `/api/webhooks/stripe` (webhook); `Server: Vercel`; no secrets or payment IDs in sampled bodies.

**No POST executed.**

---

*End.*
