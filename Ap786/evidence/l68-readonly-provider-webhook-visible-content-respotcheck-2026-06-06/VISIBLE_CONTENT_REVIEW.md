# L-68 — Visible content review (PNG artifacts)

**Date:** 2026-06-06
**Method:** Read-only visible-content inspection of operator-captured PNGs
**Scope:** Photo-based review only — not forensic pixel audit

---

## 1. PROVIDER-CATALOG-READONLY-001-redacted.png

| Field | Finding |
|-------|---------|
| Visible subject | Reloadly dashboard — Mobile top-up page |
| URL visible | `dashboard.reloadly.com/topup/mobile-topup` |
| Sandbox indicator | **Sandbox toggle ON** (red) |
| API keys / credentials | **Not visible** |
| Sensitive PII | Placeholder phone only (`201-555-0123`) |
| Maps to provider catalog path | **YES** — top-up catalog UI in sandbox |
| Visible-content result | **PASS** |
| Proof ceiling | **CAPTURED / PARTIAL** — sandbox dashboard, not prod observability metrics |

---

## 2. PROVIDER-ROUTE-READONLY-001-redacted.png

| Field | Finding |
|-------|---------|
| Visible subject | Reloadly developer docs — Airtime Quickstart |
| URL visible | `developers.reloadly.com/airtime/quickstart` |
| Content | Integration setup steps (account, test wallet, API keys retrieval instructions) |
| Runtime route observability | **Not shown** — documentation page only |
| API keys / secrets | **Not visible** (instructions reference keys, none displayed) |
| Maps to provider route observability | **WEAK** — docs ≠ live route/metrics surface |
| Visible-content result | **PARTIAL** |
| Proof ceiling | **CAPTURED / PARTIAL** — reference material only |

---

## 3. PROVIDER-SANDBOX-BOUNDARY-READONLY-001-redacted.png

| Field | Finding |
|-------|---------|
| Visible subject | Reloadly dashboard — Mobile top-up with balance panel |
| Sandbox indicator | **Sandbox toggle ON** prominently |
| Test boundary | Clear sandbox/test context |
| Wallet balance | `$971.2` visible (sandbox test wallet) |
| API keys / credentials | **Not visible** |
| Maps to sandbox boundary | **YES** |
| Visible-content result | **PASS** |
| Redaction note | Sandbox balance visible — acceptable in sandbox boundary context |
| Proof ceiling | **CAPTURED / PARTIAL** — sandbox only |

---

## 4. STRIPE-WEBHOOK-DESTINATION-READONLY-001-redacted.png

| Field | Finding |
|-------|---------|
| Visible subject | Stripe Workbench — Webhooks — Event destinations |
| Environment | **Sandbox** banner: "No real transactions will be processed" |
| Destination | `zora-walat-api-staging` → `https://zora-walat-api-staging.vercel.app/webhooks/stripe` |
| Status | **Active** |
| Signing secrets / whsec | **Not visible** |
| Account identifier | `acct_1TG3YOJ7h0ocEb8G` prefix visible in browser URL |
| Maps to webhook destination | **YES** — staging endpoint configured |
| Visible-content result | **PASS with PARTIAL redaction note** |
| Proof ceiling | **CAPTURED / PARTIAL** — test/sandbox destination only |

---

## 5. WEBHOOK-EVENT-READONLY-001-redacted.png

| Field | Finding |
|-------|---------|
| Visible subject | Stripe Workbench — Events |
| Environment | **Sandbox** |
| Event types visible | `checkout.session.expired`, `price.created`, `product.created` |
| Delivery outcome | **200 OK** to `zora-walat-api-stagin...` staging endpoint |
| Event IDs | **White-box redaction** applied on selected fields |
| Raw webhook body | **Not visible** |
| Resend control | Visible in UI — **not used** (attestation confirms no replay) |
| Maps to webhook/payment observability | **YES** — enum outcomes + delivery status |
| Visible-content result | **PASS** |
| Proof ceiling | **CAPTURED / PARTIAL** — historical sandbox events, not prod |

---

## PNG summary

| Artifact | Visible PASS | Classification |
|----------|--------------|----------------|
| PROVIDER-CATALOG | **PASS** | CAPTURED / PARTIAL |
| PROVIDER-ROUTE | **PARTIAL** | CAPTURED / PARTIAL |
| PROVIDER-SANDBOX-BOUNDARY | **PASS** | CAPTURED / PARTIAL |
| STRIPE-WEBHOOK-DESTINATION | **PASS*** | CAPTURED / PARTIAL |
| WEBHOOK-EVENT | **PASS** | CAPTURED / PARTIAL |

\*Pass with visible `acct_` prefix in URL — see [REDACTION_REVIEW.md](./REDACTION_REVIEW.md).

**REDACTION_FAIL:** **NOT TRIGGERED** — no `whsec_*`, API keys, raw payloads, or card data observed.

---

*End of visible content review.*
