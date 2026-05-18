# L33 — Metrics, thresholds, and evidence

**Purpose:** Default **staging** targets and evidence shape. Tune with baseline after first runs.

---

## Latency targets (staging — illustrative)

| Path | p50 | p95 | p99 |
|------|-----|-----|-----|
| `GET /health` | <50ms | <200ms | <500ms |
| `GET /ready` | <200ms | <2s | <5s |
| Authenticated API reads | <100ms | <500ms | <1.5s |
| Checkout create (test) | <300ms | <1s | <3s |

---

## Error-rate thresholds

| Metric | Warn | Abort drill |
|--------|------|-------------|
| HTTP 5xx | >0.5% 5m | >2% 5m |
| Webhook handler 5xx (staging) | >1% | >5% |

---

## Timeout thresholds

| Layer | Threshold |
|-------|-----------|
| Serverless | Below platform max; p99 handler + 20% headroom |
| Prisma query | Investigate > 2s sustained |
| Reloadly client | Align with provider SLA (sandbox) |

---

## Webhook ACK thresholds

- p95 ACK: **< 2s** staging goal (align with L29 SLO package when on branch).
- **Never** measure with unsigned traffic.

---

## DB / Redis / queue

| Signal | Threshold |
|--------|-----------|
| DB connections near max | Warn at 80%; abort load |
| Redis command latency | p99 > 50ms — investigate |
| Queue depth | > N jobs (define per env) — stop ramp |

---

## Provider latency

- Sandbox p95 fulfillment call: record baseline; **abort** if > 3× baseline without code deploy.

---

## Saturation indicators

- CPU sustained >85% on DB
- Connection wait time growth
- Growing 503 from platform

---

## Alert handoff to L29

- When L29 docs merged: map above to log-based monitors and synthetics.
- Until then: **manual** dashboard review during drills.

---

## SLO handoff to L36

- Formal monthly budget and burn-rate: L36 doc when available.
- L33 supplies **staging** proof points as inputs.

---

## Evidence template (per run)

```
L33_RUN: <id>
ENV: local | ci | staging
BRANCH/COMMIT: <sha>
TRAFFIC: <tool> <RPS> <duration>
RESULT: PASS | FAIL | ABORTED
p50/p95/p99: <values>
ERROR_RATE: < %>
NOTES: <no secrets>
ARTIFACTS: <link internal>
```

---

## Redaction rules

- No `DATABASE_URL`, JWT, `whsec_`, `sk_live_`.
- Truncate IPs if policy requires.

---

## References

- [`../runbooks/SLO.md`](../runbooks/SLO.md), [`L33_TEST_EXECUTION_SAFETY_CHECKLIST.md`](./L33_TEST_EXECUTION_SAFETY_CHECKLIST.md)
