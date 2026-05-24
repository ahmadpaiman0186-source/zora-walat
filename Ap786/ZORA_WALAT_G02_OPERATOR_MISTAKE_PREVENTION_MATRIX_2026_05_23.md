# G-02 — Operator Mistake Prevention Matrix

**Date:** 2026-05-23
**Gate:** G-02 · **DRY RUN ONLY / EXECUTION NOT AUTHORIZED**
**Parent:** [DRY_RUN_REHEARSAL](./ZORA_WALAT_G02_EXECUTION_DRY_RUN_REHEARSAL_2026_05_23.md)

---

## 1. Purpose

Document common operator mistakes during future G-02 execution, mitigations, and **abort actions**. Rehearse in dry-run; **do not trigger mistakes intentionally**.

---

## 2. Mistake prevention matrix

| # | Mistake | Risk | Mitigation | Abort action |
|---|---------|------|------------|--------------|
| M-01 | **Live mode selected** | Critical — real-money path | [Sandbox checklist](./ZORA_WALAT_G02_SANDBOX_MODE_VERIFICATION_CHECKLIST_2026_05_23.md); Sandboxes visible in DEST-01 | **Stop immediately**; do not save; file incident note |
| M-02 | **Production endpoint pasted** | Critical — prod webhook traffic | Pre-exec URL verification; ticket records staging URL only | **Stop**; do not click Continue; verify clipboard |
| M-03 | **Continue clicked before approval** | High — unauthorized destination | [Execution gate](./ZORA_WALAT_G02_POST_APPROVAL_EXECUTION_GATE_2026_05_23.md); phrase not issued | **Stop**; remove partial config if possible; no replay |
| M-04 | **Replay clicked before baseline screenshot** | Medium — no STR-01 proof | Runbook Phase 4 before Phase 5; [capture map](./ZORA_WALAT_G02_SCREENSHOT_CAPTURE_MAP_2026_05_23.md) | **Stop resends**; capture current state; document gap |
| M-05 | **Vercel production logs used instead of staging** | High — false correlation | Project = `zora-walat-api-staging` only | **Discard** LOG captures; re-query staging |
| M-06 | **Env / secret rotation attempted** | High — credential incident | Gate 4 separate ticket; name-only in docs | **Stop**; revert env if changed; escalate Gate 4 |
| M-07 | **Payment / order DB manually changed** | Critical — money-path integrity | G-02 scope excludes DB mutation | **Stop**; no self-healing apply; escalate payments |

---

## 3. Universal abort triggers

| Trigger | Action |
|---------|--------|
| Non-200 on replay | Stop resends; see [rollback plan](./ZORA_WALAT_G02_STAGING_REPLAY_ROLLBACK_ABORT_PLAN_2026_05_23.md) |
| LOG-01…04 not found in ±15 min | Stop; do not claim fix proven |
| Wrong Stripe account | Stop; re-verify sandbox workspace |
| Informal “شروع کن” treated as approval | **Reject** — require exact phrase |

---

## 4. Verdict

| Item | Status |
|------|--------|
| G-02 execution dry-run | **FILED / EXECUTION NOT AUTHORIZED** |
| G-02 approver review | **PENDING REVIEW / NOT APPROVED** |
| G-02 approval decision | **PENDING / NOT APPROVED** |
| G-02 sandbox webhook destination setup | **APPROVAL REQUIRED / NOT EXECUTED** |
| Staging replay | **BLOCKED / INCONCLUSIVE** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*Mistake matrix · dry-run rehearsal · no execution authorized*
