# G-02 — STR-02 Resend / Replay Execution Gate

**Date:** 2026-05-24
**Gate:** G-02 · STR-02 sub-gate
**Type:** **Prerequisite definition only — NOT an execution record**

**Policy:** This document defines what must be true **before** an operator may click **Resend** on the already-captured `checkout.session.expired` sandbox event. It is **not** proof that replay occurred. **No approval is granted by this file alone.** See [execution not authorized notice](./ZORA_WALAT_G02_EXECUTION_NOT_AUTHORIZED_NOTICE_2026_05_23.md).

**Current state (post PR #63 / #64):**

| Item | Status |
|------|--------|
| `main` | Clean and synced |
| PR #63 | Existing active sandbox webhook destination registered (DEST-01) |
| PR #64 | STR-01 pre-replay timeout baseline registered |
| STR-01 | **CAPTURED / PRE-REPLAY BASELINE** |
| STR-02 | **NOT EXECUTED** |
| LOG-01…LOG-04 | **NOT CAPTURED** |
| Fix proven | **NOT YET** |
| Production / real-money / controlled pilot | **NO-GO** |

---

## 1. Purpose

Prepare a conservative approval and operator boundary **before any Stripe Resend/Replay action** for the single `checkout.session.expired` event already captured in STR-01. STR-02 is **approval-gated** and **NOT EXECUTED** until a human approver issues the explicit phrase in §3.

**Parent docs:** [STR-02 operator runbook](./ZORA_WALAT_G02_STR02_OPERATOR_RUNBOOK_2026_05_24.md) · [approval checklist](./ZORA_WALAT_G02_STR02_APPROVAL_CHECKLIST_2026_05_24.md) · [evidence matrix](./ZORA_WALAT_G02_STR02_EVIDENCE_CAPTURE_MATRIX_2026_05_24.md)

---

## 2. Hard safety boundary (always)

| Rule | Detail |
|------|--------|
| Mode | **Sandbox / test-mode only** — **never live mode** |
| Endpoint | `https://zora-walat-api-staging.vercel.app/webhooks/stripe` **only** |
| Target event | **Same** `checkout.session.expired` event captured in STR-01 (May 19, 2026 baseline) |
| Resend count | **One** sandbox resend only — no batch, no second time machine |
| Agent | **Must not** click Resend, replay, send test events, deploy, edit env, or mutate DB/payment state |
| APIs | **No** Stripe/Vercel API calls from automation |
| Claims | **No** fix-proven or production-ready claim until STR-02 + LOG-01…LOG-04 reviewed and correlated |

---

## 3. Required explicit approval phrase

A human approver must issue the following phrase **verbatim** (ticket, chat, or decision record — **not** pre-filled in git by Agent):

```text
APPROVE STR-02 SANDBOX CHECKOUT.EXPIRED RESEND ONLY
```

| Rule | Detail |
|------|--------|
| **Scope of phrase** | **One** sandbox/test-mode **Resend** of the **already captured** `checkout.session.expired` event to the **existing** staging endpoint |
| **Does authorize** | Single Resend + STR-02 / LOG evidence capture per [runbook](./ZORA_WALAT_G02_STR02_OPERATOR_RUNBOOK_2026_05_24.md) |
| **Does NOT authorize** | Live mode; production endpoint; new test event generation; deploy; env / Vercel var edits; DB/payment/refund/wallet/order mutation; credential rotation; production readiness claims; self-healing apply |
| **Without phrase** | STR-02 execution **remains blocked** — treat as **NOT APPROVED** |
| **“شروع کن” insufficient** | Informal “start” ≠ approval phrase |
| **Agent may not issue** | Phrase must come from designated human approver |

**Note:** `APPROVE G-02 SANDBOX WEBHOOK DESTINATION SETUP ONLY` (PR #63 scope) **does not** authorize STR-02 Resend.

---

## 4. Prerequisites (all required before Resend)

| # | Prerequisite | Status |
|---|--------------|--------|
| P-01 | `main` synced; PR #63, #64 merged | **VERIFY OPERATOR** |
| P-02 | DEP-01, DEST-01, STR-01 baseline on `main` | **FILED** (PR #63 / #64) |
| P-03 | Stripe **Sandboxes** / test-mode banner visible | **VERIFY OPERATOR** |
| P-04 | Destination `zora-walat-api-staging` **Active** at staging URL | **FILED** (DEST-01) |
| P-05 | Target event = STR-01 `checkout.session.expired` (same event id in operator log) | **VERIFY OPERATOR** |
| P-06 | [STR-02 approval checklist](./ZORA_WALAT_G02_STR02_APPROVAL_CHECKLIST_2026_05_24.md) completed | **PENDING** |
| P-07 | [STR-02 risk register](./ZORA_WALAT_G02_STR02_RISK_REGISTER_2026_05_24.md) reviewed | **PENDING** |
| P-08 | [Abort / rollback plan](./ZORA_WALAT_G02_STR02_ABORT_AND_ROLLBACK_PLAN_2026_05_24.md) reviewed | **PENDING** |
| P-09 | Vercel `zora-walat-api-staging` deployment **Ready** on PR #55+ `main` | **VERIFY OPERATOR** |
| P-10 | **Explicit approval phrase issued** (§3) | **NOT ISSUED** |
| P-11 | Pre-resend confirmation screenshot planned | **NOT CAPTURED** |
| P-12 | Operator records UTC timestamp before Resend | **PENDING** |

**Stop if any fail.** Do **not** click Resend.

---

## 5. Expected post-execution evidence (after operator acts)

| ID | Filename | When | Status |
|----|----------|------|--------|
| **STR-02A** | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-STR02-PRE-RESEND-CONFIRMATION-001.png` | **Before** Resend click | **NOT CAPTURED** |
| **STR-02B** | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-STR02-POST-RESEND-HTTP200-002.png` | **After** Resend; HTTP **200** visible | **NOT CAPTURED** |
| **LOG-01** | `VERCEL-STAGING-LOG-WEBHOOK-RECEIVED-001.png` | Request received | **NOT CAPTURED** |
| **LOG-02** | `VERCEL-STAGING-LOG-SIGNATURE-VERIFIED-001.png` | Signature verification | **NOT CAPTURED** |
| **LOG-03** | `VERCEL-STAGING-LOG-EVENT-PERSISTED-001.png` | Idempotency / duplicate protection | **NOT CAPTURED** |
| **LOG-04** | `VERCEL-STAGING-LOG-ACK-RETURNED-001.png` | Final handler result | **NOT CAPTURED** |

Full matrix: [STR-02 evidence capture matrix](./ZORA_WALAT_G02_STR02_EVIDENCE_CAPTURE_MATRIX_2026_05_24.md)

Update [evidence manifest](./evidence/staging-stripe-webhook-replay-proof-pr55-2026-05-23/EVIDENCE_MANIFEST.md) only after operator files PNGs.

---

## 6. Conservative verdict (default)

| Item | Status |
|------|--------|
| STR-02 Resend / replay | **NOT EXECUTED / APPROVAL GATED** |
| Approval phrase | **NOT ISSUED** |
| Fix proven (staging) | **NOT YET** |
| Fix proven (production) | **NOT YET** |
| Production launch | **NO-GO** |
| Real money | **NO-GO** |
| Controlled pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

**Rule:** Fix proven **NOT YET** until STR-02 + LOG-01…LOG-04 are filed, time-correlated, and human-reviewed.

---

## 7. What this gate is NOT

| This gate is NOT | Because |
|------------------|---------|
| An execution record | No Resend clicked; no replay timestamps in git |
| An approval grant | Phrase **NOT ISSUED** by default |
| Fix-proven certification | Correlated STR-02 + LOG proof still required |
| Production readiness | Prod / pilot remain **NO-GO** |

---

## 8. Next gate after STR-02 (if execution approved later)

1. Human issues `APPROVE STR-02 SANDBOX CHECKOUT.EXPIRED RESEND ONLY`.
2. Operator follows [STR-02 runbook](./ZORA_WALAT_G02_STR02_OPERATOR_RUNBOOK_2026_05_24.md).
3. File STR-02A/B + LOG-01…LOG-04; update manifest and [conservative verdict](./evidence/staging-stripe-webhook-replay-proof-pr55-2026-05-23/FINAL_CONSERVATIVE_VERDICT.md).
4. **Do not** claim fix proven until review complete.

---

*STR-02 execution gate · docs only · no Resend executed · no replay executed*
