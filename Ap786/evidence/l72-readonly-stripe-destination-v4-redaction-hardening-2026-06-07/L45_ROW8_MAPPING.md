# L-72 — L-45 row 8 mapping

**Date:** 2026-06-07
**Row:** **8 — Webhook / payment path only**

---

## Impact

| Field | L-71 | L-72 |
|-------|------|------|
| Destination redaction | PARTIAL (full URL exposed) | **PASS** (v4) |
| Event redaction | PASS (v3) | **Unchanged** (not L-72 scope) |
| Row 8 overall | IMPROVED PARTIAL | **IMPROVED PARTIAL** — destination redaction gap closed |
| Production webhook obs | NOT PROVEN | **NOT PROVEN** |
| PASS / FULLY_PROVEN | NO | **NO** |

Destination v4 improves row 8 evidence quality but does **not** upgrade to PASS or FULLY_PROVEN (sandbox/staging only).

---

*End of row 8 mapping.*
