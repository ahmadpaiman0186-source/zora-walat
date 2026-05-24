# STR-02 — 404 Fix Option Matrix

**Date:** 2026-05-24
**Parent:** [root-cause investigation](./ZORA_WALAT_STR02_404_ROUTING_ROOT_CAUSE_INVESTIGATION_2026_05_24.md) · [hypothesis matrix](./ZORA_WALAT_STR02_404_VERCEL_ROUTING_HYPOTHESIS_MATRIX_2026_05_24.md)

**Policy:** Options documented only. **NOT IMPLEMENTED.** No branch created in this pack.

---

## 1. Fix options (contingent on confirmed root cause)

| ID | Option | Addresses | Requires | Risk | Status |
|----|--------|-----------|----------|------|--------|
| **F-01** | Ensure Vercel project Root Directory = `server/` | H2, H7 | Vercel settings verify + redeploy | Wrong project if mis-set | **NOT IMPLEMENTED** |
| **F-02** | Redeploy API from `server/` after deploy guard pass | H4, H10 | `npm run deploy:staging:guard` + approved deploy | Downtime window | **NOT IMPLEMENTED** |
| **F-03** | Add/fix `server/vercel.json` catch-all route | H3 | Code + deploy approval | Low if minimal | **NOT IMPLEMENTED** — repo already has catch-all |
| **F-04** | Add rewrite for `/webhooks/stripe` → `/api/index.mjs` | H3, H6 | Code + deploy | Route duplication | **NOT IMPLEMENTED** |
| **F-05** | Align Stripe URL to actual deployed path (if `/api/...`) | H6 | Stripe dashboard edit + evidence | Wrong if path guess | **NOT IMPLEMENTED** |
| **F-06** | Fix domain alias → correct deployment | H7, H10 | Vercel domains | Traffic misroute | **NOT IMPLEMENTED** |
| **F-07** | Slim handler path normalization (trailing slash, prefix) | H1, H6 | Code in `index.mjs` | Regression risk | **NOT IMPLEMENTED** |
| **F-08** | Improve Vercel edge logging / request logging for 404s | H9 | Observability config | Cost / noise | **NOT IMPLEMENTED** |
| **F-09** | Track H fast ACK / async (PR #55) — separate from routing 404 | Timeout path | Implementation gate | Scope creep | **NOT IMPLEMENTED** — separate track |

---

## 2. Recommended sequencing (if root cause confirmed later)

```text
1. Confirm hypothesis (read-only diagnostics)
2. Open branch: fix/str02-404-webhook-routing-staging-2026-05-24  (NOT CREATED YET)
3. Minimal routing/deploy fix (F-01…F-07 as applicable)
4. Redeploy staging (separate approval)
5. New STR-02 attempt ONLY with fresh approval phrase — NOT in this pack
6. Capture STR-02B HTTP 200 + LOG-01…LOG-04
7. Human review before any fix-proven claim
```

---

## 3. What fix is NOT (this incident)

| Claim | Status |
|-------|--------|
| Fix proven by filing investigation pack | **NO** |
| Fix proven by STR-02 404 evidence | **NO** |
| Production-ready after routing investigation | **NO** |
| Self-healing apply enabled | **NO** — **GATED / NOT ENABLED** |

---

## 4. Future implementation branch (name only)

```text
fix/str02-404-webhook-routing-staging-2026-05-24
```

**Do not create** in this docs pack.

---

## 5. Verdict

| Item | Status |
|------|--------|
| Fix options | **DOCUMENTED** |
| Fix implemented | **NOT IMPLEMENTED** |
| Root cause | **NOT CONFIRMED** |
| Staging replay | **FAILED / INCONCLUSIVE** |
| Production / real-money / pilot | **NO-GO** |

---

*Fix option matrix · planning only · no implementation*
