# L34 — DNS and traffic failover plan

**Status:** Planning only. **DNS changes** require Infra approval and change window.

---

## DNS ownership assumptions

- Registrar and DNS host documented in **internal** wiki (not in git).
- **apex** and **api** subdomains may be split between CDN and API gateway.

---

## TTL policy

- **Pre-cutover:** lower TTL (e.g. 60–300s) **only** after staging rehearsal — avoid long sticky outages.
- **Steady state:** higher TTL acceptable for cost/perf — document tradeoff.
- **Never** set TTL=0 without provider guidance.

---

## CDN / Vercel alias considerations

- Vercel project domains, preview vs production — **list** deployment targets in runbook appendix (names only).
- Certificate coverage on standby hostname **before** cutover.
- **Forbidden:** pointing production domain to preview deployment without review.

---

## Frontend vs API routing

- **Web app** may be static/CDN; **API** may be serverless/regional.
- Failover may require **two** routing updates (UI + API) — coordinate in single change record.

---

## Stripe webhook endpoint implications

- Webhook URL is **hostname-bound**; DNS or path change → update Stripe Dashboard endpoint.
- Coordinate signing secret rotation with **second person**.
- Expect **brief** delivery gap during switch — monitor Dashboard.

---

## Callback / provider endpoint implications

- Reloadly callbacks (if any) must allow new egress or hostname — check provider console allowlists.
- OAuth redirect URLs if they embed host.

---

## Rollback-to-primary

1. Verify **single** Postgres primary in primary region.
2. Point DNS/API back; restore previous Stripe webhook if needed.
3. Re-run **sample** integrity checks from [`L34_DATA_INTEGRITY_POST_FAILOVER_CHECKLIST.md`](./L34_DATA_INTEGRITY_POST_FAILOVER_CHECKLIST.md).

---

## Forbidden DNS actions

- CNAME to unverified third party
- Parallel production domains to **two** active API backends without health checks
- Changing DNS without rollback contact awake

---

## Evidence (screenshots / logs)

- Before/after DNS record screenshots (**blur** account tokens)
- Propagation check tool output (aggregate, no PII)
- Stripe webhook endpoint version id

---

## Operator approval

- **Infra lead** + **Eng lead** minimum for production DNS.
- **Finance** if cutover overlaps settlement window.

---

## References

- [`L24_MULTI_REGION_FAILOVER.md`](../L24_MULTI_REGION_FAILOVER.md), [`L34_FAILOVER_OPERATIONAL_DRILL_RUNBOOK.md`](../runbooks/L34_FAILOVER_OPERATIONAL_DRILL_RUNBOOK.md)
