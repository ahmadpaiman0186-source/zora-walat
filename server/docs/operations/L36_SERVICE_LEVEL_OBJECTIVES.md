# L36 — Service level objectives (SLO catalog)

**Status values:** `PASS` | `FAIL` | `NOT VERIFIED` | `BLOCKED`  
**Targets** are **drafts** until baselined from production or staging with production-like load.

**Measurement source legend:** `synth` = synthetic probe; `logs` = structured logs; `metrics` = Prometheus/vendor; `dash` = Stripe/Reloadly Dashboard; `manual` = human process.

| Service / journey | SLI | Measurement source | Target (draft) | Window | Owner | Alert severity | Evidence source | Exclusions | Launch-blocking threshold | Status |
|-------------------|-----|-------------------|----------------|--------|-------|----------------|-----------------|------------|---------------------------|--------|
| Frontend uptime | Successful load of marketing/top-up shell | `synth` + CDN status | 99.5% | 30d | Infra | P2 | Uptime vendor | Planned maintenance | <99% sustained 24h | NOT VERIFIED |
| API `/health` | HTTP 200 | `synth` | 99.9% | 30d | SRE | P0 | Synthetic logs | — | Any sustained mass fail | NOT VERIFIED |
| API `/ready` (auth) | HTTP 200 with healthy deps | `synth` + token | 99.5% | 30d | SRE | P0/P1 | Redacted JSON | PRELAUNCH without token | DB unreachable reason | NOT VERIFIED |
| Auth success | Login + OTP success rate | `logs` / product metrics | 99% | 30d | Eng | P2 | Aggregated rates | User typo | Credential stuffing attack | NOT VERIFIED |
| Checkout create | Session/create success | `logs` + `metrics` | 99.5% | 30d | Eng | P1 | HTTP 5xx rate | Stripe test outages | <98% 1h | NOT VERIFIED |
| Stripe webhook valid ACK | ACK latency + success class | `logs` + `dash` | p95 < 2s; success per L27 | 30d | Eng | P0 | Stripe deliveries + logs | — | Mass 5xx or wrong ACK pattern | NOT VERIFIED |
| Invalid signature rejection | HTTP 400 rate on bad sig | `logs` | ~100% reject | 30d | Security | P1 | Security events | Pen test traffic | 200 on bad sig | NOT VERIFIED |
| Paid→fulfillment transition | Time paid→queued/processing | `logs`/DB | p95 < 60s queue mode | 30d | Eng | P1 | Recon | Worker paused incident | SLA breach sustained | NOT VERIFIED |
| Provider fulfillment completion | Terminal success / order | `logs` + provider | 99% excl. bad MSISDN | 30d | L28 | P1 | Provider metrics | Sandbox | Mass hard fail | NOT VERIFIED |
| Stuck processing detection | Stuck count near zero post-recovery | recon | ~0 after 15m healthy worker | 7d | Eng | P1 | Admin recon | — | Unbounded growth | NOT VERIFIED |
| Ledger / reconciliation | No unacked critical recon | `logs`/jobs | Zero P0 open > 15m | 30d | Finance+Eng | P0 | Recon export | — | Any P0 | NOT VERIFIED |
| Refund / dispute handling | Timely **operational** response | `manual` | Policy-defined days | 30d | Finance | P2 | Ticket SLA | Legal hold | Miss network deadline | NOT VERIFIED |
| Critical security / fraud | Time to contain | `manual`/`logs` | < 30m acknowledge | incident | Security | P0 | Incident ticket | — | No responder | NOT VERIFIED |
| Support first response | Time to first human reply | ticketing | P1 targets in L30 | 30d | Support | P2 | Ticket metrics | — | Money queue unstaffed | NOT VERIFIED |
| Support resolution (money) | Resolved or escalated | ticketing | Per policy | 30d | Support+Finance | P1 | Tickets | — | Backlog breach | NOT VERIFIED |

---

## Alignment

- Latency hints: [`../runbooks/SLO.md`](../runbooks/SLO.md)  
- L29 dashboard fields: when `server/docs/observability/L29_DASHBOARD_LOG_QUERIES.md` exists on branch

---

## Review

- Monthly: [`L36_MONTHLY_SLO_REVIEW_TEMPLATE.md`](./L36_MONTHLY_SLO_REVIEW_TEMPLATE.md)
