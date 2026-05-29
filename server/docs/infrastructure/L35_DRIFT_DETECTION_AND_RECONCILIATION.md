# L35 — Drift detection and reconciliation

**Drift definition:** Any **unauthorized** or **undocumented** difference between **inventory** ([`L35_ENVIRONMENT_INVENTORY_SCHEMA.md`](./L35_ENVIRONMENT_INVENTORY_SCHEMA.md)) and **actual** runtime configuration.

---

## Sources of drift

| Source | Example drift |
|--------|----------------|
| **Vercel env** | Missing var, wrong preview inheritance |
| **Vercel project settings** | Wrong Node version, build command |
| **Neon** | New branch not inventoried; IP allowlist change |
| **DNS** | Orphan record pointing to old deploy |
| **Stripe webhooks** | Endpoint URL stale after API rename |
| **Reloadly** | Callback URL or IP allowlist mismatch |
| **GitHub Actions secrets** | Accidental prod-like key in fork |
| **Redis** | Memory policy change affecting queues |
| **Log drains** | Broken pipeline silent |

---

## Read-only drift check procedure (plan)

1. Export **names** of Vercel env keys (CLI/UI) — **not** values in tickets.
2. Compare to matrix required set.
3. Neon: confirm project id matches inventory.
4. Stripe: webhook endpoint id + URL host.
5. DNS: `dig` / provider UI diff vs diagram.
6. Record in diff template below.

---

## Diff / evidence format

```
DRIFT_ID: DRIFT-YYYY-MM-DD-##
ENV: staging | production
FIELD: e.g. STRIPE_WEBHOOK_SECRET presence
EXPECTED: present
ACTUAL: missing
SEVERITY: P0|P1|P2
OWNER: ...
```

---

## Severity levels

| Level | Meaning |
|-------|---------|
| **P0** | Money-path or auth broken / wrong mode |
| **P1** | Degraded reliability |
| **P2** | Cosmetic / non-prod |

---

## Reconciliation workflow

1. Open change ticket
2. **Read-only** confirm drift
3. Fix in vendor UI with dual control if P0
4. Re-verify inventory row → `PASS`
5. Attach evidence

---

## Approval requirements

- **P0 production:** Eng lead + Finance (if Stripe) + Infra
- **P1:** Eng lead

---

## Rollback if reconciliation fails

- Revert Vercel deployment; restore previous Neon password **window** if rotation half-done

---

## Audit trail

- Ticket id, approver names, timestamps — no secrets in PDF exports

---

## Cadence

- **Monthly** inventory review; **after** every production incident touching env

---

## Launch-blocking drift classes

- Production `STRIPE_SECRET_KEY` mode wrong for `NODE_ENV`
- `DATABASE_URL` points to non-prod from prod project
- Webhook secret missing
- `RELOADLY_SANDBOX` wrong for declared mode

---

## References

- L34 multi-region/failover package when present on your branch — re-run drift checks after any failover exercise or DNS cutover