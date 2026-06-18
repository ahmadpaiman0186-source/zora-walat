# L-85X — L-85M 404 classification

**L-85M observed:** `http_status = 404`, `error_type = WebException`, no raw body retained.

---

## Classification (primary)

| Code | Applicability |
|------|---------------|
| **VERCEL_ENTRYPOINT_MISMATCH** | **PRIMARY** — staging project may run root Next.js entry, not `server/api/index.mjs` |
| **BUILD_TARGET_MISMATCH** | **PRIMARY** — git `main` deploy builds root; proof route lives under `server/` deploy graph |
| **ROUTE_NOT_EXPOSED_IN_RUNTIME** | **YES** — on root artifact, `/ops/db-readonly-proof` has no rewrite/bridge |

## Ruled out or secondary (tracked source)

| Code | Assessment |
|------|------------|
| **WRONG_PUBLIC_PATH** | **Unlikely** — `/ops/db-readonly-proof` is correct; `/api/ops/...` not in code |
| **SERVER_ROUTER_NOT_MOUNTED** | **Unlikely** when server graph loads — router is mounted |
| **FEATURE_FLAG_OR_PREBOOTSTRAP_BLOCKER** | **Unlikely for 404** — would be **401** missing/invalid token |
| **UNKNOWN_STATIC_AUDIT_INSUFFICIENT** | **NO** — root vs server mapping gap is determinable |

## Timeline reconciliation

| Gate | Observation |
|------|-------------|
| L-85Q | Unauthenticated structural **401** — consistent with `server/` CLI deploy (`api/index`) |
| L-85W | Git **`main`** deployment Ready after L-85V env add |
| L-85M | Authenticated **404** — consistent with root deploy swallowing `/ops/*` |

## Cause proven?

| Level | Verdict |
|-------|---------|
| Static root cause | **PROVEN** — missing root route mapping for `/ops/db-readonly-proof` |
| Active deployment artifact at L-85M instant | **INFERRED** (not live-probed in L-85X) — aligns with L-85W + L-85O Root Directory `.` |

---

*End.*
