# G-02 — STR-02 Operator Runbook (Sandbox Resend / Replay)

**Date:** 2026-05-24
**Gate:** G-02 · STR-02 · **NOT EXECUTED**
**Parent:** [execution gate](./ZORA_WALAT_G02_STR02_RESEND_REPLAY_EXECUTION_GATE_2026_05_24.md) · [approval checklist](./ZORA_WALAT_G02_STR02_APPROVAL_CHECKLIST_2026_05_24.md) · [abort plan](./ZORA_WALAT_G02_STR02_ABORT_AND_ROLLBACK_PLAN_2026_05_24.md)

**Policy:** Future operator execution only. **Do not run** until approval phrase `APPROVE STR-02 SANDBOX CHECKOUT.EXPIRED RESEND ONLY` is issued by a human approver. **Agent must not execute any phase.**

---

## Scope lock

| Field | Value |
|-------|-------|
| Mode | Stripe **Sandboxes** / **test-mode only** |
| Event type | `checkout.session.expired` |
| Event identity | **Same event** as STR-01 baseline (May 19, 2026) |
| Destination | Existing `zora-walat-api-staging` webhook destination |
| Endpoint URL | `https://zora-walat-api-staging.vercel.app/webhooks/stripe` |
| Action | **One** dashboard **Resend** only |
| Forbidden | Live mode; production URL; send test events; second Resend without new approval |

---

## Phase 0 — Gate verification (stop on fail)

| Step | Action | Pass criteria |
|------|--------|---------------|
| 0.1 | Confirm phrase `APPROVE STR-02 SANDBOX CHECKOUT.EXPIRED RESEND ONLY` issued | Verbatim in ticket / decision record |
| 0.2 | Complete [approval checklist](./ZORA_WALAT_G02_STR02_APPROVAL_CHECKLIST_2026_05_24.md) | All required boxes checked |
| 0.3 | Confirm STR-01 baseline on `main` | PR #64 merged |
| 0.4 | Confirm DEST-01 active destination on `main` | PR #63 merged |
| 0.5 | Stripe dashboard → **Sandboxes** banner visible | Not live mode |
| 0.6 | Review [abort plan](./ZORA_WALAT_G02_STR02_ABORT_AND_ROLLBACK_PLAN_2026_05_24.md) | Acknowledged |

---

## Phase 1 — Confirm staging deployment Ready

| Step | Action | Evidence |
|------|--------|----------|
| 1.1 | Vercel → `zora-walat-api-staging` → Deployments | **Ready** on **`main`**, PR #55+ SHA |
| 1.2 | Re-file DEP-01 if deploy SHA changed | `VERCEL-STAGING-DEPLOYMENT-PR55-COMMIT-001.png` |

---

## Phase 2 — Navigate to STR-01 target event

| Step | Action | Notes |
|------|--------|-------|
| 2.1 | Stripe Sandboxes → Workbench → **Events** | Sandbox only |
| 2.2 | Open **same** `checkout.session.expired` event from STR-01 | Match STR-01 captures |
| 2.3 | Confirm failed delivery row to staging endpoint | Pre-replay state visible |
| 2.4 | Record redacted event id in operator log (not full secret in git if policy requires) | Correlation key |

---

## Phase 3 — Capture STR-02A (before Resend)

| Step | Action | Evidence |
|------|--------|----------|
| 3.1 | Frame delivery detail: event type, staging endpoint, **Resend** button visible, **not clicked** | — |
| 3.2 | Screenshot | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-STR02-PRE-RESEND-CONFIRMATION-001.png` |
| 3.3 | Record UTC timestamp **T0** (before click) | Operator log |

**Do not click Resend until STR-02A filed.**

---

## Phase 4 — Single Resend (after approval only)

| Step | Action | Forbidden |
|------|--------|-----------|
| 4.1 | Click **Resend** **once** on the approved delivery | Live mode; production URL; bulk resend |
| 4.2 | Wait for delivery result (do not navigate away prematurely) | — |
| 4.3 | Record UTC timestamp **T1** (after result) | — |

**Stop on non-200, timeout, or unexpected error — see [abort plan](./ZORA_WALAT_G02_STR02_ABORT_AND_ROLLBACK_PLAN_2026_05_24.md).**

---

## Phase 5 — Capture STR-02B (after Resend)

| Step | Action | Evidence |
|------|--------|----------|
| 5.1 | Open delivery detail showing **HTTP 200** (or latest attempt result) | Post-replay state |
| 5.2 | Screenshot | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-STR02-POST-RESEND-HTTP200-002.png` |

Non-200 → abort; do **not** claim success.

---

## Phase 6 — Capture Vercel lifecycle logs (±15 min of T1)

| Order | Search / filter focus | Evidence file | Proves |
|-------|----------------------|---------------|--------|
| **LOG-01** | Request received (`webhook_received` or equivalent) | `VERCEL-STAGING-LOG-WEBHOOK-RECEIVED-001.png` | Staging received webhook |
| **LOG-02** | Signature verification (`signature_verified` or equivalent) | `VERCEL-STAGING-LOG-SIGNATURE-VERIFIED-001.png` | Signature verified |
| **LOG-03** | Idempotency / duplicate protection (`event_persisted`, `duplicate_event_blocked`, or equivalent) | `VERCEL-STAGING-LOG-EVENT-PERSISTED-001.png` | Idempotency path visible |
| **LOG-04** | Final handler result (`ack_returned` or equivalent success path) | `VERCEL-STAGING-LOG-ACK-RETURNED-001.png` | Handler completed / ack |

**Project:** `zora-walat-api-staging` only. Redact secrets and PII.

---

## Phase 7 — Evidence registration (post-capture)

| Step | Action |
|------|--------|
| 7.1 | File PNGs under [evidence folder](./evidence/staging-stripe-webhook-replay-proof-pr55-2026-05-23/README.md) |
| 7.2 | Update [EVIDENCE_MANIFEST.md](./evidence/staging-stripe-webhook-replay-proof-pr55-2026-05-23/EVIDENCE_MANIFEST.md) |
| 7.3 | Update [FINAL_CONSERVATIVE_VERDICT.md](./evidence/staging-stripe-webhook-replay-proof-pr55-2026-05-23/FINAL_CONSERVATIVE_VERDICT.md) **only after human review** |
| 7.4 | **Do not** claim fix proven until STR-02 + LOG-01…LOG-04 correlated |

---

## Phase 8 — Abort conditions (immediate stop)

| Condition | Action |
|-----------|--------|
| Live mode detected | **Stop** — no Resend |
| Wrong endpoint URL | **Stop** — no Resend |
| Wrong event type | **Stop** — no Resend |
| Approval phrase missing | **Stop** — no Resend |
| STR-02A not captured | **Stop** — no Resend |
| HTTP non-200 after Resend | **Stop** — file failure state; see abort plan |
| Timeout after Resend | **Stop** — file failure state; no second Resend without new approval |

---

## Verdict (default — pre-execution)

| Item | Status |
|------|--------|
| STR-02 runbook | **FILED / NOT EXECUTED** |
| Resend clicked | **NO** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |

---

*STR-02 operator runbook · docs only · no Resend executed*
