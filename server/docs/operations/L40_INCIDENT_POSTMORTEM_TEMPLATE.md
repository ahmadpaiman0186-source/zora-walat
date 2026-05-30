# L40 — Incident postmortem template

Blameless postmortem for production-impacting incidents. **No secrets** in the body.

## Incident id

- **Internal id:**  
- **External refs (vendor tickets, redacted):**  

## Severity

- **SEV (internal scale):**  
- **Rationale:**  

## Customer impact

- **User-visible symptoms:**  
- **Approx. affected users / orders (ranges OK):**  

## Money-path impact

- **Yes / No / Unknown** — describe:  
- **Stripe / ledger / provider touchpoints:**  

## Timeline

| Time (UTC) | Event |
|------------|-------|
| | Detection |
| | Mitigation start |
| | Mitigation complete |
| | Customer comms (if any) |

## Detection source

- **Alert / support / customer / internal engineer:**  
- **Detection lag (minutes):**  

## Root cause

- **Technical root cause:**  
- **Why it reached production:**  

## Contributing factors

- e.g. missing test, unclear ownership, pressure, dependency outage  

## What worked

- e.g. rollback speed, runbook accuracy, comms  

## What failed

- e.g. missing metric, on-call gap, slow rollback  

## Corrective actions

| Action | Owner | Due date | Tracker id |
|--------|-------|----------|------------|
| | | | |

## Evidence links

- Dashboards / logs (redacted):  
- PRs:  

## Final closure verdict

- **Status:** **Open** / **Closed** / **Closed with residual risk**  
- **Closure summary (1 paragraph):**  
- **Signoff (optional):** Security / Eng lead / IC  

## Related

- [L40_CORRECTIVE_ACTION_TRACKER.md](./L40_CORRECTIVE_ACTION_TRACKER.md)
- [../PHASE1_INCIDENT_PLAYBOOK.md](../PHASE1_INCIDENT_PLAYBOOK.md)
