# Stripe Webhook Failure — Read-only Investigation Evidence Folder

**Date:** 2026-05-22
**Incident:** Staging test-mode webhook timeouts (PR #46)
**Endpoint:** `https://zora-walat-api-staging.vercel.app/webhooks/stripe`
**Parent docs:** [Evidence addendum](../ZORA_WALAT_STRIPE_WEBHOOK_FAILURE_EVIDENCE_ADDENDUM_2026_05_22.md) · [Investigation checklist](../ZORA_WALAT_STRIPE_WEBHOOK_FAILURE_INVESTIGATION_CHECKLIST_2026_05_22.md)

**Policy:** Evidence **scaffold only**. No captured dashboard PNGs or logs in repo until human operator files them with redaction.

---

## Purpose

Provide a **sanitized, read-only** evidence capture structure for investigating Stripe staging webhook **timeouts** without fixing the webhook or mutating Stripe, Vercel, env, credentials, DB, code, payments, or webhooks.

---

## Scope

| In scope | Out of scope |
|----------|--------------|
| Manifest of required artifacts | Webhook fix implementation |
| Read-only review report **templates** | Stripe API calls |
| Root-cause review template (hypotheses unconfirmed) | Webhook resend / replay |
| Redacted placeholder labels | Dashboard / Vercel mutation |
| Cross-links to Gate 3 / Gate 4 / blockers | Production or live-money proof |

---

## Evidence status

| Item | Status |
|------|--------|
| **Scaffold** | **CREATED** |
| **Stripe dashboard captures** | **PENDING CAPTURE** |
| **Vercel log captures** | **PENDING CAPTURE** |
| **Root cause** | **NOT CONFIRMED** |
| **Webhook fix** | **NOT EXECUTED** |

---

## What can be captured read-only

| Source | Capture type | Redaction |
|--------|--------------|-----------|
| Stripe Dashboard (test mode) | Endpoint list, delivery attempts, error summary | No secrets, account ID → `REDACTED_STRIPE_ACCOUNT_ID` |
| Stripe failure email | Summary text only (already in addendum) | `REDACTED_STRIPE_EMAIL_MESSAGE_ID` |
| Vercel staging | Function logs, deployment SHA, route health | No env values, no request IDs unless redacted |
| Ap786 notes | Root-cause template completion | No event IDs unless redacted |

---

## What is forbidden

| Action | Status |
|--------|--------|
| Stripe dashboard endpoint edit/delete/create | **FORBIDDEN** |
| Webhook resend / replay | **FORBIDDEN** |
| Vercel env or deploy change | **FORBIDDEN** |
| Commit secret values or raw webhooks | **FORBIDDEN** |
| Fake screenshots or log exports | **FORBIDDEN** |
| Claim fix complete | **FORBIDDEN** |

---

## Redaction rules

| Data | Placeholder |
|------|-------------|
| Stripe account ID | `REDACTED_STRIPE_ACCOUNT_ID` |
| Email message ID | `REDACTED_STRIPE_EMAIL_MESSAGE_ID` |
| Signing secrets / API keys | **Omit entirely** |
| Event IDs | `REDACTED_STRIPE_EVENT_ID` or omit |
| Vercel request IDs | `REDACTED_VERCEL_REQUEST_ID` or omit |
| Customer PII | **Omit** |

---

## Evidence naming convention

```
{ARTIFACT-ID}_{YYYYMMDD}_{scope}.{ext}
```

Examples (when filed):

- `STRIPE-WH-DASHBOARD-DELIVERY-ATTEMPTS-001_20260522_staging.png`
- `VERCEL-STAGING-FUNCTION-LOGS-001_20260522_staging-redacted.pdf`
- `WEBHOOK-TIMEOUT-ROOT-CAUSE-NOTES-001_20260522_staging.md`

Store filed binaries in this folder; update [manifest](./STRIPE_VERCEL_READONLY_EVIDENCE_MANIFEST_2026_05_22.md) row status only when file exists.

---

## Folder contents

| File | Role |
|------|------|
| [STRIPE_VERCEL_READONLY_EVIDENCE_MANIFEST_2026_05_22.md](./STRIPE_VERCEL_READONLY_EVIDENCE_MANIFEST_2026_05_22.md) | Artifact inventory |
| [STRIPE_DASHBOARD_READONLY_REVIEW_REPORT_2026_05_22.md](./STRIPE_DASHBOARD_READONLY_REVIEW_REPORT_2026_05_22.md) | Stripe read-only report |
| [VERCEL_LOGS_READONLY_REVIEW_REPORT_2026_05_22.md](./VERCEL_LOGS_READONLY_REVIEW_REPORT_2026_05_22.md) | Vercel read-only report |
| [WEBHOOK_TIMEOUT_ROOT_CAUSE_REVIEW_TEMPLATE_2026_05_22.md](./WEBHOOK_TIMEOUT_ROOT_CAUSE_REVIEW_TEMPLATE_2026_05_22.md) | Hypothesis template |

---

## Current verdict

| Verdict | Value |
|---------|-------|
| **Read-only investigation scaffold** | **CREATED** |
| **Actual Stripe dashboard evidence** | **PENDING CAPTURE** |
| **Actual Vercel logs evidence** | **PENDING CAPTURE** |
| **Staging webhook health** | **FAILED / PENDING INVESTIGATION** |
| **Production webhook health** | **NOT PROVEN** |
| **Webhook root cause** | **NOT CONFIRMED** |
| **Production / real-money** | **NO-GO** |
| **Self-healing apply** | **GATED / NOT ENABLED** |

---

## Next safe actions

1. Human operator: read-only Stripe Dashboard review per [dashboard report](./STRIPE_DASHBOARD_READONLY_REVIEW_REPORT_2026_05_22.md).
2. Human operator: read-only Vercel logs per [Vercel report](./VERCEL_LOGS_READONLY_REVIEW_REPORT_2026_05_22.md).
3. File redacted artifacts; update manifest rows from **PENDING CAPTURE** → **EVIDENCE FILED**.
4. Complete root-cause template — **no hypothesis confirmed** without evidence.
5. Any fix → Track H + explicit approval — **not** this scaffold.

---

*Evidence folder · scaffold only · no fake proof*
