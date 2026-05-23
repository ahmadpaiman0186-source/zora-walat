# Zora-Walat — Stripe Webhook Failure Investigation Checklist

**Date:** 2026-05-22
**Incident:** Staging test-mode webhook timeouts — see [EVIDENCE_ADDENDUM](./ZORA_WALAT_STRIPE_WEBHOOK_FAILURE_EVIDENCE_ADDENDUM_2026_05_22.md)
**Endpoint:** `https://zora-walat-api-staging.vercel.app/webhooks/stripe`
**Capture plan:** [CHECKOUT_SESSION_EXPIRED_TIMEOUT_ROOT_CAUSE_CAPTURE_PLAN_2026_05_22.md](./evidence/stripe-webhook-failure-2026-05-22/CHECKOUT_SESSION_EXPIRED_TIMEOUT_ROOT_CAUSE_CAPTURE_PLAN_2026_05_22.md)

**Policy:** **Read-only** investigation unless explicit approval for Track H changes. **Do not** mark fix **COMPLETE** or root cause **CONFIRMED** without capture plan §8 exit criteria.

---

## 1. Purpose

Safe, approval-gated checklist to determine root cause of Stripe staging webhook **timeouts** and file evidence without mutating Stripe, Vercel, credentials, or production systems.

---

## 2. Safe investigation model

| Phase | Allowed | Forbidden |
|-------|---------|-----------|
| **Collect** | Read-only Dashboard + logs | Resend, replay, edit endpoint |
| **Analyze** | Redacted notes in Ap786 | Secret values in git |
| **Plan** | Docs + ticket | Deploy without approval |
| **Fix** | Track H only | Agent-autonomous mutation |

---

## 3. Pre-investigation approvals

| Approval | Required for | Status |
|----------|--------------|--------|
| Engineering Owner | Vercel log read | **PENDING REVIEW** |
| Payments Owner | Stripe Dashboard read (test mode) | **PENDING REVIEW** |
| IC (if prolonged) | Escalation past disable deadline | **APPROVAL REQUIRED** |
| Track H | Any code/config/deploy fix | **NOT APPROVED** |

---

## 4. Stripe Dashboard read-only evidence checklist

| Row | Evidence | Mode | Status |
|-----|----------|------|--------|
| SD-01 | Webhook endpoint list screenshot (URL visible, secrets redacted) | Test | **EVIDENCE FILED (redacted)** — [ENDPOINT-OVERVIEW-001.png](./evidence/stripe-webhook-failure-2026-05-22/STRIPE-WH-DASHBOARD-ENDPOINT-OVERVIEW-001.png) |
| SD-02 | Failed deliveries list incl. `checkout.session.expired` (May 19 2026 2:10:08 PM) | Test | **PENDING CAPTURE** — `STRIPE-WH-DASHBOARD-EVENT-DELIVERIES-CHECKOUT-EXPIRED-FAILED-LIST-001.png` not in Telegram batch |
| SD-03 | Failed delivery detail + error insight (timeout) | Test | **PENDING CAPTURE** — `STRIPE-WH-DELIVERY-FAILED-CHECKOUT-SESSION-EXPIRED-TIMEOUT-001.png` + `...ERROR-INSIGHT-001.png` not in source |
| SD-03a | Attempt timestamp (UTC), event type, delivery status, event ID (redacted) recorded | Test | **PENDING EVIDENCE** — per capture plan §3.1 |
| SD-04 | Event types associated with failures (enum only) | Test | **PENDING EVIDENCE** |
| SD-05 | Retry behavior note (no event IDs in git) | Test | **PENDING EVIDENCE** |
| SD-06 | Disable-risk deadline confirmation | Test | **READ-ONLY ONLY** — per addendum |

**Account ID in exports:** replace with `REDACTED_STRIPE_ACCOUNT_ID`.

---

## 5. Vercel logs read-only evidence checklist

| Row | Evidence | Status |
|-----|----------|--------|
| VC-01 | Function invocations for `/webhooks/stripe` around Stripe attempt time | **NOT PROVEN** — broad search filed; window-aligned RC-04 **PENDING CAPTURE** |
| VC-01a | Log search variants: `/webhooks/stripe`, POST, `checkout.session.expired`, `stripe`, status/error filters | **PENDING EVIDENCE** — RC-05 / VC-SV-01…05 **PENDING CAPTURE** |
| VC-01b | Vercel Observability Plus / 30-day retention limitation | **PENDING CAPTURE** — `VERCEL-STAGING-LOGS-RETENTION-LIMITATION-001.png` not in source |
| VC-01c | Classify: no request vs timed out vs route/function failed | **NOT ASSIGNED** — blocked until RC-01 filed |
| VC-02 | Duration / timeout indicators (no PII) | **PENDING EVIDENCE** |
| VC-03 | Cold start pattern note | **NOT PROVEN** |
| VC-04 | 5xx vs timeout classification | **PENDING EVIDENCE** |
| VC-05 | Deploy version / SHA at failure time | **PENDING EVIDENCE** |

---

## 6. Endpoint health evidence checklist

| Row | Check | Status |
|-----|-------|--------|
| EH-01 | `GET /api/health` staging (synthetic) | **PENDING EVIDENCE** |
| EH-02 | `GET /api/ready` staging | **PENDING EVIDENCE** |
| EH-03 | Webhook path returns fast 2xx on synthetic POST (test tool, no live charge) | **NOT EXECUTED** |
| EH-04 | Production endpoint health | **NOT PROVEN** |

---

## 7. Timeout root-cause checklist

**Note:** Rows below use **generic** RC-* IDs. For **`checkout.session.expired`** correlated Stripe/Vercel capture requirements (RC-01…RC-05, H1…H6, CL-A…E, exit criteria), use [CHECKOUT_SESSION_EXPIRED_TIMEOUT_ROOT_CAUSE_CAPTURE_PLAN_2026_05_22.md](./evidence/stripe-webhook-failure-2026-05-22/CHECKOUT_SESSION_EXPIRED_TIMEOUT_ROOT_CAUSE_CAPTURE_PLAN_2026_05_22.md).

| Row | Hypothesis | Verification | Status |
|-----|------------|--------------|--------|
| RC-01 | Handler wall-clock > Stripe limit | Log duration | **PENDING EVIDENCE** |
| RC-02 | DB connection slow on staging | Ready probe + DB metrics | **PENDING EVIDENCE** |
| RC-03 | External API call in webhook path | Trace/log review | **NOT PROVEN** |
| RC-04 | Platform cold start | Vercel duration | **NOT PROVEN** |
| RC-05 | Misconfigured route/middleware | Code review (Track H) | **PENDING REVIEW** |

---

## 8. Fast-acknowledgement requirement checklist

| Row | Requirement | Status |
|-----|-------------|--------|
| FA-01 | Return 2xx within Stripe window (document target ms) | **PENDING REVIEW** |
| FA-02 | Heavy work deferred async (if architecture requires) | **NOT PROVEN** |
| FA-03 | Documented pattern in Ap786 or code (Track H) | **PENDING REVIEW** |

---

## 9. Async processing requirement checklist

| Row | Requirement | Status |
|-----|-------------|--------|
| AP-01 | Long fulfillment not blocking webhook ACK | **NOT PROVEN** |
| AP-02 | Queue/worker separation documented | **PENDING REVIEW** |
| AP-03 | Failure does not block ACK path | **PENDING EVIDENCE** |

---

## 10. Webhook signature verification checklist

| Row | Check | Status |
|-----|-------|--------|
| SV-01 | Signing secret configured in staging (name only) | **PENDING REVIEW** |
| SV-02 | Verification failures in logs (enum, not secret) | **PENDING EVIDENCE** |
| SV-03 | Timeout vs 401/403 distinction | **PENDING EVIDENCE** |
| SV-04 | Prod signing secret approval | **NOT APPROVED** (Gate 4) |

---

## 11. Idempotency and duplicate-event checklist

| Row | Check | Status |
|-----|-------|--------|
| ID-01 | L-4/L-5 staging docs referenced | **READ-ONLY ONLY** |
| ID-02 | Retry after timeout does not double-PAID | **PENDING EVIDENCE** |
| ID-03 | `duplicate_payment_webhook` signal (staging) | **PARTIAL** (design) |
| ID-04 | Prod idempotency | **NOT PROVEN** (STRIPE-WH-005) |

---

## 12. No-pay-no-service verification checklist

| Row | Check | Status |
|-----|-------|--------|
| NPS-01 | Unpaid fulfill blocked when webhook missed | **PENDING EVIDENCE** |
| NPS-02 | Gate denial logs during failure window | **PENDING EVIDENCE** |
| NPS-03 | Prod boundary | **NOT PROVEN** (STRIPE-WH-006) |

---

## 13. Fulfillment safety checklist

| Row | Check | Status |
|-----|-------|--------|
| FS-01 | Orders stuck non-terminal after missed webhook | **PENDING EVIDENCE** |
| FS-02 | Operator status-check reconciles state | **PENDING EVIDENCE** |
| FS-03 | Prod fulfillment safety | **NOT PROVEN** (STRIPE-WH-003) |

---

## 14. Evidence naming and storage rules

| Rule | Value |
|------|-------|
| Path | `Ap786/evidence/stripe-webhook-failure-2026-05-22/` — [README](./evidence/stripe-webhook-failure-2026-05-22/README.md) · [manifest](./evidence/stripe-webhook-failure-2026-05-22/STRIPE_VERCEL_READONLY_EVIDENCE_MANIFEST_2026_05_22.md) |
| Filename | `WH-EV-{nn}_{YYYYMMDD}_{scope}.png` or `.md` |
| Redaction | No secrets, event IDs optional redacted |
| Index | Update addendum §20 when filed |

---

## 15. Rejection criteria

| Reject if | Reason |
|-----------|--------|
| Contains live secret or signing key | Security violation |
| Claims fix without WH-EV-04 | False attestation |
| Uses prod data in staging incident file | Scope error |
| Invented request/event IDs | Audit failure |

---

## 16. Exit criteria

Investigation may move from **PENDING INVESTIGATION** to **ROOT CAUSE DOCUMENTED (staging)** only when [capture plan §8](./evidence/stripe-webhook-failure-2026-05-22/CHECKOUT_SESSION_EXPIRED_TIMEOUT_ROOT_CAUSE_CAPTURE_PLAN_2026_05_22.md) exit criteria (EC-01…EC-07) are met, including:

1. RC-01…RC-05 filed (redacted) with Vercel window aligned to Stripe attempt time.
2. CL-A…E assigned; exactly one H1…H6 **CONFIRMED** with artifact links.
3. SD-01…SD-03a and VC-01…VC-01b satisfied per checklist §4–§5.
4. STRIPE-WH-001 blocker updated with exit note.
5. Fix implementation (if any) tracked separately — **NOT** part of investigation exit.
6. Prod certification (STRIPE-WH-008) remains **NOT PROVEN**.

**Fix complete:** **NOT EXECUTED** — do not check COMPLETE on fix rows.

---

*Investigation Checklist · read-only · fix NOT COMPLETE*
