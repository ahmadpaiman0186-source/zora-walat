# L-85M-R5-R2 — Bridge header forwarding review

**Gate UTC:** 2026-06-20  
**Source:** tracked source only

---

## Root bridge handler (`api/ops/db-readonly-proof.mjs`)

| Check | Finding |
|-------|---------|
| Header mutation in bridge | **NONE** — `req` passed directly to pre-bootstrap handler |
| Auth logic in bridge | **NONE** — delegated to `handleSlimDbReadonlyProofPrebootstrapGet` |
| URL rewrite | Only `req.url` rewritten to `/ops/db-readonly-proof` (+ query); restored in `finally` |
| Method gate | GET only; otherwise **405** |

## Comparison with `/ops/health` bridge (`api/ops/health.mjs`)

Same pattern: passes **`req` unchanged** to Express serverless handler except URL path rewrite.

## Vercel rewrite layer (`vercel.json`)

| Source | Destination |
|--------|-------------|
| `/ops/db-readonly-proof` | `/api/ops/db-readonly-proof` |

Rewrite is path-only; platform is expected to forward incoming request headers to the serverless function.

## Structural evidence (prior gates, not re-run here)

| Gate | Signal |
|------|--------|
| L-85M-R4 | Unauthenticated GET reached pre-bootstrap guard (`token_missing`, `prebootstrap_guard: true`) |
| L-85M-R5-R1 | `X-Matched-Path: /api/ops/db-readonly-proof` on authenticated attempts |

Unauthenticated R4 **`token_missing`** implies the handler received a request object and evaluated auth headers (empty). That is **consistent with header delivery to the function**, though it does not prove authenticated headers were forwarded with the same fidelity.

## Bridge stripping hypothesis

| Scenario | Expected if bridge stripped all auth headers |
|----------|---------------------------------------------|
| Authenticated request | Likely **`token_missing`** (401), not necessarily wrong-token path |
| R5-R1 filed status | **401** only — **`reason` not filed** |

**Assessment:** No tracked code strips `Authorization` or `X-ZW-Ops-Token`. **`BRIDGE_HEADER_FORWARDING_ISSUE_LIKELY` — LOW** based on source review plus R4 structural pickup. Cannot fully rule out platform-level forwarding edge case without safe allowlisted response `reason` from R5-R1 or a new authorized probe.

---

*End.*
