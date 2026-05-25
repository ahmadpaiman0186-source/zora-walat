# Evidence Manifest - STR-02 PR72 Post-Merge Vercel Route Evidence

**Date:** 2026-05-24
**Project:** `zora-walat-api-staging`
**Mode:** Read-only dashboard evidence registration
**Implementation commit:** `4b57499`
**Merge commit:** `2059e46`

**Policy:** Operator-provided local screenshots only. No fabricated evidence, no Vercel/Stripe API call, no deploy/redeploy, no endpoint probe, no resend.

---

## 1. Required Captures

| Evidence ID | Filename | Source | Status | Evidence Purpose |
|-------------|----------|--------|--------|------------------|
| **PR72-D01** | `VERCEL-PR72-LATEST-DEPLOYMENT-SOURCE-COMMIT-001.png` | Vercel Deployments | **CAPTURED** | Latest production deployment list shows `main` commit `d274a82` / PR #74 as current |
| **PR72-D02** | `VERCEL-PR72-DEPLOYMENT-OVERVIEW-SOURCE-COMMIT-002.png` | Vercel deployment overview | **CAPTURED** | Deployment overview shows production/current deployment and source `main` `d274a82` / PR #74 |
| **PR72-D03** | `VERCEL-PR72-BUILD-OUTPUT-003.png` | Vercel deployment build output | **CAPTURED** | Build output shows root build/install for `main` commit `d274a82` |
| **PR72-D04** | `VERCEL-PR72-BUILD-OUTPUT-MIDDLE-004.png` | Vercel deployment build output middle | **MISSING / NOT PROVIDED** | Expected build-output-middle screenshot was not present in `C:\Users\ahmad\Downloads\PR72` |
| **PR72-D05** | `VERCEL-PR72-DEPLOYMENT-FUNCTIONS-ROUTES-005.png` | Vercel Resources / Functions / Routes | **CAPTURED** | `/api/webhooks/stripe` visible in Vercel Resources |
| **PR72-D06** | `VERCEL-PR72-LOGS-WEBHOOK-STRIPE-SEARCH-006.png` | Vercel logs read-only search | **CAPTURED** | `/webhooks/stripe` search shows no logs found; no request sent by Agent |
| **PR72-D07** | `VERCEL-PR72-LOGS-STRIPE-SEARCH-007.png` | Vercel logs read-only search | **CAPTURED** | `stripe` search shows no logs found; no request sent by Agent |
| **PR72-D08** | `VERCEL-PR72-DOMAIN-MAPPING-008.png` | Vercel domains / aliases | **CAPTURED** | `zora-walat-api-staging.vercel.app` valid configuration / production captured |
| **PR72-S01** | `VERCEL-PR72-LATEST-DEPLOYMENT-SOURCE-COMMIT-004.png` | Vercel Deployments | **CAPTURED / SUPPLEMENTAL** | Additional deployment-list screenshot; not a substitute for missing PR72-D04 build-output-middle |

---

## 2. Screenshot Ingestion

| Field | Value |
|-------|-------|
| Source folder | `C:\Users\ahmad\Downloads\PR72` |
| Operator screenshots found locally | **YES** |
| Files ingested in this commit | **8 PNGs** |
| Expected slots captured | **7 / 8** |
| Supplemental screenshots captured | **1** |
| Missing screenshots | **PR72-D04** - `VERCEL-PR72-BUILD-OUTPUT-MIDDLE-004.png` |
| Extra / supplemental screenshots | **PR72-S01** - `VERCEL-PR72-LATEST-DEPLOYMENT-SOURCE-COMMIT-004.png` |
| Redaction requirement | Redact URL/account identifiers; preserve project, commit, route, domain, status |

---

## 3. Evidence Interpretation Rules

| Evidence | Interpretation |
|----------|----------------|
| `/api/webhooks/stripe` appears in functions/resources | **PARTIAL DEPLOYMENT EVIDENCE** - not fix proven |
| Production deployment source `main` `d274a82` / PR #74 appears | **DEPLOYMENT SOURCE EVIDENCE** - not HTTP success |
| No webhook runtime logs | **NO REQUEST OBSERVED / NO RUNTIME CORRELATION** - not failure by itself |
| HTTP 200 | Record only after separately approved resend/probe actually observes it |

---

## 4. Completion Checklist

| Criterion | Status |
|-----------|--------|
| PR72-D01 filed | **CAPTURED** |
| PR72-D02 filed | **CAPTURED** |
| PR72-D03 filed | **CAPTURED** |
| PR72-D04 filed | **MISSING / NOT PROVIDED** |
| PR72-D05 filed | **CAPTURED** |
| PR72-D06 filed | **CAPTURED** |
| PR72-D07 filed | **CAPTURED** |
| PR72-D08 filed | **CAPTURED** |
| Supplemental PR72-S01 filed | **CAPTURED** |
| Verdict matrix updated from captures | **UPDATED** |

---

## 5. Safety Attestation

| Action | Result |
|--------|--------|
| Deploy / redeploy | **NO** |
| Vercel settings edit | **NO** |
| Env edit | **NO** |
| Stripe resend/replay/test event | **NO** |
| Vercel / Stripe API call | **NO** |
| DB/payment/wallet/order mutation | **NO** |
| Fix-proven claim | **NO** |
| Self-healing apply | **NO** |

---

*Evidence manifest - PR72 route-surface screenshots ingested - route surface partially evidenced - no HTTP proof yet*
