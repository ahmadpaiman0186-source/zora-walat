# G-02 — Staging Replay Rollback and Abort Plan

**Date:** 2026-05-23
**Gate:** G-02 · **NOT EXECUTED**
**Parent:** [UNBLOCK_APPROVAL](./ZORA_WALAT_G02_STAGING_WEBHOOK_DESTINATION_UNBLOCK_APPROVAL_2026_05_23.md) · [OPERATOR_RUNBOOK](./ZORA_WALAT_G02_STAGING_REPLAY_OPERATOR_RUNBOOK_2026_05_23.md)

**Policy:** Documented procedures only. No production rollback. No DB mutation.

---

## 1. Abort criteria (immediate stop)

| # | Condition | Action |
|---|-----------|--------|
| AB-01 | Decision record not **APPROVED** | **Do not start** |
| AB-02 | Live Stripe mode detected | **Stop**; no further dashboard actions |
| AB-03 | Wrong endpoint URL (not staging) | **Stop**; do not save destination |
| AB-04 | Replay returns non-200 or timeout | **Stop** resends; file incident note |
| AB-05 | Unexpected payment / refund / wallet side effect | **Stop**; escalate; no self-healing apply |
| AB-06 | Operator cannot correlate LOG-01…04 within ±15 min | **Stop**; do not claim fix proven |

---

## 2. Stop conditions (during execution)

| Phase | Stop if |
|-------|---------|
| Destination create | Any live-mode toggle or production URL entered |
| Event generation | Real-money charge attempted |
| Replay | HTTP ≠ 200, 5xx, or delivery timeout |
| Log capture | Cannot find lifecycle logs for replay window |

**On stop:** Do not retry automatically. Record timestamp, event id (redacted), HTTP status, and abort reason in operator log.

---

## 3. Sandbox destination removal (documented only)

**When:** After evidence filed, test complete, or abort after partial create.

| Step | Action | Notes |
|------|--------|-------|
| R-01 | Stripe Sandboxes → Workbench → Webhooks | Test-mode only |
| R-02 | Select staging destination created for G-02 | Match DEST-01 |
| R-03 | Delete / disable destination per Stripe UI | **Document only** — operator executes |
| R-04 | Capture redacted screenshot if policy requires | Optional audit trail |
| R-05 | **Do not** delete production endpoints | Production untouched |

**No production rollback.** **No Vercel production redeploy** as part of G-02 abort.

---

## 4. Explicitly not in scope

| Action | Status |
|--------|--------|
| Production rollback | **NOT APPLICABLE** |
| DB mutation rollback | **FORBIDDEN** |
| Payment / refund reversal | **FORBIDDEN** |
| Wallet / order state repair | **FORBIDDEN** |
| Credential rotation (unless separate Gate 4 ticket) | **FORBIDDEN** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

## 5. Incident notes (unexpected non-200 or timeout)

If replay fails (non-200, timeout, or missing logs), operator records:

| Field | Content |
|-------|---------|
| UTC timestamp | Replay attempt time |
| Event type | `checkout.session.expired` |
| HTTP status | From Stripe delivery detail |
| Endpoint | Staging URL only |
| Vercel log search | Query used; match Y/N |
| Abort reason | AB-04 / AB-06 / other |
| Next step | **Do not** claim fix proven; escalate per Gate G-02 |

File summary in Ap786 evidence folder README or operator log — **no secrets**.

---

## 6. Verdict

| Item | Status |
|------|--------|
| Rollback executed | **NOT EXECUTED** |
| G-02 sandbox webhook destination setup | **APPROVAL REQUIRED / NOT EXECUTED** |
| Staging replay | **BLOCKED / INCONCLUSIVE** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |

---

*Rollback / abort plan · documented only · no execution*
