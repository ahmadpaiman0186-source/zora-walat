# L-36B — Screenshot manifest (re-intake session)

**Date:** 2026-06-01
**Session verdict:** **PENDING_OPERATOR_CAPTURE**

---

## Workspace scan summary

| Scan | Result |
|------|--------|
| Operator PNG/PDF matching `OBS-DASH-*` or L-36B intake path | **0** |
| [L-35 screenshots-redacted](../l35-production-dashboard-screenshot-evidence-2026-05-31/screenshots-redacted/) | **0** files |
| Existing Ap786 PNG corpus (75 files) | **Not ingested** — staging (STR-*), local frontend-qa, or Stripe sandbox scope |

---

## Required rows (L-36B)

| OBS ID | Category | Filed? | Redaction verified? |
|--------|----------|--------|---------------------|
| `OBS-DASH-PLATFORM-001` | Platform / project overview | **NO** | — |
| `OBS-DASH-MONEY-001` | Money-path / webhooks | **NO** | — |
| `OBS-DASH-FULFILL-001` | Fulfillment | **NO** | — |
| `OBS-DASH-SEC-001` | Security / auth | **NO** | — |
| `OBS-SYNTH-UPTIME-001` | Synthetic uptime (optional) | **NO** | — |

---

## Rejection policy (if files appear later)

| Reject reason | Action |
|---------------|--------|
| Staging-only hostname visible as prod proof | **Do not ingest** |
| Visible secret/token/env | **Do not ingest** |
| Unredacted payment/provider ID | **Do not ingest** |
| Fabricated / placeholder image | **Do not ingest** |

---

*End of manifest.*
