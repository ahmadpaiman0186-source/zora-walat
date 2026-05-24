# STR-02 — Vercel Read-Only Routing Diagnostics

**Date:** 2026-05-24
**Type:** **Read-only diagnostic pack — NOT a fix · NOT an execution record**
**Evidence folder:** [str02-vercel-readonly-routing-diagnostics-2026-05-24/](./evidence/str02-vercel-readonly-routing-diagnostics-2026-05-24/README.md)
**Parent:** [404 root-cause investigation](./ZORA_WALAT_STR02_404_ROUTING_ROOT_CAUSE_INVESTIGATION_2026_05_24.md)

**Policy:** Evidence/docs only. Read-only Vercel dashboard review. **No deploy. No settings edit. No API calls.**

---

## 1. Current state (post PR #67)

| Item | Status |
|------|--------|
| `main` | Clean and synced after PR #67 |
| PR #66 | STR-02 executed once — **404 ERR / Not Found** |
| PR #67 | STR-02 404 routing/root-cause investigation pack **FILED** |
| Vercel runtime logs (STR-02 window) | **NO MATCH** for `/webhooks/stripe` or `stripe` (VRC-01, VRC-02) |
| Vercel project diagnostics (this pack) | **SCAFFOLD FILED** — captures **PENDING** |
| Root cause | **NOT CONFIRMED** |
| Fix | **NOT IMPLEMENTED** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

## 2. Evidence boundary

### In scope (read-only)

| Action | Allowed |
|--------|---------|
| Vercel Dashboard → `zora-walat-api-staging` → Settings / Deployments / Domains / Logs | **YES** (operator) |
| Screenshot filing under [evidence folder](./evidence/str02-vercel-readonly-routing-diagnostics-2026-05-24/) | **YES** |
| Static repository route inventory (already in [404 pack](./ZORA_WALAT_STR02_404_ENDPOINT_MAPPING_AUDIT_PLAN_2026_05_24.md)) | **YES** |

### Out of scope (forbidden)

| Action | Status |
|--------|--------|
| Deploy / redeploy | **FORBIDDEN** |
| Edit project settings (Root Directory, framework, build) | **FORBIDDEN** |
| Edit Vercel env vars | **FORBIDDEN** |
| Vercel / Stripe API calls | **FORBIDDEN** |
| Stripe Resend / replay / test events | **FORBIDDEN** |
| App/server code changes | **FORBIDDEN** |
| Claim fix proven or production-ready | **FORBIDDEN** |

---

## 3. Read-only diagnostic steps

| Phase | Checklist | Evidence IDs |
|-------|-----------|--------------|
| 1 — Project root | [Project root evidence checklist](./ZORA_WALAT_STR02_VERCEL_PROJECT_ROOT_EVIDENCE_CHECKLIST_2026_05_24.md) | VRC-D01, VRC-D02 |
| 2 — Deployment | [Deployment output checklist](./ZORA_WALAT_STR02_VERCEL_DEPLOYMENT_OUTPUT_EVIDENCE_CHECKLIST_2026_05_24.md) | VRC-D03, VRC-D04, VRC-D05 |
| 3 — Domain | [Domain mapping checklist](./ZORA_WALAT_STR02_VERCEL_DOMAIN_MAPPING_EVIDENCE_CHECKLIST_2026_05_24.md) | VRC-D06 |
| 4 — Logs | Logs search (no correlation) | VRC-D07 (+ VRC-01/02 cross-ref) |
| 5 — Verdict | [Diagnostic verdict matrix](./ZORA_WALAT_STR02_VERCEL_DIAGNOSTIC_VERDICT_MATRIX_2026_05_24.md) | Post-capture update |

**Operator:** Complete dashboard review; file PNGs; update manifest. **Agent must not** access Vercel dashboard.

---

## 4. Project root risk

| Risk | Description | Repo signal |
|------|-------------|-------------|
| **Monorepo root deploy** | Vercel builds **Next.js** from repo root instead of API from `server/` | Root `vercel.json` = `"framework": "nextjs"` |
| **Correct API root** | Vercel Root Directory = **`server`** | `server/vercel.json` catch-all → `api/index.mjs` |
| **Deploy guard** | `server/scripts/assert-vercel-api-deploy-root.mjs` rejects wrong root | Documented in [404 investigation](./ZORA_WALAT_STR02_404_ROUTING_ROOT_CAUSE_INVESTIGATION_2026_05_24.md) |

**Diagnostic question:** Does `zora-walat-api-staging` show Root Directory = **`server`** (VRC-D01)?

**If root = empty or `/`:** H2/H3 **more plausible** — deployed app may not expose `POST /webhooks/stripe`.

---

## 5. Monorepo root vs `server/` root hypothesis

```text
Repo root (vercel.json: nextjs)
    └── server/  (vercel.json: routes → api/index.mjs)
            └── api/index.mjs  → POST /webhooks/stripe slim path
```

| Configuration | Expected webhook exposure |
|---------------|---------------------------|
| Root Directory = **`server`** | Catch-all → `api/index.mjs` → **should** handle `/webhooks/stripe` |
| Root Directory = **empty (repo root)** | Next.js app — **may not** expose `/webhooks/stripe` → **404 plausible** |

**Status:** **NOT CONFIRMED** until VRC-D01/D02 filed.

---

## 6. Deployment alias / domain mapping hypothesis

| Check | Hypothesis | Evidence |
|-------|------------|----------|
| `zora-walat-api-staging.vercel.app` → API project | H7 — domain correct | VRC-D06 **PENDING** |
| Domain → wrong project (Next root) | 404 at edge; no API runtime logs | H2, H9 |
| Active deployment SHA ≠ DEP-01 / STR-02 window | H10 — stale deploy | VRC-D03 **PENDING** |

**Stripe destination URL (fixed):** `https://zora-walat-api-staging.vercel.app/webhooks/stripe`

---

## 7. Route exposure hypothesis — `POST /webhooks/stripe`

| Layer | Repo definition | Deployed? |
|-------|-----------------|-----------|
| Slim entry | `server/api/index.mjs` — exact pathname `/webhooks/stripe`, POST only | **VERIFY** VRC-D04/D05 |
| Express | `server/src/app.js` — mount `/webhooks/stripe` | Behind serverless replay |
| Wrong path | `/api/webhooks/stripe` | **Not** slim-matched in repo |

**Conservative read:** STR-02 **404** + **no logs** suggests request **did not** reach slim handler — consistent with **missing route on deployed surface** (H1, H4, H9).

---

## 8. Why no Vercel runtime logs can still be consistent with edge/static 404

| Scenario | Stripe sees | Vercel runtime logs |
|----------|-------------|---------------------|
| Edge / CDN / static 404 | HTTP **404 Not Found** | **Empty** — no function invoked |
| Wrong project (Next.js) | **404** for unknown API route | **Empty** or unrelated |
| Function crash before log line | Non-404 possible | May be empty |
| Log filter / retention / window | N/A | **No match** (VRC-01/02 already) |

**STR-02 pattern:** **404** + **no runtime logs** → **H9 OPEN / PLAUSIBLE** — does **not** prove request reached application handler.

---

## 9. Evidence required before any code fix

| # | Required evidence | Status |
|---|-------------------|--------|
| E-01 | VRC-D01 — Root Directory = `server` or not | **PENDING** |
| E-02 | VRC-D02 — Framework / build not Next.js for API project | **PENDING** |
| E-03 | VRC-D03 — Deploy SHA + branch at STR-02 window | **PENDING** |
| E-04 | VRC-D04/D05 — `api/index.mjs` in build / functions list | **PENDING** |
| E-05 | VRC-D06 — Domain → this project | **PENDING** |
| E-06 | Hypothesis matrix updated with **CONFIRMED / REJECTED** | **PENDING** |
| E-07 | Human review — root cause statement | **PENDING** |

**Rule:** **No code fix** until E-01…E-07 satisfied and separate implementation approval issued.

---

## 10. Approval required before implementation branch

| Gate | Requirement |
|------|-------------|
| Diagnostics complete | VRC-D01…D07 filed (or N/A documented) |
| Root cause | **CONFIRMED** in [verdict matrix](./ZORA_WALAT_STR02_VERCEL_DIAGNOSTIC_VERDICT_MATRIX_2026_05_24.md) |
| Implementation branch | `fix/str02-404-webhook-routing-staging-2026-05-24` — **NOT CREATED** in this pack |
| Separate approval | Explicit human approval for code + deploy scope |
| Post-fix replay | **New** STR-02 approval phrase — **not** in this pack |

---

## 11. Verdict

| Item | Status |
|------|--------|
| STR-02 result | **404 ERR / Not Found** |
| HTTP 200 | **NOT ACHIEVED** |
| LOG-01…LOG-04 | **NOT CORRELATED / NOT CAPTURED** |
| Vercel runtime correlation | **NOT FOUND** |
| Vercel project diagnostics captures | **PENDING CAPTURE** |
| Root cause | **NOT CONFIRMED** |
| Fix | **NOT IMPLEMENTED** |
| Staging replay | **FAILED / INCONCLUSIVE** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*Vercel read-only diagnostics · docs/evidence only · no deploy · captures PENDING*
