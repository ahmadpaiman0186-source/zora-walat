# G-02 — Staging Replay Operator Runbook

**Date:** 2026-05-24 (updated)
**Gate:** G-02 · **NOT EXECUTED**
**Parent:** [UNBLOCK_APPROVAL](./ZORA_WALAT_G02_STAGING_WEBHOOK_DESTINATION_UNBLOCK_APPROVAL_2026_05_23.md) · [ALLOWED_ACTIONS](./ZORA_WALAT_G02_STRIPE_SANDBOX_WEBHOOK_DESTINATION_ALLOWED_ACTIONS_2026_05_23.md) · [DRY_RUN](./ZORA_WALAT_G02_EXECUTION_DRY_RUN_REHEARSAL_2026_05_23.md) · [STR-02 gate](./ZORA_WALAT_G02_STR02_RESEND_REPLAY_EXECUTION_GATE_2026_05_24.md) · [STR-02 runbook](./ZORA_WALAT_G02_STR02_OPERATOR_RUNBOOK_2026_05_24.md)

**Policy:** Future operator execution only. **Do not run** until STR-02 approval phrase issued. STR-01 baseline **filed** (PR #64). STR-02 Resend **NOT EXECUTED**.

**Current state:** DEST-01 and STR-01 **CAPTURED**. For Resend/replay, use [STR-02 operator runbook](./ZORA_WALAT_G02_STR02_OPERATOR_RUNBOOK_2026_05_24.md) after phrase `APPROVE STR-02 SANDBOX CHECKOUT.EXPIRED RESEND ONLY`.

---

## Phase 0 — Verify approvals

| Step | Action | Pass criteria |
|------|--------|---------------|
| 0.1 | Confirm [decision record](./ZORA_WALAT_G02_APPROVAL_DECISION_RECORD_TEMPLATE_2026_05_23.md) = **APPROVED** | Signed row filed |
| 0.2 | Confirm ticket / change window active | Operator note |
| 0.3 | Confirm sandbox/test-mode only | Dashboard toggle visible in captures |
| 0.4 | Review [rollback plan](./ZORA_WALAT_G02_STAGING_REPLAY_ROLLBACK_ABORT_PLAN_2026_05_23.md) | Acknowledged |

**Stop if any fail.**

---

## Phase 1 — Confirm staging deployment Ready

| Step | Action | Evidence |
|------|--------|----------|
| 1.1 | Vercel → `zora-walat-api-staging` → Deployments | **Ready** on **`main`**, PR #55+ SHA |
| 1.2 | Re-file DEP-01 if deploy SHA changed | `VERCEL-STAGING-DEPLOYMENT-PR55-COMMIT-001.png` |

---

## Phase 2 — Create sandbox webhook destination (after approval only)

| Step | Action | Evidence |
|------|--------|----------|
| 2.1 | Stripe Sandboxes → Workbench → Webhooks → **Create event destination** | — |
| 2.2 | Endpoint: `https://zora-walat-api-staging.vercel.app/webhooks/stripe` | Exact match |
| 2.3 | Enable **`checkout.session.expired`** (minimum) | Event list visible |
| 2.4 | Complete create; **do not** use live mode | — |
| 2.5 | Capture created destination | **DEST-01** → `STRIPE-SANDBOX-WEBHOOK-DESTINATION-CREATED-001.png` |
| 2.6 | If signing secret rotated → Gate 4 procedure; Vercel staging only | Never commit secret |

**Agent must not perform Phase 2.**

---

## Phase 3 — Obtain test-mode `checkout.session.expired` event

| Step | Action | Notes |
|------|--------|-------|
| 3.1 | Create test checkout that expires **or** locate existing sandbox event | Test-mode only |
| 3.2 | Confirm event appears in Workbench → Events / deliveries | Resolves BLK-02 substrate |
| 3.3 | Record redacted event id in operator log | Not full id in git if policy requires |

---

## Phase 4 — Capture STR-01 (before replay)

| Step | Action | Evidence |
|------|--------|----------|
| 4.1 | Stripe → destination → delivery row for target event | Pre-replay state |
| 4.2 | Screenshot | `STRIPE-TEST-CHECKOUT-EXPIRED-REPLAY-BEFORE-001.png` |

---

## Phase 5 — Replay / resend (after approval only)

| Step | Action | Forbidden |
|------|--------|-----------|
| 5.1 | Dashboard **Resend** on approved test-mode event **once** | Live mode; production URL |
| 5.2 | Record UTC timestamp | — |

**Stop on non-200 or timeout — see [rollback plan](./ZORA_WALAT_G02_STAGING_REPLAY_ROLLBACK_ABORT_PLAN_2026_05_23.md).**

---

## Phase 6 — Capture STR-02 (HTTP 200)

| Step | Action | Evidence |
|------|--------|----------|
| 6.1 | Open delivery detail post-replay | HTTP **200** |
| 6.2 | Screenshot | `STRIPE-TEST-CHECKOUT-EXPIRED-REPLAY-AFTER-200-001.png` |

---

## Phase 7 — Capture Vercel lifecycle logs

| Order | Log event | Evidence file |
|-------|-----------|---------------|
| 1 | `webhook_received` | `VERCEL-STAGING-LOG-WEBHOOK-RECEIVED-001.png` |
| 2 | `signature_verified` | `VERCEL-STAGING-LOG-SIGNATURE-VERIFIED-001.png` |
| 3 | `event_persisted` | `VERCEL-STAGING-LOG-EVENT-PERSISTED-001.png` |
| 4 | `ack_returned` | `VERCEL-STAGING-LOG-ACK-RETURNED-001.png` |

Window: ±15 minutes from Phase 5 timestamp.

---

## Phase 8 — Optional duplicate replay (LOG-05)

| Step | Action | Evidence |
|------|--------|----------|
| 8.1 | Resend **same** `event.id` once | Second delivery 200 |
| 8.2 | Capture `duplicate_event_blocked` in Vercel logs | `VERCEL-STAGING-LOG-DUPLICATE-BLOCKED-001.png` |
| 8.3 | Or document **N/A** if skipped | Manifest note |

---

## Phase 9 — Update evidence verdict (conservative)

| Step | Action |
|------|--------|
| 9.1 | Update [evidence manifest](./evidence/staging-stripe-webhook-replay-proof-pr55-2026-05-23/EVIDENCE_MANIFEST.md) |
| 9.2 | Update [FINAL_CONSERVATIVE_VERDICT](./evidence/staging-stripe-webhook-replay-proof-pr55-2026-05-23/FINAL_CONSERVATIVE_VERDICT.md) |
| 9.3 | **Do not** claim fix proven unless STR-02 + LOG-01…04 correlated and reviewed |
| 9.4 | Production / real-money / pilot remain **NO-GO** until separate gates |

---

## Verdict (current)

| Item | Status |
|------|--------|
| G-02 execution dry-run | **FILED / EXECUTION NOT AUTHORIZED** |
| DEST-01 / STR-01 | **CAPTURED** (PR #63 / #64) |
| STR-02 Resend / replay | **NOT EXECUTED / APPROVAL GATED** — [STR-02 runbook](./ZORA_WALAT_G02_STR02_OPERATOR_RUNBOOK_2026_05_24.md) |
| Staging replay | **BLOCKED / INCONCLUSIVE** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |

---

*Operator runbook · STR-02 gate filed 2026-05-24 · no Resend executed*
