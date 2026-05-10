# L36 — Burn-rate alerting policy (future wiring)

**Status:** **Policy and placeholder queries only.** **Do not** wire PagerDuty, Slack, Sentry, or Datadog from this file without **operator approval** and L29 ADR.

---

## Burn-rate alert concepts

- **Multi-window:** compare short-window error rate to long-window SLO expectation.  
- **Fast burn** → page; **slow burn** → ticket + review per [`L36_ERROR_BUDGET_POLICY.md`](./L36_ERROR_BUDGET_POLICY.md).

---

## Required future alert sources (when available)

| Source | Use |
|--------|-----|
| Log vendor | JSON fields from L29 query spec when merged |
| Prometheus | `/metrics` histograms per `SLO.md` |
| Stripe Dashboard | Webhook delivery failure rate |
| Synthetic vendor | `/health`, `/ready` |

---

## Health / readiness rules (pseudo-query placeholders)

```
# Example placeholder — replace with vendor syntax
count(http_status >= 500 AND path != "/webhooks/stripe") 
  / count(all requests) 
  over 1h > threshold
```

```
synthetic_ready_failures(1h) > 0 AND NOT maintenance_window
```

---

## Webhook alert rules (placeholders)

```
count(status_code == 503 AND path == "/webhooks/stripe") over 10m > N
```

```
count(log: webhook_transaction_failed OR moneyPathAlert) over 10m 
  # Note: HTTP 200 may still log failure — do not use status_code == 200 alone
```

---

## Fulfillment / provider rules (placeholders)

```
rate(fulfillment_failed) over 15m > baseline * K
```

```
reloadly_circuit_open == true for 5m
```

---

## Ledger / reconciliation rules (placeholders)

```
count(critical: missing_ledger OR reconciliation_required) > 0 sustained 15m
```

---

## Support / security rules (placeholders)

```
support_ticket_rate(money_category) over 1h > X
```

```
count(securityEvent IN {fraud_risk_block, stripe_webhook_signature_invalid}) spike
```

---

## Vendor integration (future only)

- **PagerDuty / Opsgenie:** receive webhook from log vendor or Grafana.  
- **Slack:** #incidents channel; no secret URLs in git.  
- **Sentry:** error spikes — **complement** not replace logs.  
- **Datadog:** monitors from L29 panels when merged.

---

## Silence policy

- Named incident id, owner, **expiry** ≤ 7 days  
- **Forbidden:** silence on ledger P0 without finance

---

## Suppression policy

- Maintenance windows in vendor UI; document in change calendar

---

## False positive review

- Weekly 30-min triage of top noisy alerts; tune thresholds

---

## Evidence requirements

- Monitor definition export (redacted) + link to incident

---

## NO-GO

- Wiring alerts **without** L35 env inventory row  
- Paging on **first** night post-deploy without baseline  
- **Personal** Slack DM as only route

---

## References

- [`L36_ERROR_BUDGET_POLICY.md`](./L36_ERROR_BUDGET_POLICY.md), L29 docs when on branch
