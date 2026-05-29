# L29 — SLO and error budget (formal draft)

**Status:** Formalizes and extends `docs/runbooks/SLO.md`. **Not** contractually binding until leadership approval and monitors are wired.

---

## Objectives (monthly)

| SLO | Target | Measurement window |
|-----|--------|-------------------|
| **API availability** | 99.9% | Calendar month |
| **GET /health** | 99.9% | Synthetic 1-min checks |
| **GET /ready** (authenticated) | 99.5% | Synthetic 1–5 min |
| **Stripe webhook ACK latency** | p95 < **2s** | Log-derived duration `webhook_http_received` → response (or platform trace) |
| **Stripe webhook delivery success** (Stripe-side) | 99%+ | Stripe Dashboard deliveries (complements app logs) |
| **Fulfillment scheduling latency** (paid → queued/processing) | p95 < **60s** in queue mode | Logs + DB timestamps |
| **Provider fulfillment success** | ≥ **99%** terminal success (excl. customer-invalid MSISDN) | Fulfillment terminal metrics |
| **Ledger / reconciliation correctness** | **Zero** unacked `missing_ledger` critical alerts > 15 min | `moneyPathAlert` + recon status |
| **Security / fraud critical response** | Human ack **< 30 min** for `fraud_risk_block` | On-call process |

---

## Error budget (monthly)

- **Availability budget** = (1 − SLO) × minutes/month (e.g. 99.9% → ~43 min downtime budget).
- **Burn rate:** consume budget proportionally to incident length and severity.
- **Burn-rate alerts (recommended):**
  - **2% budget in 1 hour** → page (fast burn)
  - **10% budget in 6 hours** → page (slow burn sustained)

---

## Launch-blocking violations

Treat as **stop-ship** or **immediate rollback** candidates:

- Sustained `/health` or authenticated `/ready` failure during canary.
- `missing_ledger` or `duplicate_payment_captured_ledger` critical alerts in production during launch window.
- Mass Stripe webhook **5xx** or **503** (post-PR5 dispute path) with no mitigation.
- Redis aggregation disabled while multi-instance + Prometheus enabled (misleading metrics) — see `criticalConfigValidation.js`.

---

## Exclusions (prelaunch / maintenance)

- **Planned maintenance:** documented windows excluded from availability SLO if vendor supports maintenance mode.
- **PRELAUNCH_LOCKDOWN:** public `/ready` without token may 503 by design — measure only **token-authenticated** synthetics.
- **Sandbox / test traffic:** exclude by `VERCEL_ENV` / hostname filter in dashboards.
- **Single-customer abuse:** may exceed rate SLO — track separately under security.

---

## Webhook-specific budget

- **Do not** use HTTP 200 ratio as sole success metric (see `L29_DASHBOARD_LOG_QUERIES.md`).
- Allocate separate budget for:
  - **Signature invalid** (often abuse) — security dashboard
  - **Handler failure logged with 200** — **must** burn application reliability budget via structured log detection

---

## Review cadence

- **Weekly:** error budget report in ops channel.
- **Monthly:** SLO review; adjust thresholds using last 4 weeks baseline.

---

## References

- Draft concepts: `../runbooks/SLO.md`
- Alert routing: `L29_ALERT_ROUTING_ADR.md`
