# L36 — Error budget policy

**Owner:** Engineering lead (with Finance for money-path).  
**Related:** [`L36_SERVICE_LEVEL_OBJECTIVES.md`](./L36_SERVICE_LEVEL_OBJECTIVES.md), L32 soft-launch guardrails when available.

---

## Budget definition

For an SLO of **99.9%** monthly availability:

- **Bad budget** = 0.1% × **eligible minutes** in the month (e.g. ~43 minutes for 30d all-minutes SLO).
- Per-SLI budgets are **independent** unless combined in executive review.

---

## Calculation method

1. Choose SLI good/total or bad events from measurement source.  
2. **Rolling 30-day** or **calendar month** — pick one per SLI and **document**.  
3. **Burn** = bad events consumed / total budget for window.

---

## Monthly window

- Default: **calendar month** for executive reporting.  
- **Fast burn** detection may use **shorter** sub-windows (1h, 6h) — see below.

---

## Burn-rate windows

| Class | Definition | Typical action |
|-------|------------|----------------|
| **Fast burn** | ≥ **2%** of monthly budget in **1 hour** | Page + incident commander |
| **Medium burn** | ≥ **10%** of monthly budget in **6 hours** | Page + Slack bridge |
| **Slow burn** | ≥ **50%** of monthly budget before day 15 | Review + throttle cohort |

*(Percentages align with common Google SRE practice; tune after baseline.)*

---

## Freeze policy

- **Fast burn** on **money-path** SLO → **freeze cohort expansion** (L32): no new allowlist widening until burn explained.  
- **Exhausted budget** for availability → **feature freeze** except reliability fixes until next month or approved exception.

---

## Rollback / kill-switch policy

- Tie to L32/L34 docs when on branch: `PAYMENTS_LOCKDOWN_MODE`, `PRELAUNCH_LOCKDOWN` — **two-person** for production.  
- Error budget **does not** authorize disabling Stripe signature verification.

---

## Public launch blocking rules

- Money-path SLO **NOT VERIFIED** with no measurement plan → **block** GA.  
- Zero error budget remaining for **webhook ACK** SLO with open Sev-1 → **block** marketing surge.

---

## Soft launch cohort throttling

- If **medium burn** during C2/C3 → reduce marketing, hold allowlist expansion.  
- Support backlog correlated with SLO breach → same.

---

## Exception process

1. Written request with **customer impact** narrative  
2. Eng lead + Product approval  
3. Time-boxed exception with **end date**  
4. Logged in monthly review

---

## Evidence requirements

- Export of SLI numerator/denominator or vendor SLO report  
- Incident links for burn attribution

---

## Relation to L29 and L32

- **L29:** Burn-rate **alerts** should map to this policy when wired — see [`L36_BURN_RATE_ALERTING_POLICY.md`](./L36_BURN_RATE_ALERTING_POLICY.md).  
- **L32:** Launch guardrails **enforce** throttle before this policy is ignored.

---

## NO-GO conditions

- “Accepting” SLO miss **without** incident record  
- Using error budget to **skip** security fixes  
- **Silencing** alerts to artificially restore budget math

---

## References

- [`L36_BURN_RATE_ALERTING_POLICY.md`](./L36_BURN_RATE_ALERTING_POLICY.md), [`../runbooks/L36_ERROR_BUDGET_BURN_RATE_RESPONSE_RUNBOOK.md`](../runbooks/L36_ERROR_BUDGET_BURN_RATE_RESPONSE_RUNBOOK.md)
