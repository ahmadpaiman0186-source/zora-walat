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
| [VERCEL-STAGING-LOGS-WEBHOOK-STRIPE-NO-MATCH-CURRENT-001.png](./VERCEL-STAGING-LOGS-WEBHOOK-STRIPE-NO-MATCH-CURRENT-001.png) | Staging | 2026-05-22 | **EVIDENCE FILED (redacted)** | Current-window search → **no matching logs** | May 19 failure window |
| [STRIPE-WH-DASHBOARD-EVENT-DELIVERIES-CHECKOUT-EXPIRED-FAILED-LIST-001.png](./STRIPE-WH-DASHBOARD-EVENT-DELIVERIES-CHECKOUT-EXPIRED-FAILED-LIST-001.png) | Test / sandbox | 2026-05-22 | **EVIDENCE FILED (redacted)** | `checkout.session.expired` **Failed** on May 19 2026 (incl. 2:10:08 PM) | Root cause |
| [STRIPE-WH-DELIVERY-FAILED-CHECKOUT-SESSION-EXPIRED-TIMEOUT-001.png](./STRIPE-WH-DELIVERY-FAILED-CHECKOUT-SESSION-EXPIRED-TIMEOUT-001.png) | Test / sandbox | 2026-05-22 | **EVIDENCE FILED (redacted)** | Failed delivery detail for `checkout.session.expired` | Vercel-side cause |
| [STRIPE-WH-DELIVERY-FAILED-CHECKOUT-SESSION-EXPIRED-ERROR-INSIGHT-001.png](./STRIPE-WH-DELIVERY-FAILED-CHECKOUT-SESSION-EXPIRED-ERROR-INSIGHT-001.png) | Test / sandbox | 2026-05-22 | **EVIDENCE FILED (redacted)** | Error insight — timed out error | Fix validation |
| [VERCEL-STAGING-LOGS-RETENTION-LIMITATION-001.png](./VERCEL-STAGING-LOGS-RETENTION-LIMITATION-001.png) | Staging | 2026-05-22 | **EVIDENCE FILED (redacted)** | **30 days** retention requires Observability Plus | May 19 logs without upgrade |
| [VERCEL-STAGING-LOGS-RETENTION-LIMITATION-002.png](./VERCEL-STAGING-LOGS-RETENTION-LIMITATION-002.png) | Staging | 2026-05-22 | **EVIDENCE FILED (redacted)** | Timeline filter — Observability Plus for >24h | Alternate retention proof |

**Still PENDING CAPTURE:** RC-04/05 May 19 window-aligned Vercel logs — **BLOCKED / INCONCLUSIVE** (retention on Hobby tier).

---

## Artifact inventory

| Artifact ID | Evidence type | Source system | Required screenshot/file | Redaction required | Current status | What it proves | What it does NOT prove | Required reviewer | Next action |
|-------------|---------------|---------------|--------------------------|-------------------|----------------|----------------|------------------------|-------------------|-------------|
| STRIPE-WH-EMAIL-REDacted-001 | Email summary | Stripe notification | Redacted email excerpt or operator attestation `.md` | Account ID, message ID | **PENDING CAPTURE** | Test-mode delivery failures reported | Root cause; prod impact | Payments Owner | Copy sanitized facts from addendum only |
| STRIPE-WH-DASHBOARD-ENDPOINT-READONLY-001 | Dashboard | Stripe (test mode) | [STRIPE-WH-DASHBOARD-ENDPOINT-OVERVIEW-001.png](./STRIPE-WH-DASHBOARD-ENDPOINT-OVERVIEW-001.png) | Account ID, webhook ID in URL | **EVIDENCE FILED (redacted)** | Endpoint registered to staging URL | Handler performance; fix; prod | Payments Owner | — |
| STRIPE-WH-DASHBOARD-DELIVERY-ATTEMPTS-001 | Dashboard | Stripe (test mode) | [STRIPE-WH-DASHBOARD-EVENT-DELIVERIES-CHECKOUT-EXPIRED-FAILED-LIST-001.png](./STRIPE-WH-DASHBOARD-EVENT-DELIVERIES-CHECKOUT-EXPIRED-FAILED-LIST-001.png) | Event IDs redact | **EVIDENCE FILED (redacted)** | Failed `checkout.session.expired` rows | Root cause | Payments Owner | — |
| STRIPE-WH-DASHBOARD-ERROR-SUMMARY-001 | Dashboard | Stripe (test mode) | [STRIPE-WH-DELIVERY-FAILED-CHECKOUT-SESSION-EXPIRED-ERROR-INSIGHT-001.png](./STRIPE-WH-DELIVERY-FAILED-CHECKOUT-SESSION-EXPIRED-ERROR-INSIGHT-001.png) | No secrets | **EVIDENCE FILED (redacted)** | Error insight / timed out | HTTP from origin | Payments Owner | — |
| STRIPE-WH-DELIVERY-FAILED-CHECKOUT-EXPIRED-001 | Dashboard | Stripe (test mode) | [STRIPE-WH-DELIVERY-FAILED-CHECKOUT-SESSION-EXPIRED-TIMEOUT-001.png](./STRIPE-WH-DELIVERY-FAILED-CHECKOUT-SESSION-EXPIRED-TIMEOUT-001.png) | Event ID | **EVIDENCE FILED (redacted)** | Failed delivery detail | Root cause alone | Payments Owner | — |
| VERCEL-STAGING-FUNCTION-LOGS-001 | Logs | Vercel | NO-MATCH + retention PNGs | PII | **PARTIAL EVIDENCE FILED** | No-match + retention limit filed | May 19 invocation | Engineering Owner | RC-04/05 blocked |
| VERCEL-STAGING-LOGS-RETENTION-001 | Logs | Vercel | [VERCEL-STAGING-LOGS-RETENTION-LIMITATION-001.png](./VERCEL-STAGING-LOGS-RETENTION-LIMITATION-001.png) | Account IDs | **EVIDENCE FILED (redacted)** | 30-day retention / Observability Plus | May 19 logs | Engineering Owner | — |
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
| **EVIDENCE FILED (redacted PNG)** | 9 |
| **PARTIAL EVIDENCE FILED** | 1 (Vercel — no May 19 window logs) |
| **PENDING CAPTURE** | RC-04/05 window-aligned logs (blocked by retention) |
| **PENDING EVIDENCE** | 4 |

---

## Filing procedure

1. Save redacted file using naming convention in [folder README](./README.md).
2. Update **Current status** on this row to **EVIDENCE FILED**.
3. Update [blocker register](../../ZORA_WALAT_STRIPE_WEBHOOK_FAILURE_BLOCKER_REGISTER_2026_05_22.md) STRIPE-WH-007 when SD + VC minimum set filed.
4. Do **not** mark webhook **FIXED** without separate Track H evidence.

---

*Manifest · 9 PNGs filed · May 19 Vercel correlation BLOCKED · root cause NOT confirmed*
