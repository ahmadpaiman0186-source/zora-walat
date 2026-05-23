# Zora-Walat — Staging Stripe Webhook Replay Test Plan

**Date:** 2026-05-23
**Status:** **PLAN ONLY** — replay **NOT EXECUTED**
**Parent:** [CHECKOUT_EXPIRED_TIMEOUT_REMEDIATION_PLAN](./ZORA_WALAT_CHECKOUT_EXPIRED_TIMEOUT_REMEDIATION_PLAN_2026_05_23.md)
**Gate:** G-02 · Track H · **explicit user approval** required before any replay

---

## 1. Purpose

Define tests required to prove staging webhook reliability **after** fast ACK + idempotency implementation — without executing replay in this documentation phase.

**Forbidden now:** Stripe dashboard resend, CLI replay, synthetic POST to production, DB mutation for test setup without approval.

---

## 2. Preconditions (all required before replay)

| # | Precondition | Status |
|---|--------------|--------|
| P-01 | [Remediation plan](./ZORA_WALAT_CHECKOUT_EXPIRED_TIMEOUT_REMEDIATION_PLAN_2026_05_23.md) approved for implementation | **PENDING** |
| P-02 | Track H written approval | **NOT APPROVED** |
| P-03 | `feat/stripe-webhook-fast-ack-async-processing` merged to staging branch | **NOT STARTED** |
| P-04 | Staging deploy SHA recorded in Ap786 | **PENDING** |
| P-05 | `STRIPE_WEBHOOK_SECRET` staging verified (name only — no values in git) | **PENDING REVIEW** |
| P-06 | Observability structured logs deployed | **NOT EXECUTED** |
| P-07 | Ticket ID for replay window | **REQUIRED** |
| P-08 | Kill switch documented | **PLAN ONLY** |

---

## 3. Local and CI tests (no Stripe replay)

| Test ID | Type | Description | Pass criteria |
|---------|------|-------------|---------------|
| **UT-01** | Unit | Signature verification valid/invalid | 400 on bad sig; no DB write |
| **UT-02** | Unit | Malformed body | 400; `signature_verified=false` |
| **UT-03** | Unit | Ack timing budget mock | Persist + 200 < 5s (mocked clock) |
| **UT-04** | Unit | Idempotency duplicate `event.id` | ID-T-01 behavior |
| **UT-05** | Integration | Outbox insert + worker claim | Status transitions correct |
| **UT-06** | Regression | `checkout.session.completed` slim path parity | Order reaches expected state |
| **UT-07** | Regression | **`checkout.session.expired`** handler | EXPIRED state; no fulfill |
| **UT-08** | Regression | Timeout regression — no sync sleep in handler | Lint/static check + test |
| **UT-09** | Integration | `no_pay_no_service_blocked` path | Unpaid order → no fulfill job |
| **UT-10** | Integration | `duplicate_event_blocked` metric increment | Observable in test harness |

**Run policy:** `npm test` / server test suite — **one process at a time** per engineering rules.

---

## 4. Signature verification tests

| Case | Input | Expected |
|------|-------|----------|
| SV-01 | Valid signature, test secret | 200 after persist |
| SV-02 | Wrong secret | 400 |
| SV-03 | Tampered body | 400 |
| SV-04 | Missing `Stripe-Signature` header | 400 |
| SV-05 | Timestamp tolerance (replay attack window) | Reject stale per Stripe SDK policy |

---

## 5. Timeout regression tests

| Case | Method | Expected |
|------|--------|----------|
| TR-01 | Instrument handler; assert no blocking HTTP client calls pre-ack | Pass |
| TR-02 | Load test: N concurrent webhooks staging | p95 ack < Stripe limit |
| TR-03 | Cold start scenario (optional) | Document p95; compare to TR-02 |

**Evidence:** CI log artifact + Ap786 summary `.md` (no secrets).

---

## 6. Staging webhook replay (execution gated)

**Approval required:** Payments Owner + Engineering + ticket.

| Step | Action | Evidence artifact |
|------|--------|-------------------|
| 1 | Record staging endpoint URL (known) | Ap786 note |
| 2 | Trigger test-mode `checkout.session.expired` (Stripe test clock or natural expiry) | Stripe event type in dashboard |
| 3 | **Do not** use dashboard "Resend" on May 19 events without ticket | — |
| 4 | Capture Stripe delivery **200** | `STRIPE-WH-REPLAY-EXPIRED-200-001.png` (redacted) |
| 5 | Capture Vercel log sequence within 15 min | `VERCEL-WH-REPLAY-LOG-SEQUENCE-001.png` |
| 6 | Verify DB order/checkout state (enum only in docs) | `STAGING-REPLAY-STATE-ATTESTATION-001.md` |

### 6.1 Replay forbidden actions

| Action | Status |
|--------|--------|
| Production endpoint replay | **FORBIDDEN** |
| Live-mode events | **FORBIDDEN** |
| Resend without ticket | **FORBIDDEN** |
| Wallet credit / fulfill for test without harness | **FORBIDDEN** |

---

## 7. Stripe test-mode evidence requirements

| Artifact | Content | Redaction |
|----------|---------|-----------|
| Dashboard delivery list | `checkout.session.expired` **Succeeded** or documented expected failure | Event IDs |
| Delivery detail | HTTP 200, response time | URL bar |
| Error insight | Absent on success | — |

---

## 8. Vercel logs evidence requirements

| Log event | Must appear in order |
|-----------|---------------------|
| `webhook_received` | 1 |
| `signature_verified` | 2 |
| `event_persisted` | 3 |
| `ack_returned` | 4 |
| `processing_started` | 5 |
| `processing_completed` OR `processing_failed` | 6 |

**Window:** ±15 minutes from attempt timestamp.

---

## 9. Rollback drill evidence

| Drill ID | Action | Evidence |
|----------|--------|----------|
| RB-01 | Disable async worker flag | Flag attestation |
| RB-02 | Revert deployment | SHA before/after |
| RB-03 | Confirm Stripe deliveries fail closed or queue drains safely | Dashboard PNG |
| RB-04 | Incident checklist walkthrough | Signed checklist row |

Ref: [GATE3_INCIDENT_ROLLBACK_DRILL](./ZORA_WALAT_GATE3_INCIDENT_ROLLBACK_DRILL_EVIDENCE_CHECKLIST_2026_05_22.md).

---

## 10. Exit criteria (staging replay PASS)

| # | Criterion | Status |
|---|-----------|--------|
| E-01 | UT-01…UT-10 CI green on staging SHA | **NOT MET** |
| E-02 | ID-T-01…07 pass | **NOT MET** |
| E-03 | Staging `checkout.session.expired` delivery **200** filed | **NOT MET** |
| E-04 | Vercel log sequence filed | **NOT MET** |
| E-05 | No duplicate transaction in harness | **NOT MET** |
| E-06 | No-pay-no-service test pass | **NOT MET** |
| E-07 | Rollback drill filed | **NOT MET** |

**Overall:** Staging replay **NOT PASS** · **NOT EXECUTED**.

---

## 11. Future branch

**Branch (do not create):** `test/stripe-webhook-staging-replay-proof`

---

## 12. Verdict

| Item | Status |
|------|--------|
| Test plan | **FILED** |
| Replay execution | **NOT EXECUTED** |
| Root cause | **NOT CONFIRMED** |
| Fix | **NOT EXECUTED** |
| Production / pilot | **NO-GO** |

---

*Staging replay plan · G-02 gated · no replay in this commit*

