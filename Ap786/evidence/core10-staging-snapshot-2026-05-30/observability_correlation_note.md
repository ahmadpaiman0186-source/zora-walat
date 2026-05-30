# CORE10-L6-OBSERVABILITY-001 — Correlation note (read-only)

**Date:** 2026-05-30  
**Scope:** Read-only correlation from capture session — **no** log pull with secrets  

## Correlation summary

| Link | Status | Evidence |
|------|--------|----------|
| Staging host → `/api/health` | **INCONCLUSIVE** | HTTP 404 HTML (frontend routing) — not API JSON liveness |
| Operator token → order status | **BLOCKED** | `TOKEN_EXPIRED` — no order row exported |
| Health probe ↔ status-check | **PARTIAL** | Same staging host family; API path not proven reachable |
| Webhook ↔ order | **PENDING** | No webhook events in snapshot (empty export) |
| Payment ↔ fulfillment | **PENDING** | No order records exported |

**Overall:** **INCONCLUSIVE** — insufficient read-only data for PASS. Does **not** verify production observability.
