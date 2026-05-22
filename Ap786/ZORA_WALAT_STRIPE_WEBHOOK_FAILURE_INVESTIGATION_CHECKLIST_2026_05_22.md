# Zora-Walat — Stripe Webhook Failure Investigation Checklist

**Date:** 2026-05-22
**Incident:** Staging test-mode webhook timeouts — see [EVIDENCE_ADDENDUM](./ZORA_WALAT_STRIPE_WEBHOOK_FAILURE_EVIDENCE_ADDENDUM_2026_05_22.md)
**Endpoint:** `https://zora-walat-api-staging.vercel.app/webhooks/stripe`

**Policy:** **Read-only** investigation unless explicit approval for Track H changes. **Do not** mark fix **COMPLETE**.

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
| SD-01 | Webhook endpoint list screenshot (URL visible, secrets redacted) | Test | **PENDING EVIDENCE** |
| SD-02 | Delivery log for failure window (2026-05-19 UTC+) | Test | **PENDING EVIDENCE** |
| SD-03 | Failure reason column = timeout (redacted export) | Test | **PENDING EVIDENCE** |
| SD-04 | Event types associated with failures (enum only) | Test | **PENDING EVIDENCE** |
| SD-05 | Retry behavior note (no event IDs in git) | Test | **PENDING EVIDENCE** |
| SD-06 | Disable-risk deadline confirmation | Test | **READ-ONLY ONLY** — per addendum |

**Account ID in exports:** replace with `REDACTED_STRIPE_ACCOUNT_ID`.

---

## 5. Vercel logs read-only evidence checklist

| Row | Evidence | Status |
|-----|----------|--------|
| VC-01 | Function invocations for `/webhooks/stripe` around 2026-05-19 21:10 UTC | **PENDING EVIDENCE** |
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
| Path | `Ap786/evidence/stripe-webhook-failure-2026-05-22/` |
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

Investigation may move from **PENDING INVESTIGATION** to **ROOT CAUSE DOCUMENTED (staging)** only when:

1. SD-01…SD-03 and VC-01…VC-02 filed (redacted).
2. RC-* rows have evidence-backed conclusion (not guess).
3. STRIPE-WH-001 blocker updated with exit note.
4. Fix implementation (if any) tracked separately — **NOT** part of investigation exit.
5. Prod certification (STRIPE-WH-008) remains **NOT PROVEN**.

**Fix complete:** **NOT EXECUTED** — do not check COMPLETE on fix rows.

---

*Investigation Checklist · read-only · fix NOT COMPLETE*
