# L-85M-R5-R3B — Function log availability

**Gate UTC:** 2026-06-20

---

## Question: Were function logs available for the R5-R3 failure window?

**NO** — insufficient retained log evidence retrieved via CLI for the inferred window.

| Check | Result |
|-------|--------|
| CLI authenticated | **YES** |
| Deployment metadata listed | **YES** |
| Request/runtime logs for `/ops/db-readonly-proof` in window | **NOT RETRIEVED** |
| HTTP **500** log entries in window | **NOT RETRIEVED** |
| Sanitized stack trace / error class in window | **NOT RETRIEVED** |

## Classification driver

**`R5_R3B_LOGS_UNAVAILABLE_OR_INSUFFICIENT`**

Possible causes (not proven): log retention window elapsed, CLI scope limits, request logs not exported for target function path, or runtime error surfaced only as platform `/500` page without durable function log line accessible to this gate.

---

*End.*
