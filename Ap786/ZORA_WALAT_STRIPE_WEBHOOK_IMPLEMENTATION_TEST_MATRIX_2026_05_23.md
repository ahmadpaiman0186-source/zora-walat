# Zora-Walat — Stripe Webhook Implementation Test Matrix

**Date:** 2026-05-23
**Status:** **SPEC ONLY** — tests **NOT EXECUTED**
**Parent:** [IMPLEMENTATION_APPROVAL_GATE](./ZORA_WALAT_STRIPE_WEBHOOK_FAST_ACK_IMPLEMENTATION_APPROVAL_GATE_2026_05_23.md)
**Cross-ref:** [STAGING_REPLAY_TEST_PLAN](./ZORA_WALAT_STAGING_REPLAY_TEST_PLAN_2026_05_23.md) · [IDEMPOTENCY_HARDENING_PLAN](./ZORA_WALAT_STRIPE_WEBHOOK_IDEMPOTENCY_HARDENING_PLAN_2026_05_23.md)

---

## 1. Purpose

Define **required tests** before merge of future `feat/stripe-webhook-fast-ack-async-processing` code to staging.

**Merge blocked** until all **Critical** rows show **PASS** in CI or filed attestation.

---

## 2. Matrix status

| Item | Status |
|------|--------|
| Test matrix spec | **FILED** |
| Tests implemented | **NOT STARTED** |
| CI evidence | **PENDING** |
| Staging replay | **NOT APPROVED** |

---

## 3. Unit and integration tests (pre-merge)

| Test ID | Category | Description | Severity | Pass criteria | Status |
|---------|----------|-------------|----------|---------------|--------|
| **TM-01** | Signature | Valid Stripe signature | Critical | 200 after persist | **PENDING** |
| **TM-02** | Signature | Invalid signature | Critical | 400; no DB side effect | **PENDING** |
| **TM-03** | Payload | Malformed JSON body | Critical | 400 | **PENDING** |
| **TM-04** | Env | Missing `STRIPE_WEBHOOK_SECRET` | Critical | Fail closed; no silent accept | **PENDING** |
| **TM-05** | Idempotency | Duplicate Stripe `event.id` | Critical | 200; `duplicate_event_blocked`; single effect | **PENDING** |
| **TM-06** | Idempotency | Duplicate checkout session / order | Critical | Single terminal state | **PENDING** |
| **TM-07** | Money | No duplicate wallet credit | Critical | Balance delta 1x on retry | **PENDING** |
| **TM-08** | Money | No duplicate service / fulfill job | Critical | Job count = 1 | **PENDING** |
| **TM-09** | NPS | No-pay-no-service negative | Critical | Unpaid → fulfill blocked | **PENDING** |
| **TM-10** | Performance | Timeout regression — ack < limit | Critical | p95 mock < 5s | **PENDING** |
| **TM-11** | Async | Worker `processing_failed` handling | High | Alert event; no double apply | **PENDING** |
| **TM-12** | Retry | Stripe retry after 500 pre-ack | Critical | Single persisted row | **PENDING** |
| **TM-13** | Retry | Stripe retry after 200 ack + worker pending | Critical | Idempotent | **PENDING** |
| **TM-14** | Event type | `checkout.session.expired` path | Critical | EXPIRED; no fulfill | **PENDING** |
| **TM-15** | Event type | `checkout.session.completed` parity | Critical | No regression vs slim path | **PENDING** |
| **TM-16** | Audit | State transition audit row | High | One row per transition | **PENDING** |
| **TM-17** | Rollback | Kill switch disables worker | High | No new processing | **PENDING** |
| **TM-18** | Observability | Log sequence TM-LOG-01…09 | High | All events emitted in order | **PENDING** |

---

## 4. Observability log sequence (TM-LOG)

| Order | Event | Required in TM-18 |
|-------|-------|-------------------|
| 1 | `webhook_received` | Yes |
| 2 | `signature_verified` | Yes |
| 3 | `event_persisted` | Yes |
| 4 | `ack_returned` | Yes |
| 5 | `processing_started` | Yes |
| 6a | `processing_completed` | On success |
| 6b | `processing_failed` | On worker error |
| — | `duplicate_event_blocked` | On TM-05 |
| — | `no_pay_no_service_blocked` | On TM-09 |

Ref: [PRODUCTION_OBSERVABILITY_EVIDENCE_PLAN §3](./ZORA_WALAT_PRODUCTION_OBSERVABILITY_EVIDENCE_PLAN_2026_05_23.md).

---

## 5. Staging replay tests (post-deploy — explicit approval)

**Gate:** AP-06 + G-02 · **NOT APPROVED**

| Test ID | Description | Evidence | Status |
|---------|-------------|----------|--------|
| **SR-01** | Live test-mode `checkout.session.expired` → 200 | Stripe PNG | **PENDING** |
| **SR-02** | Vercel log sequence ±15m | PNG redacted | **PENDING** |
| **SR-03** | Order state attestation | Ap786 `.md` | **PENDING** |
| **SR-04** | 24h zero delivery failures | Dashboard PNG | **PENDING** |

Ref: [STAGING_REPLAY_TEST_PLAN §6](./ZORA_WALAT_STAGING_REPLAY_TEST_PLAN_2026_05_23.md).

---

## 6. Rollback tests

| Test ID | Description | Status |
|---------|-------------|--------|
| **RT-01** | Git revert / deploy previous SHA | **PENDING** |
| **RT-02** | Kill switch drill | **PENDING** |
| **RT-03** | Fail-closed fulfill block | **PENDING** |

Ref: [ROLLBACK_AND_ABORT_PLAN](./ZORA_WALAT_STRIPE_WEBHOOK_ROLLBACK_AND_ABORT_PLAN_2026_05_23.md).

---

## 7. Merge gate summary

| Gate | Requirement |
|------|-------------|
| **MG-01** | All Critical TM-* rows **PASS** | **NOT MET** |
| **MG-02** | `secrets:scan` clean | **PENDING** |
| **MG-03** | Allowed changeset R-01…R-05 | **PENDING** |
| **MG-04** | AP-01…AP-03 filed | **PENDING** |
| **MG-05** | Staging deploy AP-07 | **PENDING** |
| **MG-06** | SR-* after deploy | **PENDING** |

**Merge to staging:** **BLOCKED** until MG-01…MG-04.

---

## 8. Verdict

| Verdict | Value |
|---------|-------|
| Test matrix | **FILED** |
| Tests executed | **NOT STARTED** |
| Fix | **NOT EXECUTED** |
| Production / pilot | **NO-GO** |

---

*Implementation test matrix · spec only · no tests run in this commit*
