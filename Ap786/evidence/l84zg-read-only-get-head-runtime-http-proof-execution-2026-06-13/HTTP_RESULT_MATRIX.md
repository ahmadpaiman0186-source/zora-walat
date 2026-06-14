# L-84ZG — HTTP result matrix

**Host:** `https://zora-walat-api-staging.vercel.app`  
**Probe UTC:** `2026-06-14T00:30:26Z`  
**Verdict:** `CORE10-L84ZG-VERDICT-001` — **PARTIAL**

| # | Method | Path | Status | Time (ms) | Redacted body preview | Non-mutating | API layer? | Notes |
|---|--------|------|--------|----------:|----------------------|--------------|------------|-------|
| 1 | GET | `/` | **200** | 148 | `<!DOCTYPE html>…Next.js shell…[truncated]` | **YES** | **Ambiguous** | Frontend HTML, not API JSON liveness |
| 2 | HEAD | `/` | **200** | 134 | `[HEAD_NO_BODY]` | **YES** | **Ambiguous** | |
| 3 | GET | `/api` | **404** | 128 | `<!DOCTYPE html>…Next.js 404…[truncated]` | **YES** | **NO** | Frontend 404 page |
| 4 | HEAD | `/api` | **404** | 120 | `[HEAD_NO_BODY]` | **YES** | **NO** | |
| 5 | GET | `/health` | **404** | 126 | `<!DOCTYPE html>…Next.js 404…[truncated]` | **YES** | **NO** | Expected API `{status:ok}` not observed |
| 6 | HEAD | `/health` | **404** | 120 | `[HEAD_NO_BODY]` | **YES** | **NO** | |
| 7 | GET | `/api/health` | **404** | 130 | `<!DOCTYPE html>…Next.js 404…[truncated]` | **YES** | **NO** | |
| 8 | HEAD | `/api/health` | **404** | 125 | `[HEAD_NO_BODY]` | **YES** | **NO** | |
| 9 | GET | `/ready` | **404** | 129 | `<!DOCTYPE html>…Next.js 404…[truncated]` | **YES** | **NO** | Readiness JSON not observed |
| 10 | HEAD | `/ready` | **404** | 116 | `[HEAD_NO_BODY]` | **YES** | **NO** | |
| 11 | GET | `/api/ready` | **404** | 122 | `<!DOCTYPE html>…Next.js 404…[truncated]` | **YES** | **NO** | |
| 12 | HEAD | `/api/ready` | **404** | 120 | `[HEAD_NO_BODY]` | **YES** | **NO** | |
| 13 | GET | `/api/ready/env` | **404** | 123 | `<!DOCTYPE html>…Next.js 404…[truncated]` | **YES** | **NO** | |
| 14 | HEAD | `/api/ready/env` | **404** | 114 | `[HEAD_NO_BODY]` | **YES** | **NO** | |
| 15 | GET | `/api/checkout/return` | **404** | 150 | `<!DOCTYPE html>…Next.js 404…[truncated]` | **YES** | **NO** | |
| 16 | HEAD | `/api/checkout/return` | **404** | 135 | `[HEAD_NO_BODY]` | **YES** | **NO** | |
| 17 | GET | `/api/checkout/cancel` | **404** | 123 | `<!DOCTYPE html>…Next.js 404…[truncated]` | **YES** | **NO** | |
| 18 | HEAD | `/api/checkout/cancel` | **404** | 173 | `[HEAD_NO_BODY]` | **YES** | **NO** | |
| 19 | GET | `/api/webhooks/stripe` | **405** | 230 | `{"success":false,"code":"method_not_allowed"}` | **YES** | **YES** | POST-only route; GET fail-closed |
| 20 | HEAD | `/api/webhooks/stripe` | **405** | 208 | `[HEAD_NO_BODY]` | **YES** | **YES** | |

## Blocker scan

| Blocker type | Observed |
|--------------|----------|
| DNS failure | **NO** |
| TLS failure | **NO** |
| Timeout (>30s) | **NO** |
| **5xx** | **NO** |
| Vercel function crash (502/503 FUNCTION_INVOCATION) | **NO** |

---

*End.*
