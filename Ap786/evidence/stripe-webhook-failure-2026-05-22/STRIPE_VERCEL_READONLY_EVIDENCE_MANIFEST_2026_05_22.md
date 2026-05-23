# Stripe / Vercel Read-only Evidence Manifest

**Date:** 2026-05-22
**Folder:** `Ap786/evidence/stripe-webhook-failure-2026-05-22/`
**Incident:** Staging webhook timeouts — [addendum](../../ZORA_WALAT_STRIPE_WEBHOOK_FAILURE_EVIDENCE_ADDENDUM_2026_05_22.md)

**Policy:** Redacted PNG captures filed 2026-05-22. **No** fake COMPLETE for missing artifacts or root cause.

---

## Filed redacted captures (2026-05-22)

| File | Stripe mode | Capture date | Status | What it proves | What it does NOT prove |
|------|-------------|--------------|--------|----------------|------------------------|
| [STRIPE-WH-DASHBOARD-ENDPOINT-OVERVIEW-001.png](./STRIPE-WH-DASHBOARD-ENDPOINT-OVERVIEW-001.png) | Test / sandbox | 2026-05-22 | **EVIDENCE FILED (redacted)** | Staging endpoint configured and active for `https://zora-walat-api-staging.vercel.app/webhooks/stripe` | Prod endpoint; fix; global health |
| [STRIPE-WH-DELIVERY-RECOVERED-CHARGE-REFUNDED-001.png](./STRIPE-WH-DELIVERY-RECOVERED-CHARGE-REFUNDED-001.png) | Test / sandbox | 2026-05-22 | **EVIDENCE FILED (redacted)** | `charge.refunded` delivery **Recovered** after prior failures | All event types; timeout root cause |
| [STRIPE-WH-DELIVERY-SUCCESS-CHARGE-REFUNDED-200-001.png](./STRIPE-WH-DELIVERY-SUCCESS-CHARGE-REFUNDED-200-001.png) | Test / sandbox | 2026-05-22 | **EVIDENCE FILED (redacted)** | Recovered delivery returned **HTTP 200** | Full webhook health; prod |
| [VERCEL-STAGING-LOGS-NO-MATCH-WEBHOOK-STRIPE-001.png](./VERCEL-STAGING-LOGS-NO-MATCH-WEBHOOK-STRIPE-001.png) | Staging | 2026-05-22 | **EVIDENCE FILED (redacted)** | Logs search `"/webhooks/stripe"` → **no matching logs** in selected timeline | Handler invoked; timeout duration; deploy SHA |

**Missing from repo (PENDING CAPTURE):** see [checkout.session.expired capture plan](./CHECKOUT_SESSION_EXPIRED_TIMEOUT_ROOT_CAUSE_CAPTURE_PLAN_2026_05_22.md) §10.

- `STRIPE-WH-DELIVERY-FAILED-CHECKOUT-SESSION-EXPIRED-TIMEOUT-001.png` (RC-01)
- `STRIPE-WH-DASHBOARD-ERROR-INSIGHT-TIMEOUT-001.png` (RC-02)
- `STRIPE-WH-DASHBOARD-EVENT-DELIVERIES-MIXED-STATUS-001.png` (RC-03)
- `VERCEL-STAGING-LOGS-WINDOW-MATCH-CHECKOUT-EXPIRED-001.png` (RC-04)
- `VERCEL-STAGING-LOGS-SEARCH-VARIANTS-CHECKOUT-EXPIRED-001.png` (RC-05)

---

## Artifact inventory

| Artifact ID | Evidence type | Source system | Required screenshot/file | Redaction required | Current status | What it proves | What it does NOT prove | Required reviewer | Next action |
|-------------|---------------|---------------|--------------------------|-------------------|----------------|----------------|------------------------|-------------------|-------------|
| STRIPE-WH-EMAIL-REDacted-001 | Email summary | Stripe notification | Redacted email excerpt or operator attestation `.md` | Account ID, message ID | **PENDING CAPTURE** | Test-mode delivery failures reported | Root cause; prod impact | Payments Owner | Copy sanitized facts from addendum only |
| STRIPE-WH-DASHBOARD-ENDPOINT-READONLY-001 | Dashboard | Stripe (test mode) | [STRIPE-WH-DASHBOARD-ENDPOINT-OVERVIEW-001.png](./STRIPE-WH-DASHBOARD-ENDPOINT-OVERVIEW-001.png) | Account ID, webhook ID in URL | **EVIDENCE FILED (redacted)** | Endpoint registered to staging URL | Handler performance; fix; prod | Payments Owner | Capture missing mixed-status / timeout PNGs |
| STRIPE-WH-DASHBOARD-DELIVERY-ATTEMPTS-001 | Dashboard | Stripe (test mode) | PNG: delivery log ≥ failure window | Event IDs optional redact | **PENDING CAPTURE** | Timeout failures occurred | Vercel-side cause | Payments Owner | File RC-03 mixed-status PNG per [capture plan](./CHECKOUT_SESSION_EXPIRED_TIMEOUT_ROOT_CAUSE_CAPTURE_PLAN_2026_05_22.md) |
| STRIPE-WH-DASHBOARD-ERROR-SUMMARY-001 | Dashboard | Stripe (test mode) | `STRIPE-WH-DASHBOARD-ERROR-INSIGHT-TIMEOUT-001.png` | No response bodies with secrets | **PENDING CAPTURE** | Failure class (timeout) / error insight | HTTP status from origin if absent | Payments Owner | RC-02 per capture plan |
| STRIPE-WH-DASHBOARD-EVENT-LIST-001 | Dashboard | Stripe (test mode) | PNG or CSV export (event types only) | Event IDs, payloads | **PENDING CAPTURE** | Event types during failures | Business outcome | Payments Owner | Types/enums only |
| STRIPE-WH-DELIVERY-FAILED-CHECKOUT-EXPIRED-001 | Dashboard | Stripe (test mode) | `STRIPE-WH-DELIVERY-FAILED-CHECKOUT-SESSION-EXPIRED-TIMEOUT-001.png` | Event ID, account ID | **PENDING CAPTURE** | Failed `checkout.session.expired` delivery detail | Root cause alone | Payments Owner | RC-01 per capture plan |
| VERCEL-STAGING-FUNCTION-LOGS-001 | Logs | Vercel | [VERCEL-STAGING-LOGS-NO-MATCH-WEBHOOK-STRIPE-001.png](./VERCEL-STAGING-LOGS-NO-MATCH-WEBHOOK-STRIPE-001.png) + RC-04/05 | Request IDs, env, PII | **PARTIAL EVIDENCE FILED (redacted)** | Prior broad search: no rows; window-aligned search **PENDING** | Function ran; timeout proof | Engineering Owner | RC-04/05 aligned to RC-01 timestamp |
| VERCEL-STAGING-LOGS-WINDOW-MATCH-001 | Logs | Vercel | `VERCEL-STAGING-LOGS-WINDOW-MATCH-CHECKOUT-EXPIRED-001.png` | Request IDs, env | **PENDING CAPTURE** | Logs for exact Stripe attempt window | Root cause if CL-E | Engineering Owner | RC-04 |
| VERCEL-STAGING-LOGS-SEARCH-VARIANTS-001 | Logs | Vercel | `VERCEL-STAGING-LOGS-SEARCH-VARIANTS-CHECKOUT-EXPIRED-001.png` | PII, env | **PENDING CAPTURE** | VC-SV-01…05 search results | Prod health | Engineering Owner | RC-05 |
| VERCEL-STAGING-DEPLOYMENT-STATE-001 | Deploy | Vercel | PNG: deployment list + SHA at failure time | Tokens | **PENDING CAPTURE** | Deploy version during incident | Code defect without review | SRE / Operations Owner | Match SHA to failure UTC |
| VERCEL-STAGING-ROUTE-HEALTH-001 | Health | Vercel / synthetic | PNG or note: health/ready checks | N/A | **PENDING CAPTURE** | Platform reachable | Webhook handler logic | SRE / Operations Owner | Optional synthetic note |
| WEBHOOK-TIMEOUT-ROOT-CAUSE-NOTES-001 | Analysis | Ap786 | Completed [template](./WEBHOOK_TIMEOUT_ROOT_CAUSE_REVIEW_TEMPLATE_2026_05_22.md) | No secrets | **PENDING EVIDENCE** | Evidence-backed conclusions | Fix validation | Engineering Owner | After SD/VC captures |
| WEBHOOK-FAST-ACK-REQUIREMENT-REVIEW-001 | Design review | Code/docs (read-only) | Markdown review notes | N/A | **PENDING EVIDENCE** | ACK pattern documented | Prod compliance | Engineering Owner | No code change in this task |
| WEBHOOK-IDEMPOTENCY-REVIEW-001 | Design review | Ap786 L-4/L-5 + logs | Markdown cross-ref | Event IDs | **PENDING EVIDENCE** | Idempotency expectations | Post-timeout retry behavior | Payments Owner | Correlate with delivery attempts |
| WEBHOOK-NO-PAY-NO-SERVICE-REVIEW-001 | Safety review | Ap786 + staging logs | Markdown notes | PII | **PENDING EVIDENCE** | Gate behavior during missed WH | Prod no-pay-no-service | Security Owner | Staging scope only |

---

## Summary counts

| Status | Count |
|--------|-------|
| **EVIDENCE FILED (redacted PNG)** | 4 |
| **PARTIAL EVIDENCE FILED** | 1 (Vercel no-match — not invocation proof) |
| **PENDING CAPTURE** | 5 RC target PNGs + 6 manifest rows |
| **CAPTURE PLAN** | [CHECKOUT_SESSION_EXPIRED_TIMEOUT_ROOT_CAUSE_CAPTURE_PLAN_2026_05_22.md](./CHECKOUT_SESSION_EXPIRED_TIMEOUT_ROOT_CAUSE_CAPTURE_PLAN_2026_05_22.md) — **CREATED** |
| **PENDING EVIDENCE** | 4 |

---

## Filing procedure

1. Save redacted file using naming convention in [folder README](./README.md).
2. Update **Current status** on this row to **EVIDENCE FILED**.
3. Update [blocker register](../../ZORA_WALAT_STRIPE_WEBHOOK_FAILURE_BLOCKER_REGISTER_2026_05_22.md) STRIPE-WH-007 when SD + VC minimum set filed.
4. Do **not** mark webhook **FIXED** without separate Track H evidence.

---

*Manifest · capture plan CREATED · 5 RC PNGs PENDING · root cause NOT confirmed*
