# Evidence Manifest — STR-02 Vercel Read-Only Routing Diagnostics

**Date:** 2026-05-24
**Project:** `zora-walat-api-staging` (staging only)
**Mode:** Read-only dashboard review · **no deploy · no settings mutation**

**Policy:** No fabricated screenshots. All captures default **PENDING CAPTURE** until operator files PNGs.

---

## 1. Required captures

| Evidence ID | Filename | Source (Vercel Dashboard) | Capture instructions | Redaction | Status | Proves (when captured) | Does not prove |
|-------------|----------|---------------------------|----------------------|-----------|--------|------------------------|----------------|
| **VRC-D01** | `VERCEL-STAGING-PROJECT-SETTINGS-GENERAL-ROOT-DIRECTORY-001.png` | Project → **Settings** → **General** | **Root Directory** visible (`server` vs empty/root); project name `zora-walat-api-staging` | Hide team tokens; mask unrelated project IDs if shown | **PENDING CAPTURE** | Which repo subdirectory Vercel builds | Webhook handler correctness |
| **VRC-D02** | `VERCEL-STAGING-PROJECT-SETTINGS-FRAMEWORK-BUILD-002.png` | Project → **Settings** → **General** / **Build & Development** | Framework preset; build command; output directory; install command | Same | **PENDING CAPTURE** | Next.js vs API-style build config | POST /webhooks/stripe works |
| **VRC-D03** | `VERCEL-STAGING-LATEST-DEPLOYMENT-SOURCE-COMMIT-003.png` | Project → **Deployments** → latest **Production** or active staging deploy | Branch **`main`**; commit SHA; deployment **Ready**; timestamp vs STR-02 Resend window | Redact deploy URLs beyond host if policy requires | **PENDING CAPTURE** | Deploy lineage at diagnostic time | Root cause confirmed |
| **VRC-D04** | `VERCEL-STAGING-LATEST-DEPLOYMENT-BUILD-OUTPUT-004.png` | Same deployment → **Build Logs** or **Output** / **Source** tab | Visible build output paths; `api/index.mjs` or absence | No secrets in logs | **PENDING CAPTURE** | Build includes API entry | Runtime 200 on webhook |
| **VRC-D05** | `VERCEL-STAGING-LATEST-DEPLOYMENT-FUNCTIONS-ROUTES-005.png` | Same deployment → **Functions** / **Routes** (if available) | Listed serverless functions / routes; catch-all to `api/index.mjs` if visible | Same | **PENDING CAPTURE** | Deployed route surface | Handler executed |
| **VRC-D06** | `VERCEL-STAGING-DOMAINS-ALIAS-MAPPING-006.png` | Project → **Settings** → **Domains** | `zora-walat-api-staging.vercel.app` mapped to this project; production vs preview | Same | **PENDING CAPTURE** | Domain → correct project | Stripe 200 |
| **VRC-D07** | `VERCEL-STAGING-LOGS-NO-WEBHOOK-RUNTIME-CORRELATION-007.png` | Project → **Logs** | Search `"/webhooks/stripe"` or `stripe`; window ±30 min STR-02 Resend (~May 24, 2026 2:09 PM); **No logs found** | URL bar redacted | **PENDING CAPTURE** | No runtime correlation | Request never sent |

---

## 2. Cross-reference (already filed — sibling folder)

| Prior ID | Filename | Location | Status |
|----------|----------|----------|--------|
| VRC-01 | `VERCEL-STAGING-STR02-NO-RUNTIME-LOGS-WEBHOOK-STRIPE-004.png` | [staging replay proof](../staging-stripe-webhook-replay-proof-pr55-2026-05-23/) | **CAPTURED / NO MATCH** |
| VRC-02 | `VERCEL-STAGING-STR02-NO-RUNTIME-LOGS-STRIPE-005.png` | Same | **CAPTURED / NO MATCH** |

**Note:** VRC-D07 may corroborate VRC-01/02 when filed in this folder under canonical name **007**. Do **not** duplicate without operator capture.

---

## 3. Manifest completion checklist

| # | Criterion | Status |
|---|-----------|--------|
| M-V01 | VRC-D01 filed | **PENDING CAPTURE** |
| M-V02 | VRC-D02 filed | **PENDING CAPTURE** |
| M-V03 | VRC-D03 filed | **PENDING CAPTURE** |
| M-V04 | VRC-D04 filed | **PENDING CAPTURE** |
| M-V05 | VRC-D05 filed | **PENDING CAPTURE** |
| M-V06 | VRC-D06 filed | **PENDING CAPTURE** |
| M-V07 | VRC-D07 filed | **PENDING CAPTURE** |
| M-V08 | [Diagnostic verdict matrix](../../ZORA_WALAT_STR02_VERCEL_DIAGNOSTIC_VERDICT_MATRIX_2026_05_24.md) updated post-capture | **PENDING** |

**Overall manifest:** **INCOMPLETE** · captures **PENDING** · root cause **NOT CONFIRMED**

---

## 4. Attestation

| Attestation | Result |
|-------------|--------|
| Vercel dashboard settings edited | **NO** |
| Deploy / redeploy executed | **NO** |
| Env vars edited | **NO** |
| Vercel / Stripe API called (Agent) | **NO** |
| Resend / replay executed | **NO** |
| Fix proven claim | **NO** |

---

*Manifest · STR-02 Vercel read-only diagnostics · captures PENDING · no deploy*
