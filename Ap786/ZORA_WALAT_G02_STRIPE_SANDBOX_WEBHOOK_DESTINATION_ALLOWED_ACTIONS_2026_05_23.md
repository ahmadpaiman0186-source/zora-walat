# G-02 — Stripe Sandbox Webhook Destination Allowed Actions

**Date:** 2026-05-23
**Gate:** G-02 · **APPROVAL REQUIRED / NOT EXECUTED**
**Parent:** [UNBLOCK_APPROVAL](./ZORA_WALAT_G02_STAGING_WEBHOOK_DESTINATION_UNBLOCK_APPROVAL_2026_05_23.md)

---

## 1. Purpose

Define **operator-only** Stripe Dashboard actions permitted **after** explicit G-02 approval — and **Agent-forbidden** actions always.

---

## 2. Preconditions (all required)

| # | Precondition | Status |
|---|--------------|--------|
| P-01 | [Decision record](./ZORA_WALAT_G02_APPROVAL_DECISION_RECORD_TEMPLATE_2026_05_23.md) = **APPROVED** | **PENDING / NOT APPROVED** |
| P-02 | Stripe Dashboard in **sandbox / test-mode** (visible in capture) | **PENDING OPERATOR** |
| P-03 | Endpoint URL = `https://zora-walat-api-staging.vercel.app/webhooks/stripe` only | **DOCUMENTED** |
| P-04 | Ticket / change window ID | **REQUIRED** |
| P-05 | DEP-01 staging deploy **Ready** re-verified if stale | **PENDING OPERATOR** |

---

## 3. Allowed operator-only actions (after approval)

| ID | Action | Notes |
|----|--------|-------|
| OA-01 | Open Stripe **Sandboxes** → Workbench → **Webhooks** | Read-only until OA-02 approved |
| OA-02 | Complete **Create an event destination** for staging URL | Capture **DEST-01** after create |
| OA-03 | Select event types (minimum set below) | No live-mode configuration |
| OA-04 | Copy signing secret to **Vercel staging env** (operator console) | Gate 4 policy; never commit secret |
| OA-05 | Create or allow test-mode checkout to **expire** naturally | No real-money charge |
| OA-06 | Capture **STR-01** before any replay | Baseline delivery row |
| OA-07 | **Resend** one approved test-mode `checkout.session.expired` event | After STR-01; ticket scope |
| OA-08 | Capture **STR-02** (HTTP 200) and **LOG-01…LOG-04** | ±15 min window |
| OA-09 | Optional duplicate resend → **LOG-05** | Same `event.id` only |
| OA-10 | File redacted PNGs per [evidence matrix](./ZORA_WALAT_G02_STAGING_REPLAY_EVIDENCE_MATRIX_2026_05_23.md) | Ap786 only |

---

## 4. Event types to consider

| Event type | Include when | Notes |
|------------|--------------|-------|
| **`checkout.session.expired`** | **Required** | Primary G-02 replay proof target |
| `checkout.session.completed` | Optional | Parity observation only; not required for expired proof |
| `charge.refunded` | Optional | Read-only reference to prior May 2026 captures; **no new refund** |

**No live-mode** event configuration. **No production** endpoint.

---

## 5. Forbidden — Agent actions (always)

| Action | Status |
|--------|--------|
| Create Stripe webhook destination | **FORBIDDEN** |
| Click **Continue** / **Add destination** | **FORBIDDEN** |
| Replay / resend Stripe events | **FORBIDDEN** |
| Call Stripe or Vercel APIs | **FORBIDDEN** |
| Deploy staging or production | **FORBIDDEN** |
| Edit `.env` or Vercel env vars | **FORBIDDEN** |
| Rotate credentials | **FORBIDDEN** |
| Mutate DB / payment / refund / wallet / order state | **FORBIDDEN** |
| Automatic replay scripts | **FORBIDDEN** |
| Claim fix proven | **FORBIDDEN** |

---

## 6. Forbidden — operator actions (even after approval)

| Action | Status |
|--------|--------|
| Live Stripe mode | **FORBIDDEN** |
| Production endpoint URL | **FORBIDDEN** |
| Real-money checkout or refund | **FORBIDDEN** |
| Resend without ticket / STR-01 baseline | **FORBIDDEN** |
| Production deploy as part of G-02 | **FORBIDDEN** |

---

## 7. Verdict

| Item | Status |
|------|--------|
| G-02 sandbox webhook destination setup | **APPROVAL REQUIRED / NOT EXECUTED** |
| Staging replay | **BLOCKED / INCONCLUSIVE** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |

---

*Allowed actions · operator-only after approval · Agent forbidden*
