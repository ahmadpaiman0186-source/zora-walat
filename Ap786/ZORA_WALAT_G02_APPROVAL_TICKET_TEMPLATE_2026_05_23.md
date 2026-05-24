# G-02 — Approval Ticket Template

**Date:** 2026-05-23
**Gate:** G-02
**Default:** **PENDING / NOT APPROVED**

**Policy:** Template only. Filing this ticket does **not** grant approval. Do **not** pre-fill approver signatures in git.

---

## 1. Ticket metadata

| Field | Value |
|-------|-------|
| **Ticket title** | G-02 — Stripe sandbox webhook destination setup (staging only) |
| **Ticket ID** | _PENDING_ |
| **Requestor** | _PENDING_ |
| **Created (UTC)** | _PENDING_ |
| **Change window** | _PENDING_ |
| **Approval status** | **PENDING / NOT APPROVED** |

---

## 2. Scope

| Field | Value |
|-------|-------|
| **In scope** | Create Stripe **sandbox/test-mode** webhook event destination pointing at staging; capture DEST-01; **no replay** unless separately approved in same ticket |
| **Out of scope** | Production endpoint; live mode; real-money; deploy; DB mutation; credential rotation (unless Gate 4 sub-ticket) |
| **Linked gate** | G-02 |
| **PR lineage** | PR #55 code on `main`; PR #56–#59 evidence and approval docs on `main` |

---

## 3. Endpoint

| Field | Value |
|-------|-------|
| **Exact URL** | `https://zora-walat-api-staging.vercel.app/webhooks/stripe` |
| **Vercel project** | `zora-walat-api-staging` |
| **Production URL** | **NOT USED** |

---

## 4. Stripe mode attestation

| Attestation | Operator sign-off |
|-------------|-------------------|
| Dashboard in **Sandboxes** / test-mode | _PENDING_ |
| **Live mode not selected** | _PENDING_ |
| Event types minimum: `checkout.session.expired` | _PENDING_ |
| No real-money checkout in this window | _PENDING_ |

---

## 5. Risks

| Risk | Mitigation |
|------|------------|
| Wrong endpoint (production) | Pre-exec checklist + explicit URL in ticket |
| Live mode selected | Operator attestation + screenshot DEST-01 |
| Signing secret mismatch | Gate 4 procedure if env update needed; never commit secret |
| Unapproved replay | Replay blocked until separate approval scope |
| False fix-proven claim | Conservative verdict until STR-02 + LOG-01…04 |

---

## 6. Rollback / abort

| Reference | Action |
|-----------|--------|
| [Rollback / abort plan](./ZORA_WALAT_G02_STAGING_REPLAY_ROLLBACK_ABORT_PLAN_2026_05_23.md) | Stop on non-200; remove sandbox destination when complete |
| Production rollback | **NOT APPLICABLE** |
| DB rollback | **NOT APPLICABLE** |

---

## 7. Evidence to capture

| ID | Filename | When |
|----|----------|------|
| DEST-01 | `STRIPE-SANDBOX-WEBHOOK-DESTINATION-CREATED-001.png` | After destination create |
| STR-01 … LOG-05 | Per [evidence matrix](./ZORA_WALAT_G02_STAGING_REPLAY_EVIDENCE_MATRIX_2026_05_23.md) | Replay phase (if in scope) |

---

## 8. Approval fields

| Field | Value |
|-------|-------|
| **Payments approver** | _PENDING_ |
| **Engineering approver** | _PENDING_ |
| **Approval timestamp (UTC)** | _PENDING_ |
| **Explicit approval phrase issued** | _PENDING_ — see [execution gate](./ZORA_WALAT_G02_POST_APPROVAL_EXECUTION_GATE_2026_05_23.md) |
| **Decision record filed** | _PENDING_ — [template](./ZORA_WALAT_G02_APPROVAL_DECISION_RECORD_TEMPLATE_2026_05_23.md) |
| **Result** | **PENDING** _(APPROVED / DENIED / DEFERRED)_ |

---

## 9. Verdict (default)

| Item | Status |
|------|--------|
| G-02 approval decision | **PENDING / NOT APPROVED** |
| G-02 sandbox webhook destination setup | **APPROVAL REQUIRED / NOT EXECUTED** |
| Staging replay | **BLOCKED / INCONCLUSIVE** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*Ticket template · default PENDING · no approval granted in git*
