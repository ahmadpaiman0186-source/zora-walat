# Day 1 — Remaining risks (honest, pre-production)

Staging success **does not** equal production readiness. Items below remain until closed with process + evidence.

## Environment and operations

- **Production secrets rotation** — JWT, Stripe live vs test, webhook signing secrets, DB credentials: lifecycle and break-glass not covered in this pack.
- **SMTP / OTP** — Staging may not mirror production email delivery; operator flows may differ.
- **Redis / queue health** — Staging may differ from production topology; webhook shadow path depends on Redis behavior.

## Scale and SLOs

- **Cold start vs warm** — Serverless latency distributions not characterized at production traffic.
- **Webhook SLO** — End-to-end p95/p99 from Stripe → DB not instrumented in this document.

## Compliance and abuse

- **Fraud thresholds** — Tuned for staging smoke, not proven across markets.
- **PII handling** — Policies and DSR flows not evidenced here.

## Financial reconciliation

- **Provider settlement** — Reloadly / partner reconciliation beyond “one happy path” not claimed.
- **Ledger / accounting** — Formal finance sign-off not implied.

## Disaster recovery

- **Backup / restore drill** — Per L25-style gates; not re-run in this Day 1 pack.

Use this list to drive L-3 … L-7 work items; see `DAY1_ROADMAP_L3_L7.md`.
