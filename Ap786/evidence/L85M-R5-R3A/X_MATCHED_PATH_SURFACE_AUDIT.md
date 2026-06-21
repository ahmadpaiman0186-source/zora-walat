# L-85M-R5-R3A — X-Matched-Path surface audit

**Gate UTC:** 2026-06-20

---

## What `X-Matched-Path` indicates (metadata interpretation)

Vercel response header naming the **matched serverless route** for the invocation.

## Prior observations

| Gate | HTTP | `X-Matched-Path` | Interpretation |
|------|------|------------------|----------------|
| L-85M-R4 / R5-R1 | 401 | `/api/ops/db-readonly-proof` | Proof API function invoked; JSON auth block |
| L-85M-R5-R3 | 500 | **`/500`** | Platform error surface — not proof JSON contract |

## Static conclusion

`X-Matched-Path: /500` on R5-R3 is **inconsistent with successful proof-handler JSON emission** and **inconsistent with R5-R1 proof-route match**. It aligns with **Vercel platform internal error routing** after an unhandled serverless failure, not with a static rewrite miss to an unknown path (rewrite and handler files are present).

## Which file emits `X-Matched-Path`?

**Not application code** — Vercel platform header (no matches in tracked application sources for setter).

---

*End.*
