# G-02 — STR-02 Evidence Capture Matrix

**Date:** 2026-05-24
**Gate:** G-02 · STR-02
**Folder:** [evidence/staging-stripe-webhook-replay-proof-pr55-2026-05-23/](./evidence/staging-stripe-webhook-replay-proof-pr55-2026-05-23/README.md)
**Parent:** [execution gate](./ZORA_WALAT_G02_STR02_RESEND_REPLAY_EXECUTION_GATE_2026_05_24.md) · [runbook](./ZORA_WALAT_G02_STR02_OPERATOR_RUNBOOK_2026_05_24.md)

**Policy:** Capture specifications for **future** STR-02 execution. **No fabricated PNGs.** All STR-02 / LOG captures default **NOT CAPTURED** until operator files post-Resend.

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

## 2. STR-02 capture matrix (pending execution)

| ID | Filename | Source | When to capture | Redaction | Status | Proves | Does not prove |
|----|----------|--------|-----------------|-----------|--------|--------|----------------|
| **STR-02A** | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-STR02-PRE-RESEND-CONFIRMATION-001.png` | Stripe Sandboxes → Events → STR-01 event → delivery detail | **Before** Resend click; **Resend visible, not clicked** | URL bar; event ID → black bar / `REDACTED_EVT_*` | **NOT CAPTURED** | Operator confirmed correct event + endpoint pre-click | Replay success |
| **STR-02B** | `STRIPE-SANDBOX-CHECKOUT-EXPIRED-STR02-POST-RESEND-HTTP200-002.png` | Same — delivery detail after Resend | **After** single Resend; HTTP **200** visible | Same as STR-02A | **NOT CAPTURED** | Post-replay delivery **200** to staging | Fix proven; prod health |

**Legacy alias:** STR-02B may also be referenced as `STRIPE-TEST-CHECKOUT-EXPIRED-REPLAY-AFTER-200-001.png` in older checklists — **prefer STR-02B filename** for new captures.

---

## 3. Vercel log capture matrix (pending execution)

Window: **±15 minutes** from Resend timestamp **T1**.

| ID | Filename | Log focus (search) | Operator description | Status | Proves | Does not prove |
|----|----------|-------------------|----------------------|--------|--------|----------------|
| **LOG-01** | `VERCEL-STAGING-LOG-WEBHOOK-RECEIVED-001.png` | `webhook_received` or request-received equivalent | **Request received** | **NOT CAPTURED** | Staging received webhook | Handler success |
| **LOG-02** | `VERCEL-STAGING-LOG-SIGNATURE-VERIFIED-001.png` | `signature_verified` or equivalent | **Signature verification** | **NOT CAPTURED** | Signature verified | Business logic correct |
| **LOG-03** | `VERCEL-STAGING-LOG-EVENT-PERSISTED-001.png` | `event_persisted`, `duplicate_event_blocked`, or idempotency markers | **Idempotency / duplicate protection** | **NOT CAPTURED** | Persist or duplicate-block path visible | No duplicate risk in prod |
| **LOG-04** | `VERCEL-STAGING-LOG-ACK-RETURNED-001.png` | `ack_returned` or final success path | **Final handler result** | **NOT CAPTURED** | Handler completed / ack returned | End-to-end money path |

**Project:** `zora-walat-api-staging` only. **No** production logs.

---

## 4. Correlation requirements

| Rule | Detail |
|------|--------|
| Time | LOG-01…LOG-04 must fall within ±15 min of STR-02B Resend (T1) |
| Event | Same `checkout.session.expired` as STR-01 |
| Endpoint | `https://zora-walat-api-staging.vercel.app/webhooks/stripe` |
| Mode | Sandbox / test-mode only |
| Review | Human reviewer must correlate STR-02B timestamp with log window before any PASS |

---

## 5. Acceptance threshold

| Outcome | Minimum artifacts | Verdict |
|---------|-------------------|---------|
| **Sufficient for staging replay review** | STR-02A + STR-02B (HTTP 200) + LOG-01…LOG-04 correlated | Review **PENDING** — not auto PASS |
| **Insufficient** | STR-02B only | **INCONCLUSIVE** |
| **Insufficient** | STR-02B 200 but missing LOG-01…LOG-04 | **INCONCLUSIVE** |
| **Failure** | Non-200 or timeout after Resend | **FAIL / INCONCLUSIVE** — fix **NOT YET** |

See also [evidence acceptance criteria](./ZORA_WALAT_G02_EVIDENCE_ACCEPTANCE_CRITERIA_2026_05_23.md).

---

## 6. Dependency chain

```text
STR-01 (filed, PR #64)
    → APPROVE STR-02 phrase issued
        → STR-02A (pre-resend confirmation)
            → Single Resend
                → STR-02B (HTTP 200)
                    → LOG-01 → LOG-02 → LOG-03 → LOG-04
                        → manifest + conservative verdict update (human review)
```

---

## 7. Verdict (default)

| Item | Status |
|------|--------|
| STR-02A / STR-02B | **NOT CAPTURED** |
| LOG-01…LOG-04 | **NOT CAPTURED** |
| STR-02 execution | **NOT EXECUTED** |
| Fix proven | **NOT YET** |
| Production / real-money / pilot | **NO-GO** |
| Self-healing apply | **GATED / NOT ENABLED** |

---

*STR-02 evidence capture matrix · no fabricated captures · Resend not executed*
