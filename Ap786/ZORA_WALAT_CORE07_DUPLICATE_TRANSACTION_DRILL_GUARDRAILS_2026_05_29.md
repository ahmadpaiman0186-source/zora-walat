# CORE-07 Duplicate Transaction Drill Guardrails

**Date:** 2026-05-29  
**Aligns with:** CORE-05 idempotency kernel, INV-01  
**Drill status:** **NOT EXECUTED**

---

## 1. Principles

| # | Rule |
|---|------|
| 1 | **One** provider attempt per approved drill session |
| 2 | **Idempotency key must be recorded** in evidence (CORE7-EV-010) |
| 3 | **No second attempt** without explicit duplicate-safety evidence + new approval |
| 4 | **No retry** after ambiguous provider response without manual approval |
| 5 | **Duplicate provider reference** must **not** be accepted as healthy |

---

## 2. Pre-attempt requirements

| Item | Requirement |
|------|-------------|
| Canonical key | Built per CORE-05 `buildProviderAttemptKey` or documented equivalent |
| Registry | Prior attempt outcome checked (sandbox registry / DB row / log) |
| Classify | CORE-05 `classifyIdempotencyAttempt` → must not be `BLOCK_DUPLICATE` / `RETRY_UNSAFE` without review |

---

## 3. During drill

| Event | Action |
|-------|--------|
| HTTP 409 / duplicate at provider | **Stop** — file CORE7-EV-010, do not retry |
| Same `customIdentifier` reused | **Stop** — duplicate risk |
| Webhook replay detected | **Stop** — no broad replay |
| Second operator clicks “retry” | **Forbidden** without new approval phrase |

---

## 4. Post-attempt

| Check | Evidence |
|-------|----------|
| Single attempt count | Logs show **1** dispatch |
| Reference uniqueness | CORE7-EV-016 not colliding with prior orders |
| CORE-05 decision archived | Redacted JSON in evidence pack |

---

## 5. Integration with stop conditions

Duplicate / idempotency issues trigger **immediate abort** per [Abort conditions](./ZORA_WALAT_CORE07_ABORT_ROLLBACK_AND_STOP_CONDITIONS_2026_05_29.md):

- Duplicate idempotency key conflict  
- Repeated attempt risk  

---

## 6. Conservative verdict

Live duplicate prevention **NOT VERIFIED**. Drill guardrails **FILED ONLY**. Sandbox drill **NOT EXECUTED**. Production / real-money / pilot / launch **NO-GO**.

---

*End of duplicate drill guardrails.*
