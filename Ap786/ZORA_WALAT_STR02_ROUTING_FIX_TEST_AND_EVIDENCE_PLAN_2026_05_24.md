# STR-02 — Routing Fix Test and Evidence Plan

**Date:** 2026-05-24
**Parent:** [approval gate](./ZORA_WALAT_STR02_ROUTING_FIX_APPROVAL_GATE_2026_05_24.md)

**Policy:** Local implementation tests may run under the approved implementation phrase. **No deploy. No Stripe replay. No fake PASS.**

---

## 1. When this plan applies

| Gate | Status |
|------|--------|
| Implementation approval phrase issued | **ISSUED** — implementation-only |
| Code on `fix/str02-404-webhook-routing-staging-2026-05-24` | **IN PROGRESS / LOCAL ONLY** |
| Deploy to staging | **NOT AUTHORIZED** (separate gate) |
| STR-02 Resend | **NOT AUTHORIZED** (separate phrase) |

---

## 2. Pre-merge evidence (local / CI — no deploy)

| ID | Requirement | Method | Pass criterion | Fake pass forbidden |
|----|-------------|--------|----------------|---------------------|
| E-01 | Static route inventory | Grep + read `server/api/index.mjs`, `server/vercel.json`, root `vercel.json` | `/webhooks/stripe` defined in repo API path | **Must show file:line** |
| E-02 | Root bridge handler test | `server/test/rootVercelWebhookBridge.test.js` | POST `/webhooks/stripe` reaches slim handler; missing signature fails closed | **404 = FAIL** |
| E-03 | CI / Super-System Guard | `npm test` / targeted webhook tests / workflow green on PR | CI pass | **Cannot claim staging PASS** |
| E-04 | Option D contract | `server/scripts/assert-vercel-api-deploy-root.mjs` or documented equivalent | Script pass or documented exception | N/A |
| E-05 | Diff scope review | PR files only routing/config/docs per gate | No env/DB/payment files | **Reject** scope creep |
| E-06 | Frontend route regression | Static test confirms `/`, `/history`, `/success`, `/cancel` files remain | Existing pages preserved | **No checkout UI rewrite** |

---

## 3. Post-deploy evidence (separate deploy approval required)

| ID | Requirement | Method | Pass criterion |
|----|-------------|--------|----------------|
| E-07 | Vercel preview/staging route surface | Dashboard screenshot: Functions/Routes | **`/webhooks/stripe`** or `api/webhooks/stripe` visible — **or** documented equivalent |
| E-08 | Build output | Deployment build log capture | Deploy **Ready**; no fatal build error |
| E-09 | Domain unchanged | `zora-walat-api-staging.vercel.app` still on project | Match VRC-D06 baseline |

**Without E-07:** Do **not** proceed to STR-02 Resend.

---

## 4. STR-02 replay evidence (separate Resend approval required)

| ID | Requirement | Method | Pass criterion |
|----|-------------|--------|----------------|
| E-10 | Sandbox Resend **only** with phrase `APPROVE STR-02 SANDBOX CHECKOUT.EXPIRED RESEND ONLY` | Stripe Dashboard — one resend | Per [STR-02 runbook](./ZORA_WALAT_G02_STR02_OPERATOR_RUNBOOK_2026_05_24.md) |
| E-11 | HTTP 200 | STR-02B screenshot | **Only if actually observed** — else **FAIL** |
| E-12 | LOG-01…LOG-04 | Vercel + app logs | **CORRELATED** — else **NOT ACHIEVED** |
| E-13 | Vercel runtime correlation | Logs search `/webhooks/stripe` | Match in STR-02 window — else **NOT FOUND** |

---

## 5. Explicit anti-patterns (forbidden claims)

| Forbidden claim | Correct statement |
|-----------------|-------------------|
| “Fix proven” after PR merge only | Fix **NOT PROVEN** until E-06…E-12 |
| “HTTP 200” without STR-02B | HTTP 200 **NOT ACHIEVED** |
| “Root cause confirmed” after code change | Root cause **NOT CONFIRMED** until human sign-off |
| “Staging replay passed” after CI green | Staging replay **FAILED / INCONCLUSIVE** until E-10 |
| “Production-ready” | **NO-GO** |

---

## 6. Evidence filing

| Artifact | Location |
|----------|----------|
| Post-deploy screenshots | `Ap786/evidence/str02-vercel-readonly-routing-diagnostics-2026-05-24/` (new IDs) or sibling folder |
| STR-02 replay | `Ap786/evidence/staging-stripe-webhook-replay-proof-pr55-2026-05-23/` |
| Manifest update | [EVIDENCE_MANIFEST](./evidence/str02-vercel-readonly-routing-diagnostics-2026-05-24/EVIDENCE_MANIFEST.md) |

---

## 7. Verdict (current)

| Item | Status |
|------|--------|
| STR-02 | **404 ERR / Not Found** |
| HTTP 200 | **NOT ACHIEVED** |
| LOG-01…LOG-04 | **NOT CORRELATED / NOT CAPTURED** |
| Local test plan | **UPDATED** — execution recorded in PR report |
| Local routing bridge | **IMPLEMENTED FOR REVIEW** |
| Deployed fix | **NOT DEPLOYED / NOT PROVEN** |

---

*Test and evidence plan · local tests allowed · deploy/replay separately gated · no fake pass*
