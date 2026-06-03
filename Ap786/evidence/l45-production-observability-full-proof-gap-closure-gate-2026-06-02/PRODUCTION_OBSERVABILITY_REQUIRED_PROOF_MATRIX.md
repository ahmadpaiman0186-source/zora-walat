# L-45 — Production observability required proof matrix

**Date:** 2026-06-02
**Gate:** CORE10-L45-FULL-OBS-PROOF-GATE-001

---

## Matrix (hard-minimum for FULLY_PROVEN)

| # | Proof row | Required artifact | Acceptable source | Forbidden source | Pass criteria | Fail/blocked criteria | Mutation risk | Approval requirement |
|---|-----------|-------------------|-------------------|------------------|---------------|----------------------|---------------|---------------------|
| 1 | Alert routing proof | Redacted PNG/PDF: prod alert policy + route; optional fired-drill ticket ref | Better Stack / PagerDuty / Vercel prod monitoring | Staging-only; sandbox Stripe; docs-only | Prod scope; route visible; redaction pass | Missing; wrong scope; secret leak | **Low** (read-only capture) | `APPROVE L-46 … READ-ONLY ONLY` for intake |
| 2 | Uptime synthetic proof | Redacted PNG: 7d+ synthetic/uptime for `zorawalat.com` + API host | Better Stack / external synthetics on **prod** hosts | Staging hostname; single deploy Ready panel | Monitor name, target, uptime % or pass history | Missing; staging substitute | **Low** | L-46 read-only intake |
| 3 | Incident acknowledgement proof | Redacted PNG + ticket ID: alert fired → ack within policy | Incident tool + on-call record | Fabricated ticket; no ack timestamp | Ack visible; prod service linked | No ack; no ticket | **Low** | L-46 + optional drill phrase |
| 4 | On-call/escalation policy proof | Redacted PNG: schedule/escalation policy for prod | PagerDuty/Opsgenie/Better Stack on-call | Personal phone/email unredacted | Escalation path visible | PII leak; no prod linkage | **Low** | L-46 read-only |
| 5 | Production API error/log visibility proof | Redacted PNG or JSONL sample: API prod log/error panel | Vercel prod logs / APM on `zora-walat-api` | Staging logs; raw webhook body | Structured fields; no secrets | Secret/PII; staging-only | **Low** | L-46 read-only |
| 6 | Frontend production error visibility proof | Redacted PNG: frontend prod errors/availability | Vercel prod / RUM on `zorawalat.com` | Frontend-qa local PNGs | Prod project visible | Wrong project | **Low** | L-46 read-only |
| 7 | Money-path anomaly detection proof | Redacted PNG: unpaid gate / webhook fail / duplicate counters (prod) | Prod dashboards + redacted log enums | Stripe sandbox as prod proof | Money-path enums only | Full payment IDs; sandbox | **Low** | L-46 read-only |
| 8 | Webhook/payment-path observability proof | Redacted PNG/JSONL: webhook outcome rates (prod) | Prod Stripe dashboard summary + app logs (enum) | Raw webhook payloads | event_type + outcome enum | Raw body; `whsec_*` | **Low** | L-46 read-only |
| 9 | Provider-path observability proof | Redacted PNG: provider fail/retry/timeout counters (prod) | Prod panels + correlation IDs (suffix) | Reloadly sandbox as prod | Provider scope prod-labeled | Sandbox; secrets | **Low** | L-46 read-only |
| 10 | Rollback drill evidence | Redacted PNG or signed MD: executed rollback drill + post-health PASS | Ap786 drill record + prod deploy UI (read-only) | UI rollback button only; no drill record | Pre/post SHA; health PASS | Live rollback without phrase | **Medium** (drill may touch prod) | Separate rollback drill authorization |
| 11 | Incident response runbook evidence | Redacted MD/PDF: SEV table-top or runbook walkthrough record | Ap786 + operator sign-off | Generic template only | Attendees, decisions, prod service names | Fabricated sign-off | **Low** | L-46 or tabletop phrase |
| 12 | SRE/operator sign-off evidence | Redacted PNG/PDF: `OBS-SIGN-SRE-001` referencing matrix rows | Signed checklist with explicit **NOT launch-ready** if gaps remain | Self-signed without review | All critical rows addressed or waived with rationale | Missing gaps hidden | **Low** | SRE role + explicit sign-off session |

---

## Row status at L-45 filing

| Status | Meaning |
|--------|---------|
| Rows 1–2 (screenshot intake) | **PARTIAL** — PNGs filed; **proof-value review not FULLY_PROVEN** |
| Rows 3–12 | **PENDING_EVIDENCE** |

---

*Matrix defines proof required to close CORE10-BLK-OBS-GAPS-001 — filing alone is not proof.*
