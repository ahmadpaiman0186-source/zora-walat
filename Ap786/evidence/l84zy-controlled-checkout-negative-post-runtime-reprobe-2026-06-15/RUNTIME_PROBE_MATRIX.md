# L-84ZY — Runtime probe matrix

**Probe UTC:** **2026-06-15T22:28:00Z**  
**Base URL:** `https://zora-walat-api-staging.vercel.app`  
**Endpoint:** POST `/api/create-checkout-session`  
**Method:** `curl.exe`, `--max-time 20`  
**Verdict:** **PASS** (VERDICT-001)

---

## C1 — No Bearer, empty JSON `{}`

| Field | Value |
|-------|-------|
| Headers | `Content-Type: application/json` |
| Body | `{}` |
| HTTP status | **401** |
| Response body | `{"success":false,"message":"Authentication required","error":"Authentication required","code":"auth_required"}` |
| Content type | JSON (API) |
| Pass | **YES** — 4xx fail-closed, no artifacts |

---

## C2 — Invalid Bearer, empty JSON `{}`

| Field | Value |
|-------|-------|
| Headers | `Content-Type: application/json`, `Authorization: Bearer invalid-negative-proof-token` |
| Body | `{}` |
| HTTP status | **401** |
| Response body | Same as C1 — `auth_required` |
| Pass | **YES** |

---

## C3 — No Bearer, malformed checkout body

| Field | Value |
|-------|-------|
| Headers | `Content-Type: application/json` |
| Body | `{"bad":"payload"}` |
| HTTP status | **401** |
| Response body | Same as C1 — `auth_required` |
| Note | Initial PowerShell JSON escape caused curl warning; **re-run confirmed 401** |
| Pass | **YES** |

---

## C4 — No Bearer, non-JSON body

| Field | Value |
|-------|-------|
| Headers | `Content-Type: text/plain` |
| Body | `bad-payload` |
| HTTP status | **401** |
| Response body | Same as C1 — `auth_required` |
| Pass | **YES** — bridge returns 401 before handler 415 (no Bearer at index gate) |

---

## Aggregate vs gate rules

| Rule | C1 | C2 | C3 | C4 | All |
|------|----|----|----|----|-----|
| Controlled 4xx API JSON | **401** | **401** | **401** | **401** | **YES** |
| Not 404 HTML | **YES** | **YES** | **YES** | **YES** | **YES** |
| No 2xx | **YES** | **YES** | **YES** | **YES** | **YES** |
| No 5xx | **YES** | **YES** | **YES** | **YES** | **YES** |
| No timeout | **YES** | **YES** | **YES** | **YES** | **YES** |
| Forbidden payment/provider IDs | **YES** | **YES** | **YES** | **YES** | **YES** |
| Exactly C1–C4 only | — | — | — | — | **YES** |

---

*End.*
