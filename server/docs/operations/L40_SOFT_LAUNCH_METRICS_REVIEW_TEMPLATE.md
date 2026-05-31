# L40 — Soft launch metrics review template

Copy one row per review period. **No secrets** or full PII in shared copies.

## Review period

- **Start date (UTC):**  
- **End date (UTC):**  
- **Reviewer(s):**  

## Cohort size

- **Active users / accounts (definition):**  
- **Count:**  

## Transaction volume

- **Orders / checkouts initiated:**  
- **Paid transactions:**  

## Payment success rate

- **Definition (e.g. PI succeeded / session completed):**  
- **Rate %:**  
- **Notes:**  

## Fulfillment success rate

- **Definition (e.g. delivered / paid):**  
- **Rate %:**  
- **Notes:**  

## Fulfillment latency

- **p50 / p95 (same unit):**  
- **SLA target (if any):**  

## Failed transaction reasons

| Reason bucket | Count | % of failures | Notes |
|---------------|-------|----------------|-------|
| | | | |

## Refund / dispute count

- **Refunds initiated:**  
- **Disputes opened:**  
- **Financial notes (redacted):**  

## Support contact rate

- **Tickets / 1000 paid tx (or chosen denominator):**  
- **Top 3 categories:**  

## Reconciliation status

- **Open reconciliation items:**  
- **Aging buckets (e.g. >24h, >72h):**  
- **Reference:** `FINANCE_TRUTH_AND_RECONCILIATION.md`  

## Uptime / readiness status

- **Synthetic / `/ready` signals:**  
- **Major incidents in window (ids):**  

## Top defects

| Defect / theme | Severity | Owner | Tracker id |
|----------------|----------|-------|------------|
| | | | |

## Go / no-go recommendation

- **Recommendation:** **Continue soft launch** / **Hold expansion** / **Rollback / freeze** (per `PHASE1_LAUNCH_ROLLBACK_NOTES.md` and governance when available)  
- **Rationale (3 bullets max):**  
1.  
2.  
3.  

## Approvals (optional)

| Role | Name | Date |
|------|------|------|
| Product | | |
| Engineering | | |
| Finance | | |

## Related

- [L40_POST_SOFT_LAUNCH_LEARNING_LOOP.md](./L40_POST_SOFT_LAUNCH_LEARNING_LOOP.md)
