# G-02 — Pre-Execution Readiness Checklist

**Date:** 2026-05-23
**Gate:** G-02 · **NOT EXECUTED**
**Parent:** [ROUTING_PACKET](./ZORA_WALAT_G02_APPROVAL_DECISION_ROUTING_PACKET_2026_05_23.md)

**Policy:** Operator checklist only. All items default **unchecked**. Checking items in git does **not** grant approval.

---

## 1. Repository and evidence readiness

- [ ] **`main` synced** with `origin/main` (clean, ff-only pull verified)
- [ ] **PR #55 on `main`** — Track H webhook code merged
- [ ] **PR #56 scaffold on `main`** — staging replay evidence folder and checklists
- [ ] **PR #57 / #58 blocker evidence on `main`** — BLK-01 and BLK-02 PNGs filed
- [ ] **PR #59 approval pack on `main`** — G-02 unblock docs merged

---

## 2. Stripe and endpoint readiness

- [ ] **Stripe sandbox selected** in Dashboard (Sandboxes / test-mode visible)
- [ ] **Live mode not selected** — no live-mode toggle active
- [ ] **Staging endpoint confirmed:** `https://zora-walat-api-staging.vercel.app/webhooks/stripe`
- [ ] **Production endpoint not used** — no production URL entered

---

## 3. Safety and scope readiness

- [ ] **No `.env` / Vercel env change required** for destination-only step (or separate Gate 4 ticket filed if signing secret must be updated)
- [ ] **No DB / payment mutation planned** — destination create is dashboard-only
- [ ] **Abort criteria reviewed** — [rollback / abort plan](./ZORA_WALAT_G02_STAGING_REPLAY_ROLLBACK_ABORT_PLAN_2026_05_23.md)
- [ ] **Screenshot evidence plan reviewed** — [evidence matrix](./ZORA_WALAT_G02_STAGING_REPLAY_EVIDENCE_MATRIX_2026_05_23.md) (DEST-01 minimum for destination step)

---

## 4. Approval readiness (required before execution)

- [ ] [Approval ticket](./ZORA_WALAT_G02_APPROVAL_TICKET_TEMPLATE_2026_05_23.md) filed
- [ ] [Decision record](./ZORA_WALAT_G02_APPROVAL_DECISION_RECORD_TEMPLATE_2026_05_23.md) signed **APPROVED**
- [ ] Explicit approval phrase issued per [post-approval execution gate](./ZORA_WALAT_G02_POST_APPROVAL_EXECUTION_GATE_2026_05_23.md)

**Note:** Items in §4 are **not** satisfied until human approver action outside git.

---

## 5. Verdict (default)

| Item | Status |
|------|--------|
| G-02 approval decision | **PENDING / NOT APPROVED** |
| G-02 sandbox webhook destination setup | **APPROVAL REQUIRED / NOT EXECUTED** |
| Staging replay | **BLOCKED / INCONCLUSIVE** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*Checklist · all boxes default unchecked · no execution authorized*
