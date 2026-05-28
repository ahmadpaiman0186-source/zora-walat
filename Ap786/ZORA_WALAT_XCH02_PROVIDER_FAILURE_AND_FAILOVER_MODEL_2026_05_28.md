# XCH-02 Provider Failure And Failover Model

**Date:** 2026-05-28
**Status:** **DESIGN ONLY / FAIL-CLOSED DEFAULT**

---

## 1. Provider outage states

| State | Meaning | Customer impact |
|-------|---------|-----------------|
| `healthy` | Normal operation | None |
| `degraded` | Elevated latency/errors | Quotes may be unavailable |
| `unavailable` | Cannot reach provider | **Block new operations** |
| `maintenance` | Planned outage | **Block new operations** |

---

## 2. Degraded mode

| Capability | Degraded behavior |
|------------|-------------------|
| FX quote | May return `unavailable` — no stale quote |
| Payout submit | **Blocked** if partner degraded |
| KYC | **Block new sends** if verification unavailable |
| Sanctions | **Fail closed** — unavailable = hard stop |

---

## 3. Fail-closed behavior

| Rule | Status |
|------|--------|
| When in doubt, block | **REQUIRED** |
| No best-effort payout on timeout | **REQUIRED** |
| No default provider guess | **REQUIRED** |

---

## 4. Retry policy boundaries

| Operation | Retries | Backoff | Idempotent |
|-----------|---------|---------|------------|
| FX quote read | 2 | Exponential | **YES** |
| Payout submit | **0** after timeout without status | — | Use poll |
| Payout status poll | 5 | Capped | **YES** |
| Sanctions screen | 2 | Short | **YES** |

Never retry payout **submit** with new idempotency key for same transaction.

---

## 5. Circuit breaker expectations

| Parameter | Proposed |
|-----------|----------|
| Failure threshold | 5 failures / 60s window |
| Open duration | 120s |
| Half-open probe | Single request |

Circuit state exposed to ops dashboard (future).

---

## 6. Failover rules

| Rule | Status |
|------|--------|
| Automatic provider switch | **FORBIDDEN** without explicit gate |
| Manual failover | Compliance + engineering approval |
| Dual-write to two providers | **FORBIDDEN** |

---

## 7. Self-healing and auto-repair

| Mode | Status |
|------|--------|
| Auto-detection of provider drift | Future design only |
| Auto-repair (autonomous money correction) | **DISABLED** |
| Self-healing apply | **NOT ENABLED** without approval |

---

## 8. Operator escalation model

| Severity | Trigger | Escalation |
|----------|---------|------------|
| SEV-2 | Provider degraded > 15m | Ops on-call |
| SEV-1 | Sanctions unavailable | Compliance + ops |
| SEV-1 | Payout stuck > SLA | Ops + partner liaison |

---

*XCH-02 failure model — fail-closed; no auto-repair*
