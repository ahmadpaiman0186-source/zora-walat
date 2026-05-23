# checkout.session.expired Timeout — Root Cause Evidence Capture Plan

**Date:** 2026-05-22
**Mode:** **READ-ONLY ONLY** — planning and capture checklist; **no fix claim**
**Stripe mode:** Test mode / sandbox
**Endpoint:** `https://zora-walat-api-staging.vercel.app/webhooks/stripe`
**Parent:** [Evidence folder README](./README.md) · [Manifest](./STRIPE_VERCEL_READONLY_EVIDENCE_MANIFEST_2026_05_22.md) · [Root cause template](./WEBHOOK_TIMEOUT_ROOT_CAUSE_REVIEW_TEMPLATE_2026_05_22.md)

**Policy:** This plan defines **required read-only captures** to prove or disprove the root cause of **`checkout.session.expired`** webhook **timeout** failures. **Do not** fabricate screenshots. Mark all missing artifacts **PENDING CAPTURE**. Root cause remains **NOT CONFIRMED** until exit criteria in §8 are met.

**Prior evidence (PR #48, filed 2026-05-22):** Staging endpoint active; `charge.refunded` recovered with HTTP 200; Vercel broad search for `"/webhooks/stripe"` returned **no matching logs** in a selected timeline — **insufficient** to confirm or reject timeout root cause for `checkout.session.expired`.

---

## 1. Purpose

Correlate **one failed Stripe delivery attempt** for `checkout.session.expired` (timeout) with **Vercel staging logs in the same UTC window** so investigators can classify whether Vercel received no request, received but timed out, or route/function failed — without API calls, resend/replay, dashboard mutation, deploy, or code changes.

---

## 2. Forbidden actions (this plan)

| Action | Status |
|--------|--------|
| Stripe API calls | **FORBIDDEN** |
| Vercel API calls | **FORBIDDEN** |
| Webhook resend / replay | **FORBIDDEN** |
| Stripe/Vercel dashboard settings change | **FORBIDDEN** |
| Credential rotation | **FORBIDDEN** |
| Deploy / env edit | **FORBIDDEN** |
| Claim root cause **CONFIRMED** without §8 exit criteria | **FORBIDDEN** |
| Claim fix, QA PASS, production-ready, real-money-ready | **FORBIDDEN** |

---

## 3. Required Stripe captures (read-only, redacted PNG)

| # | Requirement | Target filename | Status | Redaction |
|---|-------------|-----------------|--------|-----------|
| **RC-01** | Failed **`checkout.session.expired`** delivery detail | `STRIPE-WH-DELIVERY-FAILED-CHECKOUT-SESSION-EXPIRED-TIMEOUT-001.png` | **EVIDENCE FILED (redacted)** | Event ID redacted |
| **RC-02** | **Error insight** / timeout detail | `STRIPE-WH-DELIVERY-FAILED-CHECKOUT-SESSION-EXPIRED-ERROR-INSIGHT-001.png` | **EVIDENCE FILED (redacted)** | Event ID redacted |
| **RC-03** | Failed deliveries list | `STRIPE-WH-DASHBOARD-EVENT-DELIVERIES-CHECKOUT-EXPIRED-FAILED-LIST-001.png` | **EVIDENCE FILED (redacted)** | Event IDs redacted |

### 3.1 Required fields to record from RC-01 (operator notes or redacted overlay)

Capture these **from the dashboard** into the PNG or a companion `.md` attestation — values **not** committed unless redacted:

| Field | Example placeholder in git | Required |
|-------|----------------------------|----------|
| Attempt timestamp (UTC) | `REDACTED_UTC_ATTEMPT_TIME` or visible in PNG only | **Yes** |
| Event type | `checkout.session.expired` | **Yes** |
| Delivery status | e.g. Failed / Timed out | **Yes** |
| Event ID | `REDACTED_STRIPE_EVENT_ID` | **Yes** (redacted) |
| Endpoint URL | Staging URL (already known) | **Yes** |
| Stripe-reported failure class | Timeout (not 401 unless shown) | **Yes** |

**Rule:** Do **not** invent timestamps or event IDs. If not visible after redaction, status stays **PENDING CAPTURE**.

---

## 4. Required Vercel captures (same UTC window as RC-01)

After RC-01 attempt timestamp is known, set Vercel log window:

| Boundary | Rule |
|----------|------|
| **Anchor** | Stripe attempt timestamp from RC-01 |
| **Window start** | Anchor − 15 minutes (minimum) |
| **Window end** | Anchor + 15 minutes (minimum) |
| **Extended** | ±2 hours if no rows — document widened window in filename notes |

| # | Requirement | Target filename | Status |
|---|-------------|-----------------|--------|
| **RC-04** | Log search results for **exact window** aligned to RC-01 attempt | `VERCEL-STAGING-LOGS-WINDOW-MATCH-CHECKOUT-EXPIRED-001.png` | **PENDING CAPTURE** |
| **RC-05** | Search variants composite | `VERCEL-STAGING-LOGS-SEARCH-VARIANTS-CHECKOUT-EXPIRED-001.png` | **PENDING CAPTURE** |
| **RC-06** | Vercel Observability Plus / **30-day retention** limitation | `VERCEL-STAGING-LOGS-RETENTION-LIMITATION-001.png` | **EVIDENCE FILED (redacted)** |

**Ingest note (2026-05-22 pass B):** Telegram batch `18-31-37` filed RC-01…03 and RC-06. RC-04/05 **BLOCKED** by retention.

### 4.1 Vercel search variants (all within RC-04 window)

Run **read-only** log UI searches; screenshot each result (including **zero rows**):

| Variant ID | Search / filter | Purpose |
|------------|-----------------|---------|
| **VC-SV-01** | `/webhooks/stripe` | Route path match |
| **VC-SV-02** | `POST` (method filter if available) | HTTP method correlation |
| **VC-SV-03** | `checkout.session.expired` | Event type in logs (if logged) |
| **VC-SV-04** | `stripe` | Broader handler/logger tag |
| **VC-SV-05** | Status / error filters (5xx, timeout, `504`, `408`, `ECONN`, platform timeout strings — as available) | Failure class in Vercel |

**Redaction:** Request IDs → `REDACTED_VERCEL_REQUEST_ID`; no env values; no PII.

---

## 5. Evidence classification (prove or disprove)

After RC-01…RC-05 filed, assign **one primary classification** (can be **INCONCLUSIVE**):

| Class ID | Meaning | Typical Stripe signal | Typical Vercel signal | Supports hypothesis |
|--------|---------|----------------------|----------------------|---------------------|
| **CL-A** | **No request received** — Vercel shows no matching invocation in window | Timeout / no HTTP response | No rows for VC-SV-01…05 | **H1**, possibly **H6** |
| **CL-B** | **Request received; function timed out** | Timeout | Duration at/near limit; timeout error in logs | **H2**, **H3**, **H5** |
| **CL-C** | **Route/function failed fast** (4xx/5xx before timeout) | Timeout or error (Stripe may still say timeout) | 4xx/5xx, stack trace (redacted) | **H4**, **H5** |
| **CL-D** | **Signature / env issue** | Non-timeout error if visible | 401/403 or verification log line | **H4** |
| **CL-E** | **Inconclusive** — log retention/window gap | Timeout on Stripe | No rows despite widened window | **H6** |

**Current classification:** **CL-E plausible** — RC-06 filed; RC-04/05 **BLOCKED** by retention; **NOT ASSIGNED** as confirmed root cause.

---

## 6. Root-cause hypothesis matrix

| ID | Hypothesis | Confirmed? | Evidence to confirm | Evidence to disprove | Status |
|----|------------|------------|---------------------|----------------------|--------|
| **H1** | Vercel route **not invoked** / no matching log for attempt window | **NOT CONFIRMED** | CL-A + RC-04/05 zero rows across variants after widened window | CL-B or CL-C with matching invocation row | **PENDING EVIDENCE** |
| **H2** | Function **cold start** or **platform timeout** | **NOT CONFIRMED** | CL-B + duration/cold-start indicators in RC-04/05 | CL-A or fast 4xx/5xx (CL-C) | **PENDING EVIDENCE** |
| **H3** | Webhook handler **blocked before ack** (slow sync work) | **NOT CONFIRMED** | CL-B + log lines showing long handler phase (redacted) | Fast 2xx in logs; CL-A | **PENDING EVIDENCE** |
| **H4** | **Signature verification** or **env** misconfiguration | **NOT CONFIRMED** | CL-D + RC-02 error insight ≠ pure timeout | RC-02 shows timeout only; no 401 in Vercel | **NOT PROVEN** |
| **H5** | **`checkout.session.expired`** handler path slow or failing | **NOT CONFIRMED** | CL-B/C + event type in logs; RC-01 scoped to this type | Other event types timeout equally; CL-A | **PENDING EVIDENCE** |
| **H6** | **Vercel log retention / window limitation** (false negative) | **NOT CONFIRMED** | RC-06 retention PNG; CL-E; current no-match filed | Invocation in May 19 window | **PARTIAL EVIDENCE** — supports H6; not root cause |

**Rule:** Set **Confirmed?** to **YES** for at most **one** primary hypothesis only when §8 exit criteria met. Until then: **NOT CONFIRMED** for all.

---

## 7. Capture procedure (human operator)

1. Stripe Dashboard (test mode) → Webhooks → staging endpoint → locate failed **`checkout.session.expired`** delivery → capture **RC-01**, **RC-02** (and **RC-03** if useful).
2. Note attempt **UTC timestamp** (redact in git if stored separately).
3. Vercel → `zora-walat-api-staging` → Logs → set window per §4 → run **VC-SV-01…05** → capture **RC-04**, **RC-05**.
4. Assign classification **CL-A…E** in [root cause template](./WEBHOOK_TIMEOUT_ROOT_CAUSE_REVIEW_TEMPLATE_2026_05_22.md) — **only** after files exist.
5. Update [manifest](./STRIPE_VERCEL_READONLY_EVIDENCE_MANIFEST_2026_05_22.md) row status → **EVIDENCE FILED** per file.
6. **Do not** resend webhook, edit endpoint, redeploy, or rotate secrets.

---

## 8. Exit criteria — root cause may be marked CONFIRMED

All must be satisfied **before** any doc row states root cause **CONFIRMED**:

| # | Criterion | Status |
|---|-----------|--------|
| **EC-01** | **RC-01** and **RC-02** filed (redacted PNG) | **MET** |
| **EC-02** | **RC-04** filed with window **explicitly aligned** to RC-01 attempt timestamp | **BLOCKED / INCONCLUSIVE** — retention |
| **EC-03** | **RC-05** or equivalent shows **all five** search variants (VC-SV-01…05) | **PENDING CAPTURE** |
| **EC-04** | Primary classification **CL-A…E** assigned with artifact links | **NOT ASSIGNED** |
| **EC-05** | Exactly **one** hypothesis **H1…H6** marked **CONFIRMED** with linked evidence; others **NOT CONFIRMED** or **DISPROVEN** | **NOT MET** |
| **EC-06** | Engineering Owner + Payments Owner review note (placeholder role) recorded in Ap786 | **PENDING REVIEW** |
| **EC-07** | **No** claim that production, live-money, pilot, or global webhook health is proven | **REQUIRED** — remains **NO-GO** until separate gates |

**Until EC-01…EC-07 met:** status remains **`checkout.session.expired` timeout root cause NOT CONFIRMED**.

---

## 9. Production / live-money NO-GO boundary

| Claim | Allowed now? |
|-------|--------------|
| Staging timeout root cause **CONFIRMED** | **No** — EC not met |
| Webhook **fixed** globally | **No** |
| Full staging webhook health **proven** | **No** — partial `charge.refunded` recovery only |
| Production webhook health **proven** | **No** |
| QA PASS / production-ready / real-money-ready / pilot GO | **No** |
| Track H code/deploy fix | **No** — requires explicit approval after root cause documented |

**Verdict:** Production, live-money, and pilot remain **NO-GO**. This plan is **evidence capture only**.

---

## 10. Artifact summary

| Artifact | Type | Status |
|----------|------|--------|
| `STRIPE-WH-DELIVERY-FAILED-CHECKOUT-SESSION-EXPIRED-TIMEOUT-001.png` | Stripe delivery detail | **EVIDENCE FILED (redacted)** |
| `STRIPE-WH-DELIVERY-FAILED-CHECKOUT-SESSION-EXPIRED-ERROR-INSIGHT-001.png` | Stripe error insight | **EVIDENCE FILED (redacted)** |
| `STRIPE-WH-DASHBOARD-EVENT-DELIVERIES-CHECKOUT-EXPIRED-FAILED-LIST-001.png` | Stripe failed deliveries list | **EVIDENCE FILED (redacted)** |
| `VERCEL-STAGING-LOGS-RETENTION-LIMITATION-001.png` | Vercel retention limit | **EVIDENCE FILED (redacted)** |
| `VERCEL-STAGING-LOGS-RETENTION-LIMITATION-002.png` | Vercel retention (alternate) | **EVIDENCE FILED (redacted)** |
| `VERCEL-STAGING-LOGS-WINDOW-MATCH-CHECKOUT-EXPIRED-001.png` | Vercel window-aligned logs | **PENDING CAPTURE** |
| `VERCEL-STAGING-LOGS-SEARCH-VARIANTS-CHECKOUT-EXPIRED-001.png` | Vercel search variants | **PENDING CAPTURE** |

---

*Capture plan · read-only · root cause NOT confirmed · not production-ready*
