# L-37 — Production observability capture checklist

**Date:** 2026-06-01
**Gate:** CORE10-L37-CAPTURE-GATE-001

---

## Operator capture checklist (production only)

| # | Item | OBS ID (example) | Filed? | Redacted? | Prod scope? |
|---|------|------------------|--------|-----------|-------------|
| 1 | Platform / deployment dashboard | `OBS-DASH-PLATFORM-001` | **NO** | — | — |
| 2 | API deployment / health visibility | `OBS-DASH-API-001` | **NO** | — | — |
| 3 | Frontend deployment / availability | `OBS-DASH-FRONTEND-001` | **NO** | — | — |
| 4 | Logs / error dashboard | `OBS-DASH-LOGS-001` | **NO** | — | — |
| 5 | APM / metrics dashboard | `OBS-DASH-APM-001` | **NO** | — | — |
| 6 | Uptime / synthetics | `OBS-SYNTH-UPTIME-001` | **NO** | — | — |
| 7 | Alert policy / routing | `OBS-ALERT-ROUTING-001` | **NO** | — | — |
| 8 | Incident / on-call / rollback record | `OBS-INCIDENT-RB-001` | **NO** | — | — |
| 9 | Security / audit summary | `OBS-DASH-SEC-001` | **NO** | — | — |
| 10 | Money-path observability | `OBS-DASH-MONEY-001` | **NO** | — | — |

**SRE sign-off (future):** `OBS-SIGN-SRE-001` — **PENDING**

---

## Pre-capture (operator)

- [ ] Confirm dashboard shows **production** project/domain (not staging)
- [ ] Redact secrets, tokens, env, PII, full payment/provider IDs
- [ ] Name file `OBS-DASH-*-2026-06-01-redacted.png`
- [ ] Copy into [screenshots-redacted/](./screenshots-redacted/)
- [ ] Do **not** reuse STR-* / `VERCEL-STAGING-*` / frontend-qa / Stripe sandbox PNGs

---

## Post-capture (reviewer)

- [ ] Run redaction checklist ([REDACTION_POLICY.md](./REDACTION_POLICY.md))
- [ ] Confirm no abort rule triggered ([ABORT_RULES.md](./ABORT_RULES.md))
- [ ] Update manifest rows to FILED
- [ ] Apply pass/fail verdict ([PASS_FAIL_CRITERIA.md](./PASS_FAIL_CRITERIA.md))

---

*Checklist filing only — all rows NO at L-37 gate session.*
