# G-02 — Approver Decision Summary

**Date:** 2026-05-23
**Gate:** G-02
**Default decision:** **PENDING / NOT APPROVED**

**Policy:** One-page summary for human approver. **Does not grant approval.**

---

## 1. Decision at a glance

| Question | Answer (current) |
|----------|------------------|
| What is being requested? | Stripe **sandbox** webhook destination → staging URL only |
| What is blocked? | BLK-01 (no destination) + BLK-02 (no expired deliveries) + no approval |
| What is the proposed endpoint? | `https://zora-walat-api-staging.vercel.app/webhooks/stripe` |
| Is execution authorized now? | **NO** — dry-run **FILED / EXECUTION NOT AUTHORIZED** |
| Default decision | **PENDING / NOT APPROVED** |

---

## 2. Required exact approval phrase

A human approver must issue **verbatim**:

```text
APPROVE G-02 SANDBOX WEBHOOK DESTINATION SETUP ONLY
```

| Rule | Detail |
|------|--------|
| **Scope** | Sandbox destination create + DEST-01 capture only |
| **Does not authorize** | Replay, live mode, production endpoint, deploy, env rotation, DB/payment mutation |
| **“شروع کن” is not sufficient** | Informal “start” ≠ approval phrase |
| **Agent cannot issue** | Human approver only |

---

## 3. Conditions that must also be true (before execution)

| # | Condition | Status |
|---|-----------|--------|
| C-01 | [Approval ticket](./ZORA_WALAT_G02_APPROVAL_TICKET_TEMPLATE_2026_05_23.md) filed | **PENDING** |
| C-02 | [Decision record](./ZORA_WALAT_G02_APPROVAL_DECISION_RECORD_TEMPLATE_2026_05_23.md) signed **APPROVED** | **PENDING / NOT APPROVED** |
| C-03 | [Pre-execution checklist](./ZORA_WALAT_G02_PRE_EXECUTION_READINESS_CHECKLIST_2026_05_23.md) completed | **PENDING** |
| C-04 | Stripe **sandbox/test-mode** selected | **PENDING OPERATOR** |
| C-05 | Staging endpoint confirmed (exact URL above) | **DOCUMENTED** |
| C-06 | Explicit approval phrase issued | **NOT ISSUED** |
| C-07 | [Risk review](./ZORA_WALAT_G02_RISK_ACCEPTANCE_AND_BOUNDARY_REVIEW_2026_05_23.md) acknowledged | **NOT ACCEPTED / PENDING APPROVAL** |
| C-08 | [Dry-run rehearsal](./ZORA_WALAT_G02_EXECUTION_DRY_RUN_REHEARSAL_2026_05_23.md) reviewed (paper only) | **FILED / NOT EXECUTED** |

**All conditions required.** Missing any → execution **blocked**.

---

## 4. Decision options

| Option | When to use |
|--------|-------------|
| **APPROVED** | Evidence reviewed; risks accepted; phrase issued; ticket + record filed |
| **DENIED** | Scope unacceptable; keep G-02 blocked |
| **DEFERRED** | More evidence or stakeholder input needed |

---

## 5. Verdict (default)

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

*Decision summary · default PENDING · no approval granted*
