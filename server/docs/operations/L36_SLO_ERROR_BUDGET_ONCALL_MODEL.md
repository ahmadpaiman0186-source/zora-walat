# L36 — Formal SLO, error budget, and on-call model

**Gate:** L36 = **organizational** definitions for reliability targets, budget consumption, paging, and escalation — **documentation only** until wired to tooling.  
**Status:** DOCS-SPEC PASS / **NOT RUNTIME VERIFIED** (no alert sink, no roster in vendor systems).

---

## L36 scope

| In scope | Out of scope |
|----------|----------------|
| SLO/SLI catalog, error budget math, burn-rate **policy** | Creating PagerDuty services, Slack apps, Datadog monitors |
| On-call **roles** and escalation **templates** | 24/7 staffing contract |
| Incident severity and response targets | Live paging without operator approval |
| Monthly review template | Automated SLO reporting without data pipeline |

---

## Terminology

| Term | Meaning |
|------|---------|
| **SLI** | Service level **indicator** — measurable good/total ratio |
| **SLO** | Service level **objective** — target over a window for SLI |
| **Error budget** | Allowed bad events = (1 − SLO) × eligible events in window |
| **SLA** | **Contractual** commitment to customers/partners — legal/finance owns |
| **Alert threshold** | Vendor rule firing on metric/log — may be **tighter** than SLO |
| **KPI** | Business metric — may correlate but is **not** the same as SLO |

---

## Service areas covered (journey map)

1. Public frontend availability  
2. API liveness (`/health`)  
3. API readiness (`/ready`)  
4. Auth / OTP  
5. Checkout / top-up initiation  
6. Stripe webhook **ACK** and correctness signals  
7. Payment state correctness  
8. Fulfillment / provider completion  
9. Ledger / reconciliation integrity  
10. Refund / dispute **operational** response (manual-first Phase 1)  
11. Fraud / security incident response  
12. Support response  

Details: [`L36_SERVICE_LEVEL_OBJECTIVES.md`](./L36_SERVICE_LEVEL_OBJECTIVES.md).

---

## Formal ownership model

- **Product/Eng** owns SLO definitions and error budget **policy**.  
- **Finance** owns money-path interpretation and dispute SLAs with networks.  
- **Support** owns customer-facing comms cadence.  
- **Security** owns fraud SEV classification.  
- **Infra/SRE** owns synthetics and platform availability SLIs.

---

## Prelaunch vs soft launch vs production

| Phase | Applicability |
|-------|----------------|
| **Prelaunch** | SLOs for `/ready` may use **authenticated** probes only; public traffic excluded |
| **Soft launch (L32)** | Narrow cohort; stricter **manual** review of budget burn |
| **Production** | Full SLO set; paging as wired |

---

## Relation to other L gates

| Gate | L36 uses |
|------|----------|
| **L29** | Alert routing, log queries — **when merged/wired** |
| **L30** | Support response SLIs, templates |
| **L31** | Security/fraud SEV and response |
| **L32** | Freeze/throttle when budget burns |
| **L33** | Capacity evidence before trusting SLO |
| **L34** | Failover affects availability SLI |
| **L35** | Stable env inventory for measurement |
| **L26 / PR #4** | `/ready` timeout semantics affect readiness SLO |
| **L27 / PR #5** | Webhook ACK/dispute behavior |
| **L28** | Provider completion SLI |

**External alert sink:** Still **not wired** until operator approves (per L29 ADR when present).

---

## NO-GO conditions (public launch)

- No **named** on-call rotation for money-path SEV0/1.  
- No **measurement** plan for critical SLIs (even manual weekly).  
- Error budget policy **unsigned** by engineering lead.  
- **Silencing** all money-path alerts to pass launch review.

---

## References

- [`L36_SERVICE_LEVEL_OBJECTIVES.md`](./L36_SERVICE_LEVEL_OBJECTIVES.md), [`L36_ERROR_BUDGET_POLICY.md`](./L36_ERROR_BUDGET_POLICY.md), [`../runbooks/SLO.md`](../runbooks/SLO.md)
