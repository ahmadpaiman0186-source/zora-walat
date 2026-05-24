# STR-02 — 404 Safe Diagnostic Plan

**Date:** 2026-05-24
**Parent:** [root-cause investigation](./ZORA_WALAT_STR02_404_ROUTING_ROOT_CAUSE_INVESTIGATION_2026_05_24.md) · [endpoint audit](./ZORA_WALAT_STR02_404_ENDPOINT_MAPPING_AUDIT_PLAN_2026_05_24.md)

**Policy:** Read-only diagnostics only in this pack. **No Resend. No deploy. No env edit. No API mutation.**

---

## 1. Diagnostic phases

### Phase 0 — Safety gate

| Step | Action | Forbidden |
|------|--------|-----------|
| 0.1 | Confirm no second Stripe Resend without new approval | Click Resend |
| 0.2 | Confirm sandbox/test-mode only | Live mode |
| 0.3 | Confirm staging host only | Production endpoint |

---

### Phase 1 — Static route inventory (repository)

| Step | Inspect | Path / artifact |
|------|---------|-----------------|
| 1.1 | Route files | `server/api/index.mjs` |
| 1.2 | Slim webhook handler | `server/api/slimStripeWebhookHandler.mjs` |
| 1.3 | Express webhook mount | `server/src/app.js`, `server/src/routes/stripeWebhook.routes.js` |
| 1.4 | Vercel API config | `server/vercel.json` |
| 1.5 | Monorepo root Vercel config | Root `vercel.json` |
| 1.6 | Deploy guard script | `server/scripts/assert-vercel-api-deploy-root.mjs` |
| 1.7 | Package identity | `server/package.json` (`zora-walat-api`) |

**Output:** [Endpoint mapping audit plan](./ZORA_WALAT_STR02_404_ENDPOINT_MAPPING_AUDIT_PLAN_2026_05_24.md) §2

---

### Phase 2 — Stripe ↔ repo path comparison

| Step | Compare | Expected |
|------|---------|----------|
| 2.1 | Stripe destination URL path | `/webhooks/stripe` |
| 2.2 | Repo slim entry pathname check | `/webhooks/stripe` (exact) |
| 2.3 | Alternate paths in repo | `/api/webhooks/stripe` — grep |
| 2.4 | HTTP method | POST |

---

### Phase 3 — Vercel project / deployment (read-only dashboard)

| Step | Check | Discriminates |
|------|-------|---------------|
| 3.1 | Project name = `zora-walat-api-staging` | H7 |
| 3.2 | Root Directory = `server` (not repo root) | H2 |
| 3.3 | Active deployment SHA vs DEP-01 / STR-02 window | H10 |
| 3.4 | Deployment build output includes `api/index.mjs` | H4 |
| 3.5 | Domain `zora-walat-api-staging.vercel.app` → this project | H7 |
| 3.6 | No accidental link to Next.js root project | H2 |

**No deploy. No env var changes.**

---

### Phase 4 — Log correlation (read-only)

| Step | Search | Window |
|------|--------|--------|
| 4.1 | `"/webhooks/stripe"` | ±30 min STR-02 Resend (~May 24, 2026 2:09 PM) |
| 4.2 | `stripe` | Same window |
| 4.3 | Edge / request logs (if available) | Same window |
| 4.4 | `[startup] phase=request_start route=` patterns | Same window |

**Already filed:** VRC-01, VRC-02 — **NO MATCH**

**LOG-01…LOG-04:** **NOT CORRELATED / NOT CAPTURED**

---

### Phase 5 — Hypothesis scoring

Update [hypothesis matrix](./ZORA_WALAT_STR02_404_VERCEL_ROUTING_HYPOTHESIS_MATRIX_2026_05_24.md) with evidence from Phases 1–4.

**Rule:** No hypothesis → **CONFIRMED** without multiple corroborating read-only signals.

---

## 2. Explicitly forbidden diagnostics

| Action | Reason |
|--------|--------|
| Second Stripe Resend | STR-02 already executed once |
| Send test events | Out of scope |
| Deploy to staging/production | May mask or alter state |
| Edit `.env` / Vercel env vars | Gated separately |
| DB / payment / order mutation | Money-path safety |
| Claim fix proven | Evidence insufficient |

---

## 3. Future code-fix branch (name only — do not create)

```text
fix/str02-404-webhook-routing-staging-2026-05-24
```

Requires separate implementation approval. Diagnostics in this pack **do not** authorize branch creation.

---

## 4. Verdict

| Item | Status |
|------|--------|
| Diagnostic plan | **FILED** |
| Diagnostics executed (Phases 1 static) | **PARTIAL** — repo inventory complete |
| Phases 3–4 (Vercel live read-only) | **PENDING OPERATOR** |
| Root cause | **NOT CONFIRMED** |
| Fix | **NOT IMPLEMENTED** |

---

*Safe diagnostic plan · read-only · no Resend · no deploy*
