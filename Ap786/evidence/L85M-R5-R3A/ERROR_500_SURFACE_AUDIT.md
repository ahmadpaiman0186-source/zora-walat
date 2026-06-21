# L-85M-R5-R3A — Error 500 surface audit

**Gate UTC:** 2026-06-20

---

## R5-R3 observed surface

| Field | Value |
|-------|--------|
| HTTP status | **500** |
| `Content-Type` | `text/html; charset=utf-8` |
| Body | HTML (not allowlisted JSON) |

## Tracked JSON error paths on proof route

| Path | Expected status | Shape |
|------|-----------------|-------|
| Pre-bootstrap blocked | 401 / 503 | JSON `prebootstrap_guard: true` |
| Express proof blocked | 401 / 503 | JSON `verdict: BLOCKED` |
| Express proof fail | 503 | JSON `verdict: FAIL` |
| Express proof pass | 200 | JSON `verdict: PASS` |
| Bridge method not GET | 405 | JSON |

## Unhandled exception path (static)

| File | Gap |
|------|-----|
| `api/ops/db-readonly-proof.mjs` | Handler `await`s pre-bootstrap + pass-through **without** surrounding try/catch |
| Pass-through | Imports `server/bootstrap.js`, builds Express app, invokes serverless handler — heavy graph |

Unhandled throw/rejection in pass-through plausibly maps to **Vercel 500 HTML** with **`X-Matched-Path: /500`**.

## Express global error handler

| File | `server/src/middleware/errorHandler.js` |
| Role | Catches Express-thrown errors **after** request enters Express |

Does **not** cover failures before Express responds or unhandled rejections in the Vercel wrapper outer shell.

---

*End.*
