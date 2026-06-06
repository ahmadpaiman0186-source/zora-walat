# L-71 — Redaction review (v1 / v2 / v3)

**Date:** 2026-06-06
**Reviewer:** L-71 read-only gate (agent visible-content layer)
**Operator attestation on file:** [REDACTION-REVIEW-001.md](../l67-readonly-provider-webhook-dropzone-recheck-2026-06-05/operator-captured-redacted/REDACTION-REVIEW-001.md) — predates v2/v3; **superseded for v2/v3 by this review**

---

## Progression

| Version | Destination | Event |
|---------|-------------|-------|
| v1 (L-68) | `acct_` in URL · full endpoint URL | White-box on evt_; `price_`/`prod_` visible |
| v2 (L-70) | No `acct_` in URL · **full URL still visible** | evt_ redacted; `price_`/`prod_` visible; status-bar `acct_` |
| v3 (L-71) | No `acct_` · **full URL still visible** | evt_/`price_`/`prod_` redacted; URL truncated on delivery; **200 OK** visible |

---

## L-71 target checklist

| Target | Destination v3 | Event v3 |
|--------|------------------|----------|
| Hide `acct_` | **PASS** | **PASS** |
| Hide event IDs | N/A | **PASS** |
| Hide full webhook URL | **FAIL** | **PASS** (truncated on delivery row) |
| Hide `price_` / `prod_` | N/A | **PASS** |
| Hide secrets / whsec / raw payload | **PASS** | **PASS** |
| Keep sandbox banner | **PASS** | **PASS** |
| Keep destination name / Active | **PASS** | N/A |
| Keep event type / delivery / 200 OK | N/A | **PASS** |

---

## Redaction verdict

| Scope | Verdict |
|-------|---------|
| Stripe event v3 | **REDACTION PASS** (visible layer) |
| Stripe destination v3 | **REDACTION PARTIAL** — full staging URL exposed |
| **Final pass (both required)** | **NOT MET** |

**REDACTION_FAIL:** **NOT TRIGGERED** (no secrets/whsec/raw payload)

---

*End of redaction review.*
