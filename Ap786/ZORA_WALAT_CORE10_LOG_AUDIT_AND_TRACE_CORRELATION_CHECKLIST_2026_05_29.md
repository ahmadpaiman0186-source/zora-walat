# CORE-10 Log, Audit, and Trace Correlation Checklist

**Date:** 2026-05-29  
**Status:** **PENDING** — logs **not captured** in CORE-10 filing

---

## 1. Purpose

When staging snapshot capture is **separately approved**, correlate **redacted** runtime logs (Vercel or equivalent) with snapshot entities and CORE-04 findings.

**CORE-10 filing does not access Vercel or live logs.**

---

## 2. Correlation checklist

| ID | Check | PASS criteria | Status |
|----|-------|---------------|--------|
| L-01 | Request id → order id mapping | Sample of 3 orders traceable | **PENDING** |
| L-02 | Stripe webhook received log | Matches `stripeWebhookEvents` row | **PENDING** |
| L-03 | Order status transition log | Matches audit + order status | **PENDING** |
| L-04 | Provider dispatch log | Matches fulfillment attempt | **PENDING** |
| L-05 | No-pay-no-service block log | Present when payment absent | **PENDING** |
| L-06 | Duplicate webhook log | Matches CORE-04 DUP finding if any | **PENDING** |
| L-07 | Error / timeout log | Linked to ambiguous provider finding | **PENDING** |
| L-08 | Vercel deployment id | Matches staging env (CORE10-EV-ENV-001) | **PENDING** |
| L-09 | No secret leakage in exported logs | Redaction review | **PENDING** |
| L-10 | Time window alignment | Log UTC window ⊂ snapshot window | **PENDING** |

Evidence: **CORE10-EV-VERCEL-001**, **CORE10-EV-AUDIT-001**.

---

## 3. Audit trail correlation

| Audit event (expected) | Order field | Doctor finding |
|------------------------|-------------|----------------|
| `stripe_webhook_received` | PAID transition | NPNS / audit |
| `order_status_changed` | status enum | mismatch scanner |
| `provider_success` | attempt SUCCESS | provider proof |
| `provider_failed` | attempt FAILED | ambiguous |

Gap → CORE-04 `CORE4-AUD-*` or CORE-06 audit fail-closed.

---

## 4. Trace correlation (optional)

| Signal | Use |
|--------|-----|
| `correlationId` | Join payment → webhook → fulfill |
| `trace_id` | Join API → worker |

If missing → **PENDING_REVIEW** in CORE-09 pilot gate — not auto-repaired.

---

## 5. Forbidden

| Action | Rule |
|--------|------|
| Live Vercel API pull without capture approval | **Forbidden** |
| Filing raw logs with secrets | **Forbidden** |
| Log pull that triggers deploy or config change | **Forbidden** |

---

## 6. Conservative verdict

Log/audit correlation **not verified**. Staging scan **not executed**.

---

*End of checklist.*
