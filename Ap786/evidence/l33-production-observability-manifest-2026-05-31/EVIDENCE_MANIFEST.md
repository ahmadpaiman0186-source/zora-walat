# L-33 — Production observability evidence manifest (planning)

**Date:** 2026-05-31  
**Parent:** [ZORA_WALAT_L33_PRODUCTION_OBSERVABILITY_MANIFEST_EVIDENCE_2026_05_31.md](../../ZORA_WALAT_L33_PRODUCTION_OBSERVABILITY_MANIFEST_EVIDENCE_2026_05_31.md)  
**Canonical program:** [ZORA_WALAT_OBSERVABILITY_EVIDENCE_MANIFEST_2026_05_21.md](../../ZORA_WALAT_OBSERVABILITY_EVIDENCE_MANIFEST_2026_05_21.md)

---

## 1. What production observability evidence must include

| Pillar | Minimum proof (production-labeled) | Staging substitute allowed? |
|--------|----------------------------------|----------------------------|
| **Dashboards** | Sanitized PNG/PDF: platform, money-path, fulfillment, security/auth | **NO** for prod **PROVEN** row |
| **Metrics / RED** | 7d export or screenshot: 5xx rate, latency p95, error budget panel | **NO** |
| **Logs** | Redacted JSONL samples: access, webhook outcome, gate denial, operator action | Staging samples **PARTIAL** only |
| **Traces** | One money-path waterfall (IDs redacted) | Staging **PARTIAL** only |
| **Alerts** | At least one fired drill + ticket ID (redacted) | CI guard **PARTIAL** |
| **Synthetics** | 7d history for `/`, `/success`, `/cancel`, `/api/health`, `/api/ready` on **production** hosts | **NO** |
| **SLO** | Monthly or rolling SLO report artifact | **NO** |
| **Money-path** | Webhook success ratio, duplicate counter, unpaid gate denials (prod panels) | Staging L-4/L-5 refs **PARTIAL** |
| **Drills** | SEV2 tabletop, SEV1 money simulation record, PIR drill, comms template | Tabletop may be doc-only |
| **Rollback** | API + frontend rollback drill records | Staging rollback **PARTIAL** |
| **Governance** | G-10 policy + zw-doctor apply-disabled proof + empty self-heal ticket log acceptable | Docs **PARTIAL** |

---

## 2. Screenshot / artifact checklist

| ID | Artifact | Format | Redaction | Pass when |
|----|----------|--------|-----------|-----------|
| `OBS-DASH-PLATFORM-001` | Platform overview | PNG/PDF | No secrets/PII | Panel shows deploy SHA, 5xx, route table |
| `OBS-DASH-MONEY-001` | Money-path | PNG/PDF | No raw Stripe bodies | Webhook success/fail counts visible |
| `OBS-DASH-FULFILL-001` | Fulfillment | PNG/PDF | Order suffix only | Attempt counts, no provider secrets |
| `OBS-DASH-SEC-001` | Security / auth | PNG/PDF | No JWT/session tokens | Auth failure rate enum only |
| `OBS-TRACE-MONEY-001` | Checkout→webhook trace | PNG | Trace IDs truncated | Correlation visible |
| `OBS-SYNTH-UPTIME-001` | Synthetic 7d | PNG | Public URLs only | Uptime % for prod hosts |
| `OBS-SYNTH-001`..`005` | Per-route synthetics | PNG | — | Each route **PASS** ≥ agreed threshold |
| `OBS-LOG-STRUCT-001` | Access sample | JSONL | `-redacted` suffix | ≥10 lines, correlation ID present |
| `OBS-LOG-WH-001` | Webhook outcome | JSONL | event_type + enum only | No payload secrets |
| `OBS-ALERT-TEST-001` | Alert drill | PNG + ticket ref | Ticket ID ok, no secrets | Alert fired + acknowledged |
| `OBS-DRILL-SEV2-001` | Tabletop | MD | — | Attendees + decisions redacted ok |
| `OBS-RB-API-001` | API rollback drill | MD | — | Post-rollback health **PASS** recorded |

**Not acceptable as production proof:** PR #35 frontend QA PNGs; staging-only Vercel log captures (see L-32); zw-doctor CI static run alone.

---

## 3. Required redactions

| Data class | Rule |
|------------|------|
| Secrets / API keys | **Never** in artifact |
| JWT / session tokens | **Never** |
| `.env` values | **Never** |
| Full order / payment IDs | **Suffix only** (last 8–10 chars) |
| Customer email / phone | **Remove** or hash |
| Raw Stripe webhook body | **Enum + event_type only** |
| Vercel env panel screenshots | **Forbidden** |
| Operator passwords | **Never** |

Filename convention: `{OBS-ID}-{YYYY-MM-DD}-redacted.{ext}` per program manifest §14.

---

## 4. Pass / fail criteria

| Verdict | Condition |
|---------|-----------|
| **ROW_PASS** | Artifact filed under `Ap786/evidence/observability-*/` (or approved external index link); scope = **production**; reviewer initials in INDEX; meets §3 redaction |
| **ROW_PARTIAL** | Staging or CI-only proof; counts toward engineering confidence **not** prod **PROVEN** |
| **ROW_FAIL** | Missing artifact, wrong scope, or redaction violation |
| **PROGRAM_PASS** | All **required** prod rows **ROW_PASS**; SRE sign-off `OBS-SIGN-SRE-001` |
| **PROGRAM_FAIL** | Any critical row **ROW_FAIL** or secret leak |

**L-33 filing status:** all rows **PENDING** — manifest only.

---

## 5. Abort criteria (future capture sessions)

Stop immediately and file **BLOCKED** evidence if:

| # | Trigger |
|---|---------|
| A1 | Agent or operator proposes production deploy/redeploy without phrase |
| A2 | Production API probe, login, or token refresh without phrase |
| A3 | Production `vercel logs` / log pull without separate authorization |
| A4 | Dashboard or alert **mutation** (create/edit/delete) |
| A5 | Env / secret edit in Vercel, Neon, Stripe, Reloadly |
| A6 | Secret, token, or password appears in terminal or evidence |
| A7 | Evidence text claims **production-ready**, **real-money-ready**, or **market-ready** |
| A8 | Non-Ap786 files modified during evidence-only PR |
| A9 | Self-healing or Runtime Doctor **--apply** proposed |

---

## 6. Staging foundation (reference only)

| L-step | Staging proof | Maps to OBS rows |
|--------|---------------|------------------|
| L-30 | Operator snapshot (partial) | `OBS-MONEY-STAGING-001` reference |
| L-31 | Doctor + logs (partial) | Informs log correlation pattern |
| L-32 | Token + status + log correlation | **NOT** prod synthetics |

---

*End of L-33 evidence manifest — planning artifact only.*
