# G-02 — STR-02 Approval Checklist

**Date:** 2026-05-24
**Gate:** G-02 · STR-02
**Parent:** [execution gate](./ZORA_WALAT_G02_STR02_RESEND_REPLAY_EXECUTION_GATE_2026_05_24.md) · [runbook](./ZORA_WALAT_G02_STR02_OPERATOR_RUNBOOK_2026_05_24.md)

**Policy:** Checklist for **future** operator execution. All boxes default **unchecked**. Completing this checklist in git **does not** grant approval — the explicit phrase in §4 is still required.

---

## 1. Approver identity

| Field | Value |
|-------|-------|
| Approver name | _pending_ |
| Role | _Payments owner / Engineering lead / designated approver_ |
| Date | _pending_ |
| Ticket / change reference | _pending_ |

---

## 2. Pre-approval verification (operator)

| # | Check | ☐ |
|---|-------|---|
| C-01 | `main` synced; PR #63 and PR #64 merged | ☐ |
| C-02 | STR-01 **CAPTURED / PRE-REPLAY BASELINE** on `main` | ☐ |
| C-03 | DEST-01 existing active sandbox destination filed | ☐ |
| C-04 | DEP-01 staging deployment **Ready** verified | ☐ |
| C-05 | Stripe dashboard in **Sandboxes** / test-mode (not live) | ☐ |
| C-06 | Target event = **same** `checkout.session.expired` as STR-01 | ☐ |
| C-07 | Target endpoint = `https://zora-walat-api-staging.vercel.app/webhooks/stripe` exactly | ☐ |
| C-08 | [Risk register](./ZORA_WALAT_G02_STR02_RISK_REGISTER_2026_05_24.md) reviewed | ☐ |
| C-09 | [Abort / rollback plan](./ZORA_WALAT_G02_STR02_ABORT_AND_ROLLBACK_PLAN_2026_05_24.md) reviewed | ☐ |
| C-10 | [Evidence capture matrix](./ZORA_WALAT_G02_STR02_EVIDENCE_CAPTURE_MATRIX_2026_05_24.md) reviewed | ☐ |
| C-11 | Operator log ready for UTC timestamps T0 / T1 | ☐ |
| C-12 | No production endpoint, live mode, or real-money path involved | ☐ |

---

## 3. Forbidden actions confirmed (operator attestation)

| # | Forbidden | Confirmed NOT planned | ☐ |
|---|-----------|----------------------|---|
| F-01 | Click Resend without approval phrase | ☐ |
| F-02 | Send test events | ☐ |
| F-03 | Use live mode | ☐ |
| F-04 | Use production webhook endpoint | ☐ |
| F-05 | Deploy or change Vercel env vars | ☐ |
| F-06 | Edit `.env` files | ☐ |
| F-07 | Mutate DB / payment / refund / wallet / order state | ☐ |
| F-08 | Second Resend without new approval | ☐ |
| F-09 | Claim fix proven before STR-02 + LOG review | ☐ |
| F-10 | Enable self-healing apply | ☐ |

---

## 4. Required approval phrase

Approver must issue **verbatim**:

```text
APPROVE STR-02 SANDBOX CHECKOUT.EXPIRED RESEND ONLY
```

| Field | Value |
|-------|-------|
| Phrase issued? | **NO** (default) |
| Issued by | _pending_ |
| Issued at (UTC) | _pending_ |
| Channel (ticket / chat / decision record) | _pending_ |

**“شروع کن” is NOT sufficient.**

---

## 5. Post-approval capture plan (operator — not executed yet)

| # | Capture | Filename | ☐ Planned |
|---|---------|----------|-----------|
| E-01 | Before Resend confirmation | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-STR02-PRE-RESEND-CONFIRMATION-001.png` | ☐ |
| E-02 | After Resend HTTP 200 | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-STR02-POST-RESEND-HTTP200-002.png` | ☐ |
| E-03 | LOG-01 request received | `VERCEL-STAGING-LOG-WEBHOOK-RECEIVED-001.png` | ☐ |
| E-04 | LOG-02 signature verification | `VERCEL-STAGING-LOG-SIGNATURE-VERIFIED-001.png` | ☐ |
| E-05 | LOG-03 idempotency / duplicate protection | `VERCEL-STAGING-LOG-EVENT-PERSISTED-001.png` | ☐ |
| E-06 | LOG-04 final handler result | `VERCEL-STAGING-LOG-ACK-RETURNED-001.png` | ☐ |

---

## 6. Sign-off (default — not approved)

| Role | Name | Date | STR-02 Resend approved? |
|------|------|------|-------------------------|
| Payments Owner | _pending_ | — | **NO** |
| Engineering | _pending_ | — | **NO** |
| SRE / On-call | _pending_ | — | **NO** |

---

## 7. Verdict (default)

| Item | Status |
|------|--------|
| STR-02 approval | **NOT APPROVED / NOT ISSUED** |
| STR-02 execution | **NOT EXECUTED** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*STR-02 approval checklist · all boxes default unchecked · no execution authorized*
