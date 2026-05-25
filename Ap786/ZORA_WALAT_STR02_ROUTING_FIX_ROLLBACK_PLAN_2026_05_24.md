# STR-02 — Routing Fix Rollback Plan

**Date:** 2026-05-24
**Parent:** [approval gate](./ZORA_WALAT_STR02_ROUTING_FIX_APPROVAL_GATE_2026_05_24.md) · [implementation plan](./ZORA_WALAT_STR02_ROUTING_FIX_IMPLEMENTATION_PLAN_2026_05_24.md)

**Policy:** Rollback steps are **defined only**. No deploy or revert executed in this pack.

---

## 1. Rollback triggers

| # | Trigger | Action |
|---|---------|--------|
| T-01 | PR introduces regression on non-webhook routes | **Revert PR** / close without merge |
| T-02 | Post-deploy functions list still missing `/webhooks/stripe` | **Revert** code deploy; consider Option A (Root Directory) via settings gate |
| T-03 | STR-02 Resend still **404** after approved deploy | **Stop** further resends; re-open investigation |
| T-04 | Unexpected 5xx or auth errors on webhook path | **Revert**; capture logs; no second resend without approval |
| T-05 | Scope creep (env, DB, payment logic) detected in PR | **Reject PR**; rollback branch |

---

## 2. Rollback procedures (implementation branch only)

| Step | Action | Allowed in implementation phrase? |
|------|--------|-----------------------------------|
| 1 | `git revert` or close PR on `fix/str02-404-webhook-routing-staging-2026-05-24` | **YES** (code) |
| 2 | Delete feature branch | **YES** |
| 3 | Redeploy previous Vercel deployment | **NO** — requires **separate** deploy approval |
| 4 | Revert Vercel Root Directory setting | **NO** — requires settings gate |
| 5 | Stripe dashboard URL change | **NO** — separate payments approval |
| 6 | DB migration / payment state rollback | **N/A** — routing-only scope |

---

## 3. State preservation

| State | Rollback impact |
|-------|-----------------|
| DB / orders / wallets | **No mutation** expected from routing-only PR — no DB rollback |
| Stripe events | Unchanged — no Resend in implementation phrase |
| Vercel env vars | **Must not** change in implementation PR |
| Evidence packs | Prior STR-02 / Vercel diagnostics **retained** — append new evidence only |

---

## 4. Communication

| Audience | Message |
|----------|---------|
| Engineering | Routing fix PR reverted; staging replay remains **FAILED / INCONCLUSIVE** until new evidence |
| Payments | Do **not** Resend until new approval + deploy proof |
| Launch | Production / pilot **NO-GO** unchanged |

---

## 5. Verdict

| Item | Status |
|------|--------|
| Rollback plan | **DEFINED** |
| Rollback executed | **NO** |
| Fix | **NOT IMPLEMENTED** |

---

*Rollback plan · defined only · no deploy*
