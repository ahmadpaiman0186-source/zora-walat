# STR-02 — Routing Fix Implementation Plan

**Date:** 2026-05-24
**Parent:** [approval gate](./ZORA_WALAT_STR02_ROUTING_FIX_APPROVAL_GATE_2026_05_24.md) · [404 fix option matrix](./ZORA_WALAT_STR02_404_FIX_OPTION_MATRIX_2026_05_24.md)

**Policy:** Approval phrase received for local implementation only. **No deploy. No redeploy. No Vercel settings edit. No Stripe replay.**

---

## 1. Problem statement (evidence-backed)

| Observation | Source |
|-------------|--------|
| Stripe POST `https://zora-walat-api-staging.vercel.app/webhooks/stripe` → **404** | STR-02B |
| Deploy functions: `/_not-found`, `/cancel`, `/history`, `/index`, `/success` — **no** `/webhooks/stripe` | VRC-D05 |
| Root Directory = **`./`** (repo root) | VRC-D01 |
| Repo API handler at `server/api/index.mjs` (slim `/webhooks/stripe`) | Static audit |
| Root `vercel.json` → Next.js; `server/vercel.json` → API catch-all | Static audit |

**Conservative read:** Active deploy surface looks like **monorepo root (Next.js)** not **`server/` API** — consistent with missing webhook route.

---

## 2. Fix options (evaluate only — NOT IMPLEMENTED)

### Option A — Align Vercel project Root Directory to `server/`

| Field | Value |
|-------|-------|
| Type | **Dashboard / deploy setting** |
| Addresses | H2, H7 |
| Mechanism | Vercel builds from `server/` so `server/vercel.json` catch-all → `api/index.mjs` |
| Pros | Matches documented API layout; uses existing `assert-vercel-api-deploy-root.mjs` intent |
| Cons | **Requires Vercel settings change + redeploy** — **outside** implementation-only approval (§6 F-02) |
| This pack | **Document only** — operator action in **separate** deploy/settings gate |

### Option B — Root-level routing bridge for `/webhooks/stripe`

| Field | Value |
|-------|-------|
| Type | **Code / config at repo root** |
| Addresses | H2, H4, H6 |
| Mechanism | Add root `vercel.json` rewrite/route or API shim forwarding `/webhooks/stripe` → `server/api/index.mjs` (or equivalent) |
| Pros | May fix route without dashboard Root Directory change in same PR |
| Cons | Duplication risk; must not break Next.js pages; needs careful review |
| This branch | **SELECTED** — root `api/webhooks/stripe.mjs` bridge + exact root rewrite |

### Option C — Split API project configuration explicitly

| Field | Value |
|-------|-------|
| Type | **Code / config / docs** |
| Addresses | H2, H7 |
| Mechanism | Clarify `zora-walat-api-staging` as API-only project (separate from web app); enforce deploy from `server/` in CI/docs |
| Pros | Long-term clarity |
| Cons | May still need Option A deploy setting; broader scope |
| This pack | **Document only** unless minimal diff chosen post-approval |

### Option D — Verify `server/vercel.json` deployment root contract

| Field | Value |
|-------|-------|
| Type | **Diagnostic / guard** |
| Addresses | H4, H10 |
| Mechanism | Run `server/scripts/assert-vercel-api-deploy-root.mjs`; confirm catch-all `"dest": "/api/index.mjs"`; document deploy procedure |
| Pros | Low risk; supports any deploy path |
| Cons | Does not alone fix `./` root if dashboard unchanged |
| This pack | **Required** inspection step on implementation branch (read-only + tests) |

---

## 3. Implementation note (local only — not deployed)

**Approval received:** `APPROVE STR-02 STAGING WEBHOOK ROUTING FIX IMPLEMENTATION ONLY`

| Step | Action | Notes |
|------|--------|-------|
| 1 | Static inventory confirmed | `server/api/index.mjs` already handles POST `/webhooks/stripe` under `server/` deploy |
| 2 | Option **B** implemented locally | Root `api/webhooks/stripe.mjs` delegates to existing `server/api/slimStripeWebhookHandler.mjs` |
| 3 | Root rewrite added | Exact `/webhooks/stripe` → `/api/webhooks/stripe`; frontend routes remain untouched |
| 4 | Server dependency install added to root Vercel install command | Required so root function can bundle server slim handler dependencies |
| 5 | Local tests added | See [test/evidence plan](./ZORA_WALAT_STR02_ROUTING_FIX_TEST_AND_EVIDENCE_PLAN_2026_05_24.md) |
| 6 | PR for review | Allowed by approval phrase |
| 7 | Deploy / replay / HTTP 200 claim | **NOT AUTHORIZED** in this branch |

**Implemented files:** root `api/webhooks/stripe.mjs`, root `vercel.json`, and local unit coverage. This is a **local routing exposure fix candidate**, not proof that staging is fixed.

---

## 4. Explicit non-scope

| Item | Status |
|------|--------|
| Implement local routing bridge | **YES** — approved implementation-only scope |
| Create implementation branch | **YES** — `fix/str02-404-webhook-routing-staging-2026-05-24` |
| Vercel Root Directory change | **NO** (separate gate) |
| Deploy / redeploy | **NO** |
| Stripe Resend | **NO** |

---

## 5. Rollback pointer

See [rollback plan](./ZORA_WALAT_STR02_ROUTING_FIX_ROLLBACK_PLAN_2026_05_24.md) — revert PR; no DB rollback required for routing-only diff.

---

## 6. Verdict

| Item | Status |
|------|--------|
| Options evaluated | **YES** (A–D) |
| Local routing bridge | **IMPLEMENTED FOR REVIEW** |
| Staging deployment | **NOT DEPLOYED** |
| Fix proven | **NO** |
| Root cause | **NOT CONFIRMED** |
| Recommended path | **PR review → separate deploy approval → route evidence → separate resend approval** |

---

*Implementation plan · local bridge implemented · no deploy · no fix-proven claim*
