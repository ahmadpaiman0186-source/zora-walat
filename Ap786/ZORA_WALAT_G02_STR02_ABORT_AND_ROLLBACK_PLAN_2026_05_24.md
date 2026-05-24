# G-02 — STR-02 Abort and Rollback Plan

**Date:** 2026-05-24
**Gate:** G-02 · STR-02
**Parent:** [execution gate](./ZORA_WALAT_G02_STR02_RESEND_REPLAY_EXECUTION_GATE_2026_05_24.md) · [operator runbook](./ZORA_WALAT_G02_STR02_OPERATOR_RUNBOOK_2026_05_24.md)

**Policy:** Plan only. **No rollback or abort action executed** by Agent. Operator follows this if STR-02 Resend fails or boundary is violated.

---

## 1. Abort triggers (immediate stop)

| # | Trigger | Operator action |
|---|---------|-----------------|
| A-01 | Live mode detected (no Sandboxes banner) | **Do not** Resend; exit dashboard |
| A-02 | Wrong webhook endpoint URL | **Do not** Resend; document mismatch |
| A-03 | Wrong event type (not `checkout.session.expired`) | **Do not** Resend |
| A-04 | Event ≠ STR-01 baseline event | **Do not** Resend |
| A-05 | Approval phrase **not** issued | **Do not** Resend |
| A-06 | STR-02A pre-resend screenshot **not** captured | **Do not** click Resend |
| A-07 | HTTP **non-200** after Resend | **Stop**; capture failure state; **no** second Resend without new approval |
| A-08 | Delivery **timeout** after Resend | **Stop**; same as A-07 |
| A-09 | Unexpected Stripe error modal | **Stop**; screenshot if safe; no retry |
| A-10 | Operator uncertainty about scope | **Stop**; escalate to approver |

---

## 2. During Resend failure (post-click)

| Step | Action |
|------|--------|
| 1 | **Do not** click Resend again |
| 2 | Capture current delivery state (failed / timeout / non-200) if safe |
| 3 | Record UTC timestamp and redacted delivery id in operator log |
| 4 | Check Vercel staging logs for error lines (read-only) — **no** deploy / env change |
| 5 | File abort note in ticket; update manifest with **FAILURE / INCONCLUSIVE** — not PASS |
| 6 | **Do not** claim fix proven |

---

## 3. Rollback scope (what rollback is NOT)

| Action | STR-02 rollback policy |
|--------|------------------------|
| Undo Stripe Resend | **Not possible** — Resend is append-only delivery attempt |
| Delete sandbox destination | **Forbidden** without separate approval |
| Revert `main` deploy | **Forbidden** in STR-02 scope |
| Rotate webhook signing secret | **Forbidden** in STR-02 scope |
| DB / payment / order mutation | **Forbidden** — do not “fix forward” via data changes |
| Production endpoint test | **Forbidden** |

**Conservative rule:** On failure, **stop and document** — do not expand scope.

---

## 4. Safe recovery paths (require new approval)

| Path | Requires |
|------|----------|
| Second Resend attempt | New phrase + new ticket; new STR-02A capture |
| Sandbox destination edit | Separate G-02 destination approval if ever needed |
| Code fix + redeploy | Track H + implementation approval gate |
| Credential rotation | Gate 4 approval |

---

## 5. Evidence on abort

| Capture | When | Status |
|---------|------|--------|
| Last known good STR-01 baseline | Already filed (PR #64) | **CAPTURED** |
| STR-02A pre-resend (if captured before abort) | Before click | **NOT CAPTURED** |
| Failure-state Stripe screenshot | On abort after click | **Optional — not fabricated** |
| Vercel error log snippet | Read-only, redacted | **Optional** |

**Do not fabricate success PNGs on abort.**

---

## 6. Notification template (operator)

```text
STR-02 ABORT — G-02 sandbox resend
Trigger: [A-0X]
Event: checkout.session.expired (STR-01 baseline)
Endpoint: zora-walat-api-staging (staging only)
Resend clicked: [YES/NO]
Result: [200 / non-200 / timeout / not executed]
Fix proven: NOT YET
Production / pilot: NO-GO
Next: Await approver direction — no second Resend without new approval
```

---

## 7. Verdict (default)

| Item | Status |
|------|--------|
| Abort plan | **FILED / NOT EXECUTED** |
| STR-02 Resend | **NOT EXECUTED** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*STR-02 abort and rollback plan · docs only · no Resend executed*
