# G-02 — STR-02 Evidence Capture Matrix

**Date:** 2026-05-24 (updated)
**Gate:** G-02 · STR-02
**Folder:** [evidence/staging-stripe-webhook-replay-proof-pr55-2026-05-23/](./evidence/staging-stripe-webhook-replay-proof-pr55-2026-05-23/README.md)
**Parent:** [execution gate](./ZORA_WALAT_G02_STR02_RESEND_REPLAY_EXECUTION_GATE_2026_05_24.md) · [runbook](./ZORA_WALAT_G02_STR02_OPERATOR_RUNBOOK_2026_05_24.md)

**Policy:** STR-02 **executed once** — result **404 ERR**. LOG-01…LOG-04 **NOT CORRELATED**. VRC-01/VRC-02 no-match captures filed.

---

## 1. Prerequisite evidence (already filed)

| ID | Filename | Status | Proves |
|----|----------|--------|--------|
| **DEP-01** | `VERCEL-STAGING-DEPLOYMENT-PR55-COMMIT-001.png` | **CAPTURED / REVIEW PENDING** | Staging **Ready** on PR #55+ `main` |
| **DEST-01** | `STRIPE-SANDBOX-WEBHOOK-DESTINATION-ACTIVE-EXISTING-001.png` | **CAPTURED / REVIEW PENDING** | Active sandbox destination at staging URL |
| **STR-01** | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-EVENT-DETAIL-001.png` | **CAPTURED / PRE-REPLAY BASELINE** | Event detail before replay |
| **STR-01A** | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-FAILED-DELIVERY-002.png` | **CAPTURED / PRE-REPLAY BASELINE** | Failed delivery row |
| **STR-01B** | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-PRE-REPLAY-TIMEOUT-ATTEMPTS-003.png` | **CAPTURED / PRE-REPLAY BASELINE** | 3× Timed out (May 19, 2026) |

---

## 2. STR-02 capture matrix (executed — FAILED)

| ID | Filename | Source | When captured | Redaction | Status | Proves | Does not prove |
|----|----------|--------|---------------|-----------|--------|--------|----------------|
| **STR-02A** | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-STR02-PRE-RESEND-CONFIRMATION-001.png` | Stripe Sandboxes → STR-01 event → delivery detail | **Before** Resend | URL + event ID redacted | **CAPTURED / PRE-RESEND CONFIRMATION** | Correct event + staging endpoint pre-click | Replay success |
| **STR-02B** | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-STR02-POST-RESEND-404-002.png` | Delivery detail after **one** Resend | May 24, 2026 ~2:09 PM | Same | **EXECUTED ONCE / FAILED** | **404 ERR / Not Found** — HTTP **200 NOT ACHIEVED** | Fix proven |
| **STR-02C** | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-STR02-POST-RESEND-ATTEMPT-LIST-003.png` | Delivery attempt list | Post-Resend | Same | **CAPTURED / POST-RESEND FAILURE EVIDENCE** | 404 + prior 3× timeout | Root cause |

**Note:** Planned `…POST-RESEND-HTTP200-002.png` **not captured** — 200 not achieved. Actual artifact: `…POST-RESEND-404-002.png`.

**Approval phrase issued:** `APPROVE STR-02 SANDBOX CHECKOUT.EXPIRED RESEND ONLY` (chat).

---

## 3. Vercel log capture matrix

| ID | Filename | Log focus (search) | Status | Result |
|----|----------|-------------------|--------|--------|
| **LOG-01** | `VERCEL-STAGING-LOG-WEBHOOK-RECEIVED-001.png` | Request received | **NOT CORRELATED / NOT CAPTURED** | — |
| **LOG-02** | `VERCEL-STAGING-LOG-SIGNATURE-VERIFIED-001.png` | Signature verification | **NOT CORRELATED / NOT CAPTURED** | — |
| **LOG-03** | `VERCEL-STAGING-LOG-EVENT-PERSISTED-001.png` | Idempotency / duplicate protection | **NOT CORRELATED / NOT CAPTURED** | — |
| **LOG-04** | `VERCEL-STAGING-LOG-ACK-RETURNED-001.png` | Final handler result | **NOT CORRELATED / NOT CAPTURED** | — |
| **VRC-01** | `VERCEL-STAGING-STR02-NO-RUNTIME-LOGS-WEBHOOK-STRIPE-004.png` | Search `"/webhooks/stripe"` — last 30 min | **CAPTURED / NO MATCH** | No runtime logs found |
| **VRC-02** | `VERCEL-STAGING-STR02-NO-RUNTIME-LOGS-STRIPE-005.png` | Search `stripe` — last 30 min | **CAPTURED / NO MATCH** | No runtime logs found |

---

## 4. Correlation outcome

| Rule | Result |
|------|--------|
| STR-02 Resend executed | **YES — once** |
| HTTP 200 | **NO** — **404 ERR** |
| LOG-01…LOG-04 within ±15 min of T1 | **NOT CORRELATED / NOT CAPTURED** |
| Vercel runtime logs | **NO MATCHING LOGS FOUND** |
| Staging replay PASS | **NO** |

---

## 5. Acceptance threshold (actual outcome)

| Outcome | Artifacts filed | Verdict |
|---------|-----------------|---------|
| **Failure (actual)** | STR-02A + STR-02B (404) + STR-02C + VRC-01/02; LOG missing | **FAILED / INCONCLUSIVE** — fix **NOT YET** |
| **Required for PASS** | STR-02B HTTP **200** + LOG-01…LOG-04 correlated | **NOT MET** |

---

## 6. Verdict

| Item | Status |
|------|--------|
| STR-02A / STR-02B / STR-02C | **FILED** — STR-02B **FAILED (404)** |
| LOG-01…LOG-04 | **NOT CORRELATED / NOT CAPTURED** |
| VRC-01 / VRC-02 | **CAPTURED / NO MATCH** |
| STR-02 404 investigation | **FILED** — [root-cause pack](./ZORA_WALAT_STR02_404_ROUTING_ROOT_CAUSE_INVESTIGATION_2026_05_24.md) |
| Root cause | **NOT CONFIRMED** |
| Fix | **NOT IMPLEMENTED** |
| STR-02 execution | **EXECUTED ONCE / FAILED** |
| G-02 staging replay | **FAILED / INCONCLUSIVE** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*STR-02 evidence matrix · 404 investigation filed 2026-05-24 · root cause NOT CONFIRMED*
