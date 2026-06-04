# L32 — Go / no-go checklist

**Statuses:** `PASS` | `FAIL` | `NOT VERIFIED` | `BLOCKED`  
**Launch-blocking:** `Y` = cannot advance cohort or enable live money without remediation.

**Columns:** Item | Owner | Evidence required | Status | Launch-blocking | Remediation owner

---

## Infrastructure / runtime

| Item | Owner | Evidence required | Status | Launch-blocking | Remediation owner |
|------|-------|-------------------|--------|-----------------|-------------------|
| Production deploy matches tagged release | Eng lead | Deploy id, commit SHA | NOT VERIFIED | Y | Eng |
| `/health` synthetic green | SRE/on-call | Vendor check screenshot | NOT VERIFIED | Y | Eng |
| `/ready` authenticated probe green | SRE | JSON snapshot (redacted) | NOT VERIFIED | Y | Eng |
| CORS / lockdown matches cohort plan | Eng | `corsPolicy` + env names documented | NOT VERIFIED | Y | Eng |

---

## Database / backup / restore

| Item | Owner | Evidence required | Status | Launch-blocking | Remediation owner |
|------|-------|-------------------|--------|-----------------|-------------------|
| Migrations applied | Eng | `migrate deploy` log | NOT VERIFIED | Y | Eng |
| L25 drill status acceptable | Ops lead | L25 evidence index | NOT VERIFIED | Y | Ops |
| No open ledger immutability violations | Finance+Eng | Recon scan output | NOT VERIFIED | Y | Eng |

---

## Stripe / webhook

| Item | Owner | Evidence required | Status | Launch-blocking | Remediation owner |
|------|-------|-------------------|--------|-----------------|-------------------|
| Live vs test key mode correct | Eng | Preflight / Dashboard (redacted) | NOT VERIFIED | Y | Eng |
| Webhook endpoint + signing secret aligned | Eng | Dashboard version id | NOT VERIFIED | Y | Eng |
| HTTP 200 ≠ success understood by on-call | Ops | Training ack | NOT VERIFIED | N | Ops |

---

## Provider / Reloadly

| Item | Owner | Evidence required | Status | Launch-blocking | Remediation owner |
|------|-------|-------------------|--------|-----------------|-------------------|
| Sandbox/live flag matches phase | Eng | Env checklist | NOT VERIFIED | Y | Eng |
| Production rehearsal or waiver | Ops | RELOADLY doc sign-off | NOT VERIFIED | Y | L28 owner |

---

## Observability / alerts

| Item | Owner | Evidence required | Status | Launch-blocking | Remediation owner |
|------|-------|-------------------|--------|-----------------|-------------------|
| Log drain or platform logs accessible | Ops | Access screenshot | NOT VERIFIED | N | Ops |
| Critical alerts routed (or interim process) | Ops | Runbook link | NOT VERIFIED | N | Ops |
| Money-path alert semantics understood | Eng | L29 doc ack | NOT VERIFIED | N | Eng |

---

## Support / recovery

| Item | Owner | Evidence required | Status | Launch-blocking | Remediation owner |
|------|-------|-------------------|--------|-----------------|-------------------|
| Support staffed for window | Support lead | Roster | NOT VERIFIED | Y | Support |
| Escalation path to engineering | Support | Contact tree | NOT VERIFIED | Y | Support |
| L30-style runbook available or waiver | Support | Doc link / waiver | NOT VERIFIED | N | Support |

---

## Security / compliance / fraud

| Item | Owner | Evidence required | Status | Launch-blocking | Remediation owner |
|------|-------|-------------------|--------|-----------------|-------------------|
| L31-equivalent checklist reviewed | Security champ | Signed checklist | NOT VERIFIED | Y | Security |
| Rate limits / abuse matrix current | Eng | `ABUSE_HARDENING_MATRIX` review | NOT VERIFIED | N | Eng |
| Secrets scan clean | Eng | CI artifact | NOT VERIFIED | Y | Eng |

---

## Legal / privacy

| Item | Owner | Evidence required | Status | Launch-blocking | Remediation owner |
|------|-------|-------------------|--------|-----------------|-------------------|
| User-facing notices adequate for cohort | Legal | URL or waiver | NOT VERIFIED | Y | Legal |
| Data handling for logs/support | Legal/Privacy | Policy ack | NOT VERIFIED | N | Legal |

---

## Operational staffing

| Item | Owner | Evidence required | Status | Launch-blocking | Remediation owner |
|------|-------|-------------------|--------|-----------------|-------------------|
| Primary + secondary on-call | Ops | Named people | NOT VERIFIED | Y | Ops |
| Incident channel ready | Ops | Channel id | NOT VERIFIED | Y | Ops |

---

## Rollback readiness

| Item | Owner | Evidence required | Status | Launch-blocking | Remediation owner |
|------|-------|-------------------|--------|-----------------|-------------------|
| Previous release artifact available | Eng | Tag recorded | NOT VERIFIED | Y | Eng |
| Kill-switch runbook reviewed | Eng | [`L32_ROLLBACK_KILL_SWITCH_PLAN.md`](./L32_ROLLBACK_KILL_SWITCH_PLAN.md) ack | NOT VERIFIED | Y | Eng |

---

## Evidence pack

| Item | Owner | Evidence required | Status | Launch-blocking | Remediation owner |
|------|-------|-------------------|--------|-----------------|-------------------|
| `L32_EVIDENCE_PACK_TEMPLATE` started | Ops | Folder path | NOT VERIFIED | N | Ops |

---

## Final operator signoff

| Item | Owner | Evidence required | Status | Launch-blocking | Remediation owner |
|------|-------|-------------------|--------|-----------------|-------------------|
| Go decision recorded | Eng lead | Signed row in this doc | NOT VERIFIED | Y | Eng lead |
| Cohort phase explicit (C0–C3) | Product/Ops | One-line in evidence | NOT VERIFIED | Y | Product |

---

## Verdict line (copy to evidence)

`L32_GO_NO_GO: <GO | NO-GO> | Cohort: <Cx> | Time (UTC): <…> | Approvers: <names>`
