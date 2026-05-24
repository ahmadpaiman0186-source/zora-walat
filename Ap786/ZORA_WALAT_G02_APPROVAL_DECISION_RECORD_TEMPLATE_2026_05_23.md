# G-02 — Approval Decision Record Template

**Date:** 2026-05-23
**Gate:** G-02 · Staging sandbox webhook destination + gated replay
**Default:** **PENDING / NOT APPROVED**

---

## 1. Approval fields

| Field | Value |
|-------|-------|
| **Record ID** | G-02-ADR-001 |
| **Approver name** | _PENDING_ |
| **Approver role** | _PENDING_ |
| **Timestamp (UTC)** | _PENDING_ |
| **Scope** | G-02 staging sandbox webhook destination create + test-mode `checkout.session.expired` replay proof |
| **Ticket / change window ID** | _PENDING_ |
| **Exact endpoint** | `https://zora-walat-api-staging.vercel.app/webhooks/stripe` |
| **Stripe mode confirmation** | **Sandbox / test-mode only** — _PENDING operator attestation_ |
| **Forbidden-action acknowledgement** | Approver confirms: no live mode, no production endpoint, no real money, no Agent dashboard actions, no env commit, no DB/payment mutation — _PENDING_ |
| **Approval result** | **PENDING** _(select one: APPROVED / DENIED / DEFERRED)_ |

---

## 2. Linked documents (must be reviewed before APPROVED)

| Document | Status |
|----------|--------|
| [UNBLOCK_APPROVAL](./ZORA_WALAT_G02_STAGING_WEBHOOK_DESTINATION_UNBLOCK_APPROVAL_2026_05_23.md) | **PENDING REVIEW** |
| [ALLOWED_ACTIONS](./ZORA_WALAT_G02_STRIPE_SANDBOX_WEBHOOK_DESTINATION_ALLOWED_ACTIONS_2026_05_23.md) | **PENDING REVIEW** |
| [OPERATOR_RUNBOOK](./ZORA_WALAT_G02_STAGING_REPLAY_OPERATOR_RUNBOOK_2026_05_23.md) | **PENDING REVIEW** |
| [EVIDENCE_MATRIX](./ZORA_WALAT_G02_STAGING_REPLAY_EVIDENCE_MATRIX_2026_05_23.md) | **PENDING REVIEW** |
| [ROLLBACK_ABORT](./ZORA_WALAT_G02_STAGING_REPLAY_ROLLBACK_ABORT_PLAN_2026_05_23.md) | **PENDING REVIEW** |

---

## 3. Outcome matrix

| Result | Effect |
|--------|--------|
| **APPROVED** | Operator may execute [runbook](./ZORA_WALAT_G02_STAGING_REPLAY_OPERATOR_RUNBOOK_2026_05_23.md) phases 2–9 per ticket scope |
| **DENIED** | No destination create; no replay; G-02 remains **BLOCKED / INCONCLUSIVE** |
| **DEFERRED** | No action until re-reviewed; all fields remain **PENDING** |

---

## 4. Post-approval evidence (not filled by Agent)

| ID | Status after approval |
|----|----------------------|
| DEST-01 | **PENDING APPROVAL / NOT CAPTURED** |
| STR-01 … LOG-05 | **BLOCKED / NOT CAPTURED** |

---

## 5. Verdict (default)

| Item | Status |
|------|--------|
| G-02 sandbox webhook destination setup | **APPROVAL REQUIRED / NOT EXECUTED** |
| Staging replay | **BLOCKED / INCONCLUSIVE** |
| Fix proven | **NOT YET** |
| Production launch | **NO-GO** |
| Real-money launch | **NO-GO** |
| Controlled pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*Decision record template · all fields default PENDING · no execution authorized*
