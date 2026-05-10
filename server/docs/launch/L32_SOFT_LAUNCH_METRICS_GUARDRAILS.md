# L32 — Soft launch metrics and guardrails

**Purpose:** What to watch during C0–C3 and when to **stop** or **rollback**. Thresholds are **initial** — baseline after 7 days of traffic.

---

## Success metrics (soft launch)

| Metric | Target (initial) | Notes |
|--------|------------------|--------|
| Checkout success rate | ≥ baseline − 2σ | Define baseline in staging |
| Fulfillment terminal success | ≥ 99% excl. invalid MSISDN | Provider-dependent |
| p95 checkout latency | Within SLO doc | When L36 exists |
| Support tickets / 100 tx | Below agreed cap | Product sets |

---

## Health metrics

| Metric | Source | Stop threshold (initial) |
|--------|--------|--------------------------|
| `/health` fail rate | Synthetic | >2 consecutive fails |
| `/ready` auth fail | Synthetic | Any unexpected 503 |
| API 5xx rate | Logs/metrics | >1% 15m rolling |

---

## Payment metrics

| Metric | Stop threshold |
|--------|----------------|
| Stripe webhook 5xx / delivery failure spike | > N / 10m (set N from baseline) |
| Invalid signature rate | >3× baseline |
| Duplicate / replay log spike | Investigate immediately; pause cohort widen |

---

## Fulfillment metrics

| Metric | Stop threshold |
|--------|----------------|
| Queue depth | > agreed cap |
| SLA breach counter | Any sustained increase |
| Provider circuit open | Pause new cohort |

---

## Support metrics

| Metric | Stop threshold |
|--------|----------------|
| “Paid not delivered” tickets | > X / hour |
| Refund requests / disputes | > baseline × 3 |

---

## Fraud / security metrics

| Metric | Stop threshold |
|--------|----------------|
| Velocity blocks | Sudden drop may mean attack **or** misconfig |
| Auth failure storm | Credential stuffing pattern |
| Geo block events | Review for mis-launch geography |

---

## Alert thresholds

- Wire to L29 when available; until then **manual** log review each hour of launch window.

---

## Error budget / burn-rate (L29 / L36 handoff)

- Document monthly budget in L29/L36 docs when merged.
- **Burn-rate:** if 2% monthly budget consumed in 1 hour → **stop** cohort expansion and incident review.

---

## Stop-launch thresholds (hard)

- Any **P0** ledger/recon alert
- Mass checkout failure (>50% 5 min)
- Confirmed wrong Stripe mode (test keys on live surface or inverse)

---

## Observation windows

| Cohort | Minimum observation |
|--------|---------------------|
| C1 | 24h clean or explicit waiver |
| C2 | 48–72h |
| C3 | 1 week+ |

---

## References

- `SLO.md`, `PHASE1_OPERATOR_METRICS.md`, `SOFT_LAUNCH` / admin summary in `DEPLOYMENT_READINESS.md`
