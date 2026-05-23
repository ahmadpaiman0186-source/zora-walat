# Vercel Lifecycle Log Proof — Operator Checklist (PR #55)

**Date:** 2026-05-23
**Status:** **PENDING OPERATOR EXECUTION**
**Evidence IDs:** LOG-01 … LOG-05 (LOG-05 conditional)

---

## 1. Purpose

Prove PR #55 **observability** on staging: structured Stripe webhook lifecycle logs appear in Vercel within ±15 minutes of STR-02 replay attempt.

**Code reference (main):** `server/src/lib/stripeWebhookLifecycleLog.js` · slim path `server/api/slimStripeWebhookCheckoutExpired.mjs`

**Agent must not** query Vercel APIs or fabricate log screenshots.

---

## 2. Lifecycle events to capture

| Order | Log event | Evidence file | Status |
|-------|-----------|---------------|--------|
| 1 | `webhook_received` | `VERCEL-STAGING-LOG-WEBHOOK-RECEIVED-001.png` | **PENDING CAPTURE** |
| 2 | `signature_verified` | `VERCEL-STAGING-LOG-SIGNATURE-VERIFIED-001.png` | **PENDING CAPTURE** |
| 3 | `event_persisted` | `VERCEL-STAGING-LOG-EVENT-PERSISTED-001.png` | **PENDING CAPTURE** |
| 4 | `ack_returned` | `VERCEL-STAGING-LOG-ACK-RETURNED-001.png` | **PENDING CAPTURE** |
| 5 (optional) | `duplicate_event_blocked` | `VERCEL-STAGING-LOG-DUPLICATE-BLOCKED-001.png` | **PENDING CAPTURE** |

**Post-ack processing** (`processing_started` / `processing_completed`) may appear in logs but are **not** required for G-02 minimum proof set in this manifest.

---

## 3. Preconditions

| # | Check | Status |
|---|-------|--------|
| L-01 | STR-02 replay executed; UTC timestamp recorded | **PENDING OPERATOR** |
| L-02 | Vercel staging project logs accessible | **PENDING OPERATOR** |
| L-03 | Log retention covers replay window (see [retention note](../stripe-webhook-failure-2026-05-22/VERCEL-STAGING-LOGS-RETENTION-LIMITATION-001.png)) | **PENDING OPERATOR** |

---

## 4. Operator steps

| Step | Action | Notes |
|------|--------|-------|
| 1 | Vercel → **staging** project → **Logs** | Not production |
| 2 | Set time window to ±to replay UTC ±15 min** | Match STR-02 timestamp |
| 3 | Search `webhook_received` (or filter route `/webhooks/stripe`) | Capture LOG-01 |
| 4 | Search `signature_verified` in same window | Capture LOG-02 |
| 5 | Search `event_persisted` | Capture LOG-03 |
| 6 | Search `ack_returned` | Capture LOG-04 |
| 7 | If duplicate replay performed → search `duplicate_event_blocked` | Capture LOG-05 |
| 8 | Save PNGs to this folder; update [EVIDENCE_MANIFEST.md](./EVIDENCE_MANIFEST.md) | No PASS without files |

---

## 5. Correlation requirements

| Rule | Requirement |
|------|-------------|
| Time alignment | All LOG-01…04 from **same** replay attempt window |
| Route | Staging `/webhooks/stripe` only |
| Path hint | Expired slim path may show `path: slim` on `webhook_received` |
| Missing logs | If any of LOG-01…04 absent → staging replay **FAIL** (do not claim fix proven) |

---

## 6. Redaction rules

| Field | Rule |
|-------|------|
| Env values | Never visible |
| `STRIPE_WEBHOOK_SECRET` | Never |
| Full Stripe event ids | Redact to `REDACTED_EVT_*` if shown |
| Request IDs | Optional redact |

---

## 7. Exit criteria

| # | Criterion | Status |
|---|-----------|--------|
| E-LOG-01 | LOG-01…LOG-04 filed and correlated | **PENDING CAPTURE** |
| E-LOG-02 | Event order matches §2 | **PENDING CAPTURE** |
| E-LOG-03 | LOG-05 filed or N/A attested | **PENDING CAPTURE** |

**Lifecycle log proof:** **NOT PASS**

---

## 8. Known limitations

| Limitation | Impact |
|------------|--------|
| May 19 historical logs | Prior investigation **BLOCKED / INCONCLUSIVE** — use **fresh** replay only |
| Cold start noise | Document if ack still 200 but log order delayed |
| Log sampling | If events missing, escalate — do not infer PASS |

---

*Vercel lifecycle log checklist · operator-only · PENDING CAPTURE*
