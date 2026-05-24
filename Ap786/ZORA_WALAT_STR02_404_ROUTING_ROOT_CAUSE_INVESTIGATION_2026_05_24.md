# STR-02 — 404 Routing Root-Cause Investigation

**Date:** 2026-05-24
**Type:** **Investigation pack only — NOT an execution record · NOT a fix**
**Parent:** [STR-02 evidence](./ZORA_WALAT_G02_STR02_EVIDENCE_CAPTURE_MATRIX_2026_05_24.md) · [PR #55 replay index](./ZORA_WALAT_STAGING_STRIPE_WEBHOOK_REPLAY_PROOF_PR55_2026_05_23.md)

**Policy:** Docs only. No code changes. No deploy. No Resend. No fix-proven claim.

---

## 1. Current state (post PR #66)

| Item | Status |
|------|--------|
| `main` | Clean and synced after PR #67 |
| PR #66 | STR-02 resend evidence (404 + Vercel no-match) |
| PR #67 | STR-02 404 routing/root-cause investigation pack **FILED** |
| Vercel read-only diagnostics pack | **SCAFFOLD FILED** — VRC-D01…D07 **PENDING CAPTURE** |
| STR-02 Resend | **EXECUTED ONCE** — sandbox/test-mode only |
| STR-02 result | **404 ERR / Not Found** |
| HTTP 200 | **NOT ACHIEVED** |
| LOG-01…LOG-04 | **NOT CORRELATED / NOT CAPTURED** |
| Vercel runtime logs | **NO MATCHING LOGS FOUND** (VRC-01, VRC-02) |
| G-02 staging replay | **FAILED / INCONCLUSIVE** |
| Root cause | **NOT CONFIRMED** |
| Fix | **NOT IMPLEMENTED** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

## 2. Failure mode summary

| Phase | Observed behavior | Evidence |
|-------|-------------------|----------|
| Pre-replay (May 19) | **3× Timed out** to staging URL | STR-01B |
| Post-Resend (May 24) | **404 ERR / Not Found** — **Retried manually** | STR-02B, STR-02C |
| Vercel correlation | No runtime logs for `"/webhooks/stripe"` or `stripe` | VRC-01, VRC-02 |

**Interpretation (conservative):** Failure mode **changed** from timeout to **404 with no Vercel runtime log match**. This pattern is consistent with a **routing / deployment / endpoint mismatch** hypothesis — **not confirmed** without further read-only and gated diagnostics.

**Stripe endpoint (documented):** `https://zora-walat-api-staging.vercel.app/webhooks/stripe`

---

## 3. Investigation pack map

| Doc | Role |
|-----|------|
| [Endpoint mapping audit plan](./ZORA_WALAT_STR02_404_ENDPOINT_MAPPING_AUDIT_PLAN_2026_05_24.md) | Static route inventory + path comparison |
| [Vercel routing hypothesis matrix](./ZORA_WALAT_STR02_404_VERCEL_ROUTING_HYPOTHESIS_MATRIX_2026_05_24.md) | H1…H10 status |
| [Safe diagnostic plan](./ZORA_WALAT_STR02_404_SAFE_DIAGNOSTIC_PLAN_2026_05_24.md) | Read-only checks — no mutation |
| [Fix option matrix](./ZORA_WALAT_STR02_404_FIX_OPTION_MATRIX_2026_05_24.md) | Options — **NOT IMPLEMENTED** |
| [NO-GO reconfirmation](./ZORA_WALAT_STR02_404_NO_GO_RECONFIRMATION_2026_05_24.md) | Launch gates |
| [Vercel read-only diagnostics](./ZORA_WALAT_STR02_VERCEL_READONLY_ROUTING_DIAGNOSTICS_2026_05_24.md) | Dashboard evidence pack — captures **PENDING** |

**Evidence folder:** [str02-vercel-readonly-routing-diagnostics-2026-05-24/](./evidence/str02-vercel-readonly-routing-diagnostics-2026-05-24/README.md)

---

## 4. Static repository facts (read-only inventory)

**No runtime verification performed in this pack.** Facts from repository structure at investigation authoring time:

| Fact | Location | Relevance |
|------|----------|-----------|
| API Vercel project expects `server/` root | `server/scripts/assert-vercel-api-deploy-root.mjs` | Deploy from monorepo root ships **Next.js** — guard fails if `framework: nextjs` |
| API catch-all route | `server/vercel.json` → `"dest": "/api/index.mjs"` | All paths routed to single serverless entry |
| Slim webhook fast path | `server/api/index.mjs` — `POST` + pathname `=== '/webhooks/stripe'` | Handler exists **in repo** for exact path |
| Express webhook mount | `server/src/app.js` — `app.use('/webhooks/stripe', …)` | Full handler behind serverless replay |
| Monorepo root `vercel.json` | Root `vercel.json` — `"framework": "nextjs"` | **Different** project config — H2/H3 candidate |

**Key tension:** Repository **defines** `POST /webhooks/stripe` in `server/api/index.mjs`, but STR-02 observed **404** and **no Vercel runtime logs** — suggests request may not reach that handler on the deployed staging project (H1, H2, H7, H9, H10).

---

## 5. Hypothesis index (H1…H10)

Full matrix: [Vercel routing hypothesis matrix](./ZORA_WALAT_STR02_404_VERCEL_ROUTING_HYPOTHESIS_MATRIX_2026_05_24.md)

| ID | Hypothesis | Initial status |
|----|------------|----------------|
| H1 | Staging deployment does not expose `POST /webhooks/stripe` | **OPEN / PLAUSIBLE** |
| H2 | Vercel project routes to wrong app/package/output | **OPEN / PLAUSIBLE** |
| H3 | `vercel.json` / rewrite mismatch → 404 before handler | **OPEN / PLAUSIBLE** |
| H4 | Serverless function not in deployed output | **OPEN** |
| H5 | HTTP method mismatch (GET vs POST) | **OPEN / LOWER** — Stripe sends POST |
| H6 | Path mismatch `/api/webhooks/stripe` vs `/webhooks/stripe` | **OPEN** |
| H7 | Staging domain → deployment without webhook route | **OPEN / PLAUSIBLE** |
| H8 | Middleware/static intercept before handler | **OPEN** |
| H9 | Edge/static 404; runtime logs empty/filtered | **OPEN / PLAUSIBLE** |
| H10 | Old deployment or wrong alias targeted | **OPEN** |

**Root cause:** **NOT CONFIRMED**

---

## 6. Future implementation branch (name only — do not create)

```text
fix/str02-404-webhook-routing-staging-2026-05-24
```

Creation requires separate approval. **Not created in this pack.**

---

## 7. Verdict

| Item | Status |
|------|--------|
| STR-02 result | **404 ERR / Not Found** |
| HTTP 200 | **NOT ACHIEVED** |
| LOG-01…LOG-04 | **NOT CORRELATED / NOT CAPTURED** |
| Root cause | **NOT CONFIRMED** |
| Fix | **NOT IMPLEMENTED** |
| Staging replay | **FAILED / INCONCLUSIVE** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*STR-02 404 investigation · docs only · no Resend · no deploy · no fix claim*
