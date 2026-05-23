# Stripe Webhook Failure — Read-only Investigation Evidence Folder

**Date:** 2026-05-22
**Incident:** Staging test-mode webhook timeouts (PR #46)
**Endpoint:** `https://zora-walat-api-staging.vercel.app/webhooks/stripe`
**Parent docs:** [Evidence addendum](../ZORA_WALAT_STRIPE_WEBHOOK_FAILURE_EVIDENCE_ADDENDUM_2026_05_22.md) · [Investigation checklist](../ZORA_WALAT_STRIPE_WEBHOOK_FAILURE_INVESTIGATION_CHECKLIST_2026_05_22.md)

**Policy:** Redacted PNG captures **filed 2026-05-22**. Telegram source **reviewed 2026-05-22** — required `checkout.session.expired` **failure** PNGs **not in source folder** (see [attestation](./TELEGRAM_SOURCE_INGESTION_ATTESTATION_2026_05_22.md)). Root cause **NOT confirmed**.

---

## Filed captures (2026-05-22)

| PNG (redacted) | Summary |
|----------------|---------|
| [STRIPE-WH-DASHBOARD-ENDPOINT-OVERVIEW-001.png](./STRIPE-WH-DASHBOARD-ENDPOINT-OVERVIEW-001.png) | Test/sandbox endpoint active for staging URL |
| [STRIPE-WH-DELIVERY-RECOVERED-CHARGE-REFUNDED-001.png](./STRIPE-WH-DELIVERY-RECOVERED-CHARGE-REFUNDED-001.png) | `charge.refunded` delivery **Recovered** |
| [STRIPE-WH-DELIVERY-SUCCESS-CHARGE-REFUNDED-200-001.png](./STRIPE-WH-DELIVERY-SUCCESS-CHARGE-REFUNDED-200-001.png) | Recovered delivery **HTTP 200** |
| [VERCEL-STAGING-LOGS-NO-MATCH-WEBHOOK-STRIPE-001.png](./VERCEL-STAGING-LOGS-NO-MATCH-WEBHOOK-STRIPE-001.png) | Vercel logs: **no matches** for `"/webhooks/stripe"` (prior search) |
| [VERCEL-STAGING-LOGS-WEBHOOK-STRIPE-NO-MATCH-CURRENT-001.png](./VERCEL-STAGING-LOGS-WEBHOOK-STRIPE-NO-MATCH-CURRENT-001.png) | Vercel logs: **no matches** for `"/webhooks/stripe"` (current Last 30 min) |

**PENDING CAPTURE (not in Telegram Desktop batch):** failed `checkout.session.expired` delivery list · failed delivery detail (May 19 2026 2:10:08 PM) · error insight timeout · Vercel 30-day retention limitation · May 19 window-aligned logs.

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
| **Redacted PNG captures** | **5 FILED** (2026-05-22) |
| **Telegram ingest** | **REVIEWED** — [attestation](./TELEGRAM_SOURCE_INGESTION_ATTESTATION_2026_05_22.md) |
| **Stripe failed checkout.session.expired timeout evidence** | **PENDING CAPTURE** (not in source batch) |
| **Stripe error insight timeout evidence** | **PENDING CAPTURE** (not in source batch) |
| **Vercel historical log correlation** | **BLOCKED / INCONCLUSIVE** (retention PNG missing; no May 19 window logs) |
| **Webhook fix** | **NOT EXECUTED** |
| **Resend / replay (repo task)** | **NOT EXECUTED** |
| **Dashboard mutation (repo task)** | **NOT EXECUTED** |

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
| [CHECKOUT_SESSION_EXPIRED_TIMEOUT_ROOT_CAUSE_CAPTURE_PLAN_2026_05_22.md](./CHECKOUT_SESSION_EXPIRED_TIMEOUT_ROOT_CAUSE_CAPTURE_PLAN_2026_05_22.md) | **Root-cause capture plan** |
| [TELEGRAM_SOURCE_INGESTION_ATTESTATION_2026_05_22.md](./TELEGRAM_SOURCE_INGESTION_ATTESTATION_2026_05_22.md) | **Telegram source review** |
| [VERCEL-STAGING-LOGS-WEBHOOK-STRIPE-NO-MATCH-CURRENT-001.png](./VERCEL-STAGING-LOGS-WEBHOOK-STRIPE-NO-MATCH-CURRENT-001.png) | Filed capture (redacted) |
| [STRIPE-WH-DASHBOARD-ENDPOINT-OVERVIEW-001.png](./STRIPE-WH-DASHBOARD-ENDPOINT-OVERVIEW-001.png) | Filed capture (redacted) |
| [STRIPE-WH-DELIVERY-RECOVERED-CHARGE-REFUNDED-001.png](./STRIPE-WH-DELIVERY-RECOVERED-CHARGE-REFUNDED-001.png) | Filed capture (redacted) |
| [STRIPE-WH-DELIVERY-SUCCESS-CHARGE-REFUNDED-200-001.png](./STRIPE-WH-DELIVERY-SUCCESS-CHARGE-REFUNDED-200-001.png) | Filed capture (redacted) |
| [VERCEL-STAGING-LOGS-NO-MATCH-WEBHOOK-STRIPE-001.png](./VERCEL-STAGING-LOGS-NO-MATCH-WEBHOOK-STRIPE-001.png) | Filed capture (redacted) |

---

## Current verdict

| Verdict | Value |
|---------|-------|
| **Redacted dashboard evidence** | **5 PNGs FILED** (2026-05-22) |
| **Stripe `checkout.session.expired` failure evidence** | **PENDING CAPTURE** |
| **Stripe error insight timeout evidence** | **PENDING CAPTURE** |
| **Vercel log correlation (May 19 window)** | **BLOCKED / INCONCLUSIVE** |
| **Staging webhook health** | **FAILED / PENDING INVESTIGATION** (timeout root cause **NOT confirmed**) |
| **Full webhook health** | **NOT globally proven** |
| **Production webhook health** | **NOT PROVEN** |
| **Webhook root cause** | **NOT CONFIRMED** |
| **Production / real-money / pilot** | **NO-GO** |
| **Self-healing apply** | **GATED / NOT ENABLED** |

---

## Next safe actions

1. Export missing Stripe failure + error-insight + Vercel retention PNGs to `Telegram Desktop`; re-run ingest.
2. Align Vercel log window to Stripe attempt timestamp (May 19 2026 2:10:08 PM) when RC-01 filed.
3. Assign classification CL-A…E and update hypothesis matrix — **NOT CONFIRMED** until §8 exit criteria met.
4. Any fix → Track H + explicit approval — **not** this evidence pack.

---

*Evidence folder · Telegram reviewed · Stripe timeout PNGs PENDING · root cause NOT confirmed*
