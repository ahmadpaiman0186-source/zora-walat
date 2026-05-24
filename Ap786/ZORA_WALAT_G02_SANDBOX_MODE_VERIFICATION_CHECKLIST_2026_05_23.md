# G-02 — Sandbox Mode Verification Checklist

**Date:** 2026-05-23
**Gate:** G-02 · **DRY RUN ONLY / EXECUTION NOT AUTHORIZED**
**Parent:** [DRY_RUN_REHEARSAL](./ZORA_WALAT_G02_EXECUTION_DRY_RUN_REHEARSAL_2026_05_23.md)

**Policy:** All items default **unchecked**. Checking boxes in git does **not** grant approval or authorize execution.

---

## 1. Stripe sandbox verification (before any future execution)

- [ ] **Stripe Sandboxes page visible** in Dashboard navigation
- [ ] **Sandbox / test-mode selected** — Sandboxes or test-mode indicator visible
- [ ] **Live mode not selected** — no live-mode toggle active
- [ ] **Account / workspace verified as Zora-Walat sandbox** — correct Stripe account context
- [ ] **No live balance / payment activity involved** — no real-money charges in this window

---

## 2. Endpoint and environment verification

- [ ] **Endpoint is staging only:** `https://zora-walat-api-staging.vercel.app/webhooks/stripe`
- [ ] **Production endpoint not used** — no production URL in clipboard or form
- [ ] **Vercel project is `zora-walat-api-staging`** — not production project

---

## 3. Safety boundaries (must remain true)

- [ ] **No secret rotation** planned without Gate 4 ticket
- [ ] **No env mutation** (`.env` / Vercel env) unless separate approved scope
- [ ] **No replay until approval** — explicit phrase + decision record **APPROVED**
- [ ] **Screenshot required before any later execution** — [capture map](./ZORA_WALAT_G02_SCREENSHOT_CAPTURE_MAP_2026_05_23.md) reviewed

---

## 4. Dry-run rehearsal note

Use this checklist in **dry-run walkthrough** only. **Do not** open Stripe Dashboard to satisfy checks until human approver issues:

```text
APPROVE G-02 SANDBOX WEBHOOK DESTINATION SETUP ONLY
```

“شروع کن” (start) is **insufficient**.

---

## 5. Verdict

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

*Checklist · all unchecked · dry-run only · no execution authorized*
