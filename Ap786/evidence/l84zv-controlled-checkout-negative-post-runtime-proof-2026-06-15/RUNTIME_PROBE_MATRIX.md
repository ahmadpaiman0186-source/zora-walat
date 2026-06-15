# L-84ZV — Runtime probe matrix

**Probe UTC:** **2026-06-15T20:53:12Z**  
**Base URL:** `https://zora-walat-api-staging.vercel.app`  
**Method:** `curl.exe` POST, `--max-time 20`  
**Verdict:** `CORE10-L84ZV-VERDICT-002` (PARTIAL — API handler not reached)

---

## C1 — No Bearer, empty JSON body

| Field | Value |
|-------|-------|
| Request | POST `/api/create-checkout-session` |
| Headers | `Content-Type: application/json` |
| Body | `{}` |
| HTTP status | **404** |
| Content | Next.js HTML — title `404: This page could not be found.` |
| Expected (L-84ZU code) | **401** JSON `auth_required` from API handler |
| Pass rule met? | **NO** — 404 HTML ≠ API fail-closed checkout boundary |
| Forbidden artifacts | **None** |

---

## C2 — Invalid Bearer, empty JSON body

| Field | Value |
|-------|-------|
| Request | POST `/api/create-checkout-session` |
| Headers | `Content-Type: application/json`, `Authorization: Bearer INVALID_L84ZV_TOKEN` |
| Body | `{}` |
| HTTP status | **404** |
| Content | Next.js HTML 404 shell |
| Expected (L-84ZU code) | **401** JSON `auth_required` (invalid JWT) |
| Pass rule met? | **NO** |
| Forbidden artifacts | **None** |

---

## C3 — No Bearer, malformed checkout body

| Field | Value |
|-------|-------|
| Request | POST `/api/create-checkout-session` |
| Headers | `Content-Type: application/json` |
| Body | `{"bad":"payload"}` |
| HTTP status | **404** |
| Content | Next.js HTML 404 shell |
| Expected (L-84ZU code) | **401** (no bearer at index) or **400** validation if bearer present |
| Pass rule met? | **NO** |
| Forbidden artifacts | **None** |

---

## C4 — No Bearer, non-JSON content-type

| Field | Value |
|-------|-------|
| Request | POST `/api/create-checkout-session` |
| Headers | `Content-Type: text/plain` |
| Body | `not-json` |
| HTTP status | **404** |
| Content | Next.js HTML 404 shell |
| Expected (L-84ZU code) | **401** at index (no bearer) or **415** at handler |
| Pass rule met? | **NO** |
| Forbidden artifacts | **None** |

---

## Aggregate pass/fail vs gate rules

| Rule | C1 | C2 | C3 | C4 | All |
|------|----|----|----|----|-----|
| 4xx (not 2xx/5xx) | 404 | 404 | 404 | 404 | **YES** |
| Controlled API fail-closed JSON | **NO** | **NO** | **NO** | **NO** | **NO** |
| No timeout | **YES** | **YES** | **YES** | **YES** | **YES** |
| No forbidden payment/provider IDs | **YES** | **YES** | **YES** | **YES** | **YES** |
| Checkout mutation boundary **proven** | **NO** | **NO** | **NO** | **NO** | **NO** |

**Verdict:** PARTIAL — probes executed; API checkout handler not exercised; cannot issue VERDICT-001 PASS.

---

## Raw operator output (sanitized summary)

```text
PROBE_UTC=2026-06-15T20:53:12Z
C1 status=404 body=<Next.js HTML 404 page>
C2 status=404 body=<Next.js HTML 404 page>
C3 status=404 body=<Next.js HTML 404 page>
C4 status=404 body=<Next.js HTML 404 page>
```

---

*End.*
