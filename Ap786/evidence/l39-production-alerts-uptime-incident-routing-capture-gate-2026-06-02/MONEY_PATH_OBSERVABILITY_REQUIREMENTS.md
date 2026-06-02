# L-39 — Money-path observability requirements

**Date:** 2026-06-02

---

## OBS-MONEY-PATH-001

| Field | Requirement |
|-------|-------------|
| **Scope** | Production **money-path** observability — dashboard or log category |
| **Minimum visible** | Webhook success/fail counts, unpaid gate denials, duplicate-prevention counters, or checkout funnel error enum |
| **Production only** | Stripe **live** or prod-labeled panels — **not** sandbox dashboard |
| **Redact** | Full payment IDs, raw Stripe objects, `whsec_*`, customer PII |
| **Filename** | `OBS-MONEY-PATH-001-2026-06-02-redacted.png` |

---

## Pass when (future intake)

- Panel clearly production; enums only for sensitive fields; correlates to money-path SLO discussion.

---

## Does not prove

- Real-money readiness.
- NPNS or idempotency enforcement in production.

*L-39 does not prove money-path observability.*
